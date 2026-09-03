/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Módulo de Contabilidad, Tributación & SUNAT (PCGE 2019 Modificado)
 * Especializado en la normativa tributaria y contable de Perú
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext.tsx';
import { 
  Calculator, FileText, Download, DollarSign, Building2, 
  ShieldCheck, AlertTriangle, CheckCircle2, BookOpen, Layers, 
  TrendingUp, Receipt, Search, Plus, Trash2, Printer, Eye,
  ArrowRight, ShieldAlert, Sparkles, Scale, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DEFAULT_FISCAL_CONFIG,
  calculateTaxBreakdown,
  checkBancarizacion,
  checkDetraccion,
  numberToSpanishWords,
  generateSingleSaleAccountingEntry,
  generateDailyConsolidatedAccountingEntry,
  generatePurchaseAccountingEntry,
  generateSunatPleVentasTxt
} from '../utils/accountingUtils';
import { PurchaseRecord, FiscalConfig, AccountingEntry } from '../types';
import * as XLSX from 'xlsx';

export const AdminContabilidadSunatView: React.FC = () => {
  const { orders, customers, selectedDate, identity } = useApp();

  // Active Sub-Tab within Accounting Module
  const [activeTab, setActiveTab] = useState<'ASIENTO_INTERACTIVO' | 'ASIENTO_DIARIO' | 'REGISTRO_VENTAS' | 'REGISTRO_COMPRAS' | 'LIQUIDACION_SUNAT' | 'CONFIG_FISCAL'>('ASIENTO_DIARIO');

  // Fiscal Configuration State (Local & Persistent)
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig>(() => {
    const saved = localStorage.getItem('sabor_fiscal_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      ...DEFAULT_FISCAL_CONFIG,
      razonSocial: identity?.nombre ? `${identity.nombre.toUpperCase()} S.A.C.` : DEFAULT_FISCAL_CONFIG.razonSocial,
      nombreComercial: identity?.nombre || DEFAULT_FISCAL_CONFIG.nombreComercial
    };
  });

  const saveFiscalConfig = (updated: FiscalConfig) => {
    setFiscalConfig(updated);
    localStorage.setItem('sabor_fiscal_config', JSON.stringify(updated));
  };

  // State for Purchase / Expense Records
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    const saved = localStorage.getItem('sabor_purchases_records');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Seed standard base restaurant expenses
    return [
      {
        id: 'c1',
        fecha: selectedDate,
        proveedor: 'DISTRIBUIDORA DE CARNES APURIMAC S.A.C.',
        rucProveedor: '20548912456',
        tipoComprobante: 'FACTURA',
        serieNumero: 'F001-0004521',
        baseImponible: 350.00,
        igv: 63.00,
        total: 413.00,
        categoria: 'INSUMOS_ALIMENTOS',
        metodoPago: 'EFECTIVO',
        timestamp: Date.now() - 3600000
      },
      {
        id: 'c2',
        fecha: selectedDate,
        proveedor: 'EMPRESA MUNICIPAL DE AGUA POTABLE EMUSAP',
        rucProveedor: '20147852369',
        tipoComprobante: 'FACTURA',
        serieNumero: 'F003-0012890',
        baseImponible: 120.00,
        igv: 21.60,
        total: 141.60,
        categoria: 'SERVICIOS_BASICOS',
        metodoPago: 'TRANSFERENCIA',
        timestamp: Date.now() - 7200000
      }
    ];
  });

  const savePurchases = (newPurchases: PurchaseRecord[]) => {
    setPurchases(newPurchases);
    localStorage.setItem('sabor_purchases_records', JSON.stringify(newPurchases));
  };

  // New Purchase Form Modal State
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    proveedor: '',
    rucProveedor: '',
    tipoComprobante: 'FACTURA' as const,
    serieNumero: '',
    total: '',
    categoria: 'INSUMOS_ALIMENTOS' as PurchaseRecord['categoria'],
    metodoPago: 'EFECTIVO' as PurchaseRecord['metodoPago'],
    observaciones: ''
  });

  // Interactive Live Accounting Calculator State
  const [interactiveMode, setInteractiveMode] = useState<'VENTA' | 'COMPRA' | 'GASTO_SERVICIO' | 'COBRANZA'>('VENTA');
  const [interactiveAmount, setInteractiveAmount] = useState<string>('100.00');
  const [interactiveDescription, setInteractiveDescription] = useState<string>('Venta de menús y bebidas del día');
  const [interactiveIncludeIgv, setInteractiveIncludeIgv] = useState<boolean>(true);
  const [interactivePaymentMethod, setInteractivePaymentMethod] = useState<'EFECTIVO' | 'YAPE' | 'CREDITO'>('EFECTIVO');
  const [interactiveCategory, setInteractiveCategory] = useState<string>('INSUMOS_ALIMENTOS');

  // Preview Comprobante Modal State
  const [previewOrder, setPreviewOrder] = useState<typeof orders[0] | null>(null);

  // Filter daily orders for selected date
  const dailyOrders = useMemo(() => {
    return orders.filter(o => o.fecha === selectedDate && o.estado !== 'CANCELADO');
  }, [orders, selectedDate]);

  // Consolidate daily sales accounting entry
  const dailyConsolidated = useMemo(() => {
    return generateDailyConsolidatedAccountingEntry(dailyOrders, selectedDate);
  }, [dailyOrders, selectedDate]);

  // Tax Settlement Calculation (Liquidación IGV - Renta Mensual / Diaria)
  const taxSettlement = useMemo(() => {
    const totalVentasGravadas = dailyOrders.reduce((acc, o) => acc + o.total, 0);
    const ventasBreakdown = calculateTaxBreakdown(totalVentasGravadas, fiscalConfig.tasaIgv);

    const dailyPurchases = purchases.filter(p => p.fecha === selectedDate);
    const totalCompras = dailyPurchases.reduce((acc, p) => acc + p.total, 0);
    const comprasBaseImponible = dailyPurchases.reduce((acc, p) => acc + p.baseImponible, 0);
    const comprasIgvCreditoFiscal = dailyPurchases.reduce((acc, p) => acc + p.igv, 0);

    // Débito Fiscal - Crédito Fiscal
    const igvPorPagar = Math.max(0, ventasBreakdown.igv - comprasIgvCreditoFiscal);
    const saldoAFavor = Math.max(0, comprasIgvCreditoFiscal - ventasBreakdown.igv);

    // Pago a cuenta del Impuesto a la Renta (1.0% RMT o 1.5% General)
    const tasaRenta = fiscalConfig.tasaRentaMensual || 0.01;
    const pagoCuentaRenta = Number((ventasBreakdown.baseImponible * tasaRenta).toFixed(2));

    const totalDeudaTributaria = igvPorPagar + pagoCuentaRenta;

    return {
      ventasTotal: totalVentasGravadas,
      ventasBase: ventasBreakdown.baseImponible,
      ventasIgvDebito: ventasBreakdown.igv,
      comprasTotal: totalCompras,
      comprasBase: comprasBaseImponible,
      comprasIgvCredito: comprasIgvCreditoFiscal,
      igvPorPagar,
      saldoAFavor,
      tasaRenta,
      pagoCuentaRenta,
      totalDeudaTributaria
    };
  }, [dailyOrders, purchases, selectedDate, fiscalConfig]);

  // Generate Interactive Live Accounting Entry based on user inputs
  const liveAccountingEntry = useMemo((): { entry: AccountingEntry; summary: any; alerts: string[] } => {
    const rawTotal = parseFloat(interactiveAmount) || 0;
    const breakdown = interactiveIncludeIgv 
      ? calculateTaxBreakdown(rawTotal, 0.18)
      : { baseImponible: rawTotal, igv: Number((rawTotal * 0.18).toFixed(2)), total: Number((rawTotal * 1.18).toFixed(2)), tasaIgv: 0.18 };

    const alerts: string[] = [];

    // Check Bancarización
    const bancCheck = checkBancarizacion(breakdown.total);
    if (bancCheck.obligatoria) {
      alerts.push(bancCheck.mensaje);
    }

    if (interactiveMode === 'VENTA') {
      const entry: AccountingEntry = {
        id: 'ASIENTO-LIVE-VTA',
        fecha: selectedDate,
        glosa: `${interactiveDescription} (Base: S/ ${breakdown.baseImponible.toFixed(2)} + IGV: S/ ${breakdown.igv.toFixed(2)})`,
        libroSugerido: 'REGISTRO_VENTAS',
        filas: [
          {
            cuenta: '1212',
            denominacion: 'Facturas, boletas y otros comprobantes por cobrar - Emitidas en cartera',
            debe: breakdown.total,
            haber: 0.00
          },
          {
            cuenta: '40111',
            denominacion: 'Tributos por pagar - IGV Cuenta Propia (18%)',
            debe: 0.00,
            haber: breakdown.igv
          },
          {
            cuenta: '70121',
            denominacion: 'Venta de mercaderías - Platos preparados y bebidas de cocina',
            debe: 0.00,
            haber: breakdown.baseImponible
          }
        ],
        totalDebe: breakdown.total,
        totalHaber: breakdown.total,
        tipoOperacion: 'VENTA',
        timestamp: Date.now()
      };
      return { entry, summary: breakdown, alerts };
    }

    if (interactiveMode === 'COMPRA' || interactiveMode === 'GASTO_SERVICIO') {
      // Check Detracciones
      const detrCheck = checkDetraccion(interactiveCategory, breakdown.total);
      if (detrCheck.aplica && detrCheck.advertencia) {
        alerts.push(detrCheck.advertencia);
      }

      let cuentaGasto = '6011';
      let nomGasto = 'Mercaderías / Insumos de Alimentos y Carnes';
      if (interactiveCategory === 'SERVICIOS_BASICOS') {
        cuentaGasto = '6361';
        nomGasto = 'Servicios prestados por terceros - Luz, Agua y Gas';
      } else if (interactiveCategory === 'ALQUILER') {
        cuentaGasto = '6351';
        nomGasto = 'Servicios prestados por terceros - Alquiler del Local';
      } else if (interactiveCategory === 'TRANSPORTE') {
        cuentaGasto = '6311';
        nomGasto = 'Transporte y fletes de mercadería';
      } else if (interactiveCategory === 'MANTENIMIENTO') {
        cuentaGasto = '6321';
        nomGasto = 'Mantenimiento y reparaciones';
      }

      const entry: AccountingEntry = {
        id: 'ASIENTO-LIVE-COMPRA',
        fecha: selectedDate,
        glosa: `${interactiveDescription} - Sustentado con Comprobante de Pago`,
        libroSugerido: 'REGISTRO_COMPRAS',
        filas: [
          {
            cuenta: cuentaGasto,
            denominacion: nomGasto,
            debe: breakdown.baseImponible,
            haber: 0.00
          },
          {
            cuenta: '40111',
            denominacion: 'Tributos por pagar - IGV Crédito Fiscal (18%)',
            debe: breakdown.igv,
            haber: 0.00
          },
          {
            cuenta: '4212',
            denominacion: 'Cuentas por pagar comerciales - Emitidas en cartera',
            debe: 0.00,
            haber: breakdown.total
          }
        ],
        totalDebe: breakdown.total,
        totalHaber: breakdown.total,
        tipoOperacion: 'COMPRA',
        timestamp: Date.now()
      };
      return { entry, summary: breakdown, alerts };
    }

    // COBRANZA / INGRESO A CAJA
    const cuentaDestino = interactivePaymentMethod === 'EFECTIVO' ? '1011' : '1041';
    const nomDestino = interactivePaymentMethod === 'EFECTIVO' ? 'Caja - Efectivo Moneda Nacional' : 'Billeteras Digitales / Cuentas Corrientes (Yape / Plin)';

    const entry: AccountingEntry = {
      id: 'ASIENTO-LIVE-COB',
      fecha: selectedDate,
      glosa: `Cobranza en ${interactivePaymentMethod} por concepto de: ${interactiveDescription}`,
      libroSugerido: 'LIBRO_CAJA_BANCOS',
      filas: [
        {
          cuenta: cuentaDestino,
          denominacion: nomDestino,
          debe: breakdown.total,
          haber: 0.00
        },
        {
          cuenta: '1212',
          denominacion: 'Facturas, boletas y otros comprobantes por cobrar - Cancelación',
          debe: 0.00,
          haber: breakdown.total
        }
      ],
      totalDebe: breakdown.total,
      totalHaber: breakdown.total,
      tipoOperacion: 'COBRANZA',
      timestamp: Date.now()
    };
    return { entry, summary: breakdown, alerts };
  }, [interactiveMode, interactiveAmount, interactiveDescription, interactiveIncludeIgv, interactivePaymentMethod, interactiveCategory, selectedDate]);

  // Export Registro de Ventas to Excel
  const handleExportSalesExcel = () => {
    const rows = dailyOrders.map((order, idx) => {
      const breakdown = calculateTaxBreakdown(order.total, 0.18);
      const shortId = order.id.split('-').pop() || '1';
      return {
        'Correlativo': (idx + 1).toString().padStart(4, '0'),
        'Fecha Emisión': order.fecha,
        'Tipo Comprobante': '03 - BOLETA DE VENTA',
        'Serie': fiscalConfig.serieBoleta,
        'Número': shortId.padStart(8, '0'),
        'Cliente': order.cliente.toUpperCase(),
        'Doc. Identidad': 'DNI / S.D.',
        'Base Imponible (S/)': breakdown.baseImponible,
        'IGV 18% (S/)': breakdown.igv,
        'Importe Total (S/)': order.total,
        'Estado': order.estado,
        'Método Pago': order.metodoPago || 'MIXTO / EFECTIVO'
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Registro_Ventas_14.1');
    XLSX.writeFile(wb, `Registro_Ventas_SUNAT_${selectedDate.replace(/\//g, '-')}.xlsx`);
  };

  // Export PLE 14.1 TXT File for SUNAT
  const handleDownloadPleTxt = () => {
    const [d, m, y] = selectedDate.split('/');
    const periodo = `${y}${m.padStart(2, '0')}00`;
    const { filename, content } = generateSunatPleVentasTxt(dailyOrders, fiscalConfig, periodo);
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Add Purchase Handler
  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseFloat(purchaseForm.total) || 0;
    if (totalNum <= 0 || !purchaseForm.proveedor.trim()) {
      alert('Por favor ingresa un proveedor y un monto válido.');
      return;
    }

    const breakdown = calculateTaxBreakdown(totalNum, 0.18);
    const detr = checkDetraccion(purchaseForm.categoria, totalNum);

    const newPurchase: PurchaseRecord = {
      id: Math.random().toString(36).substr(2, 9),
      fecha: selectedDate,
      proveedor: purchaseForm.proveedor.trim().toUpperCase(),
      rucProveedor: purchaseForm.rucProveedor.trim() || '20000000001',
      tipoComprobante: purchaseForm.tipoComprobante,
      serieNumero: purchaseForm.serieNumero.trim() || 'F001-0001',
      baseImponible: breakdown.baseImponible,
      igv: breakdown.igv,
      total: totalNum,
      categoria: purchaseForm.categoria,
      metodoPago: purchaseForm.metodoPago,
      detraccionAplica: detr.aplica,
      tasaDetraccion: detr.tasa,
      montoDetraccion: detr.monto,
      bancarizado: totalNum >= 2000,
      observaciones: purchaseForm.observaciones.trim(),
      timestamp: Date.now()
    };

    const updated = [newPurchase, ...purchases];
    savePurchases(updated);
    setShowPurchaseModal(false);
    setPurchaseForm({
      proveedor: '',
      rucProveedor: '',
      tipoComprobante: 'FACTURA',
      serieNumero: '',
      total: '',
      categoria: 'INSUMOS_ALIMENTOS',
      metodoPago: 'EFECTIVO',
      observaciones: ''
    });
  };

  const handleDeletePurchase = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este registro de compra?')) {
      const updated = purchases.filter(p => p.id !== id);
      savePurchases(updated);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-7xl mx-auto pb-16">
      
      {/* Header Banner - Sistema Contable & Tributario SUNAT */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-brand-400" /> PCGE 2019 • SUNAT
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Régimen: {fiscalConfig.regimenTributario === 'MYPE_TRIBUTARIO' ? 'MYPE Tributario (RMT)' : 'Régimen General'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white uppercase">
              Contabilidad & Tributación SUNAT
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              Generador automático de asientos en <strong className="text-white">Partida Doble</strong>, control de <strong className="text-white">Débito y Crédito Fiscal IGV 18%</strong>, exportación a Libros Electrónicos <strong className="text-white">PLE 14.1 / 8.1</strong> y liquidación tributaria.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ventas Gravadas</p>
              <p className="text-base md:text-lg font-display font-black text-white mt-0.5">S/ {taxSettlement.ventasTotal.toFixed(2)}</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">IGV Débito (18%)</p>
              <p className="text-base md:text-lg font-display font-black text-emerald-300 mt-0.5">S/ {taxSettlement.ventasIgvDebito.toFixed(2)}</p>
            </div>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-[8px] font-black text-brand-300 uppercase tracking-widest">IGV a Pagar</p>
              <p className="text-base md:text-lg font-display font-black text-brand-200 mt-0.5">S/ {taxSettlement.igvPorPagar.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-6 mt-6 border-t border-white/10">
          {[
            { id: 'ASIENTO_DIARIO', label: 'Asiento Diario de Ventas', icon: Layers },
            { id: 'ASIENTO_INTERACTIVO', label: 'Asistente Contable en Vivo', icon: Calculator },
            { id: 'REGISTRO_VENTAS', label: 'Registro de Ventas (PLE 14.1)', icon: FileText },
            { id: 'REGISTRO_COMPRAS', label: 'Registro de Compras (PLE 8.1)', icon: Receipt },
            { id: 'LIQUIDACION_SUNAT', label: 'Liquidación IGV - Renta', icon: TrendingUp },
            { id: 'CONFIG_FISCAL', label: 'Datos Fiscales & RUC', icon: Building2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ASIENTO DIARIO AUTOMÁTICO DE VENTAS Y COBRANZA     */}
      {/* ========================================================= */}
      {activeTab === 'ASIENTO_DIARIO' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Asiento Contable Consolidado del Día ({selectedDate})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generado automáticamente a partir de {dailyOrders.length} pedidos pagados bajo el Plan Contable General Empresarial (PCGE 2019).
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportSalesExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Exportar Excel
              </button>
              <button
                onClick={handleDownloadPleTxt}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-brand-400" /> PLE 14.1 (TXT)
              </button>
            </div>
          </div>

          {/* Asiento 1: Provisión de Ventas */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 rounded-md text-[8.5px] font-black uppercase tracking-wider">
                  Asiento 01 • Libro Diario / Registro de Ventas
                </span>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mt-1.5">
                  Reconocimiento de Ingresos por Ventas de Cocina y Bebidas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-0.5">
                  Glosa: "{dailyConsolidated.asientoVentas.glosa}"
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Ventas</span>
                <span className="text-lg font-display font-black text-slate-900 dark:text-white">
                  S/ {dailyConsolidated.asientoVentas.totalDebe.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Table PCGE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-4 text-center w-24">Cuenta PCGE</th>
                    <th className="py-2.5 px-4">Denominación Oficial</th>
                    <th className="py-2.5 px-4 text-right w-36">Debe (S/)</th>
                    <th className="py-2.5 px-4 text-right w-36">Haber (S/)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {dailyConsolidated.asientoVentas.filas.map((fila, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-black text-brand-700 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/30">
                        {fila.cuenta}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                        {fila.denominacion}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {fila.debe > 0 ? fila.debe.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {fila.haber > 0 ? fila.haber.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                  {/* Partida Doble Totales */}
                  <tr className="bg-slate-900 dark:bg-slate-950 text-white font-black text-xs">
                    <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-[10px] text-slate-300 dark:text-slate-400">
                      Totales Balanceados (Partida Doble):
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      S/ {dailyConsolidated.asientoVentas.totalDebe.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      S/ {dailyConsolidated.asientoVentas.totalHaber.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Asiento 2: Cobranza e Ingreso a Caja y Billeteras */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[8.5px] font-black uppercase tracking-wider">
                  Asiento 02 • Libro Caja y Bancos
                </span>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mt-1.5">
                  Ingreso de Fondos por Cobranzas del Día (Efectivo & Billeteras Digitales)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-0.5">
                  Glosa: "{dailyConsolidated.asientoCobranza.glosa}"
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Cobrado</span>
                <span className="text-lg font-display font-black text-emerald-700 dark:text-emerald-400">
                  S/ {dailyConsolidated.asientoCobranza.totalDebe.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Table PCGE Cobranza */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-4 text-center w-24">Cuenta PCGE</th>
                    <th className="py-2.5 px-4">Denominación Oficial</th>
                    <th className="py-2.5 px-4 text-right w-36">Debe (S/)</th>
                    <th className="py-2.5 px-4 text-right w-36">Haber (S/)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                  {dailyConsolidated.asientoCobranza.filas.map((fila, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/30">
                        {fila.cuenta}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                        {fila.denominacion}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {fila.debe > 0 ? fila.debe.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {fila.haber > 0 ? fila.haber.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                  {/* Partida Doble Totales */}
                  <tr className="bg-slate-900 dark:bg-slate-950 text-white font-black text-xs">
                    <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-[10px] text-slate-300 dark:text-slate-400">
                      Totales Balanceados (Partida Doble):
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      S/ {dailyConsolidated.asientoCobranza.totalDebe.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      S/ {dailyConsolidated.asientoCobranza.totalHaber.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ASISTENTE CONTABLE EN VIVO (SIMULADOR PCGE 2019)   */}
      {/* ========================================================= */}
      {activeTab === 'ASIENTO_INTERACTIVO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Convertidor Contable SUNAT</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Ingresa una transacción para procesar</p>
              </div>
            </div>

            {/* Tipo de Operación */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo de Transacción</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'VENTA', label: 'Venta de Alimentos' },
                  { id: 'COMPRA', label: 'Compra Insumos' },
                  { id: 'GASTO_SERVICIO', label: 'Gasto / Servicios' },
                  { id: 'COBRANZA', label: 'Cobranza / Caja' }
                ].map(op => (
                  <button
                    key={op.id}
                    onClick={() => setInteractiveMode(op.id as any)}
                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      interactiveMode === op.id
                        ? 'bg-slate-900 dark:bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto & Toggle IGV */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monto (Soles)</label>
                <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interactiveIncludeIgv}
                    onChange={(e) => setInteractiveIncludeIgv(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Incluye IGV (18%)</span>
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 dark:text-slate-500 text-sm">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={interactiveAmount}
                  onChange={(e) => setInteractiveAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-8 pr-3 font-mono font-black text-base outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Categoría if Compra/Gasto */}
            {(interactiveMode === 'COMPRA' || interactiveMode === 'GASTO_SERVICIO') && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categoría del Gasto / Detracción</label>
                <select
                  value={interactiveCategory}
                  onChange={(e) => setInteractiveCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold outline-none focus:border-brand-500 text-slate-800 dark:text-white cursor-pointer"
                >
                  <option value="INSUMOS_ALIMENTOS">Carnes, Verduras e Insumos (Cuenta 6011)</option>
                  <option value="SERVICIOS_BASICOS">Servicios de Luz, Agua y Gas (Cuenta 6361)</option>
                  <option value="ALQUILER">Alquiler de Local (Cuenta 6351 - SPOT 10%)</option>
                  <option value="TRANSPORTE">Transporte / Flete de Mercadería (Cuenta 6311 - SPOT 4%)</option>
                  <option value="MANTENIMIENTO">Mantenimiento y Reparación (Cuenta 6321 - SPOT 12%)</option>
                </select>
              </div>
            )}

            {/* Método de Cobranza if Cobro */}
            {interactiveMode === 'COBRANZA' && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Medio de Pago Destino</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInteractivePaymentMethod('EFECTIVO')}
                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      interactivePaymentMethod === 'EFECTIVO' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Caja Efectivo (1011)
                  </button>
                  <button
                    onClick={() => setInteractivePaymentMethod('YAPE')}
                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      interactivePaymentMethod === 'YAPE' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Billetera Yape/Plin (1041)
                  </button>
                </div>
              </div>
            )}

            {/* Glosa / Descripción */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Glosa / Concepto Contable</label>
              <input
                type="text"
                value={interactiveDescription}
                onChange={(e) => setInteractiveDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold outline-none focus:border-brand-500 text-slate-800 dark:text-white"
                placeholder="Descripción de la operación..."
              />
            </div>
          </div>

          {/* Right Column: Output Result (Asiento, Resumen Tributario, Alertas) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Alertas Tributarias (Detracción / Bancarización) */}
            {liveAccountingEntry.alerts.length > 0 && (
              <div className="space-y-2">
                {liveAccountingEntry.alerts.map((al, idx) => (
                  <div key={idx} className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 font-semibold flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{al}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Asiento Contable Generado */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 rounded-md text-[8px] font-black uppercase tracking-wider">
                    Sugerencia: {liveAccountingEntry.entry.libroSugerido.replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mt-1">
                    Asiento Contable (PCGE 2019)
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Partida Doble</span>
                  <span className="text-base font-display font-black text-slate-900 dark:text-white">
                    S/ {liveAccountingEntry.entry.totalDebe.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 px-3 text-center w-20">Cuenta</th>
                      <th className="py-2 px-3">Denominación</th>
                      <th className="py-2 px-3 text-right w-28">Debe (S/)</th>
                      <th className="py-2 px-3 text-right w-28">Haber (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                    {liveAccountingEntry.entry.filas.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-center font-mono font-black text-brand-700 dark:text-brand-400 bg-brand-50/20 dark:bg-brand-950/20">
                          {f.cuenta}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 text-[11.5px]">
                          {f.denominacion}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {f.debe > 0 ? f.debe.toFixed(2) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {f.haber > 0 ? f.haber.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 dark:bg-slate-950 text-white font-black text-xs">
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-[9px] text-slate-300 dark:text-slate-400">
                        Partida Doble (Debe = Haber):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        S/ {liveAccountingEntry.entry.totalDebe.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        S/ {liveAccountingEntry.entry.totalHaber.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Resumen Tributario Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2 mt-4">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resumen Tributario (SUNAT)</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase block">Base Imponible</span>
                    <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">S/ {liveAccountingEntry.summary.baseImponible.toFixed(2)}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase block">IGV (18%)</span>
                    <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">S/ {liveAccountingEntry.summary.igv.toFixed(2)}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase block">Total Facturado</span>
                    <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">S/ {liveAccountingEntry.summary.total.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <strong>SON:</strong> {numberToSpanishWords(liveAccountingEntry.summary.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: REGISTRO DE VENTAS ELECTRÓNICO (PLE 14.1 SUNAT)    */}
      {/* ========================================================= */}
      {activeTab === 'REGISTRO_VENTAS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Registro de Ventas e Ingresos Electrónico (PLE 14.1)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Libro oficial SUNAT con correlativos, base gravada 18%, IGV y comprobantes emitidos.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportSalesExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Descargar Excel
              </button>
              <button
                onClick={handleDownloadPleTxt}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-brand-400" /> Generar TXT SUNAT PLE
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 text-center">N° CUO</th>
                  <th className="py-3 px-4 text-center">Fecha</th>
                  <th className="py-3 px-4">Comprobante</th>
                  <th className="py-3 px-4">Cliente / Razón Social</th>
                  <th className="py-3 px-4 text-right">Base Imponible</th>
                  <th className="py-3 px-4 text-right">IGV (18%)</th>
                  <th className="py-3 px-4 text-right">Total (S/)</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {dailyOrders.map((order, idx) => {
                  const breakdown = calculateTaxBreakdown(order.total, 0.18);
                  const shortId = order.id.split('-').pop() || '1';
                  const compNum = `${fiscalConfig.serieBoleta}-${shortId.padStart(6, '0')}`;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400 text-[11px]">
                        {(idx + 1).toString().padStart(4, '0')}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {order.fecha}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/80 px-2 py-0.5 rounded-md border border-brand-100 dark:border-brand-800">
                          {compNum}
                        </span>
                      </td>
                      <td className="py-3 px-4 uppercase text-slate-800 dark:text-slate-200 font-bold truncate max-w-[180px]">
                        {order.cliente}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {breakdown.baseImponible.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-brand-600 dark:text-brand-400 font-bold">
                        {breakdown.igv.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white font-black">
                        {order.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {order.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setPreviewOrder(order)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/80 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="Ver Boleta Electrónica"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {dailyOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">
                      No hay órdenes registradas para la fecha seleccionada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: REGISTRO DE COMPRAS Y GASTOS (PLE 8.1)             */}
      {/* ========================================================= */}
      {activeTab === 'REGISTRO_COMPRAS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Registro de Compras & Crédito Fiscal (PLE 8.1)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Facturas de insumos (carnes, abarrotes, servicios, fletes) con cálculo de Crédito Fiscal IGV.
              </p>
            </div>

            <button
              onClick={() => setShowPurchaseModal(true)}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Registrar Compra / Gasto
            </button>
          </div>

          {/* Table of Purchases */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Proveedor & RUC</th>
                  <th className="py-3 px-4">Comprobante</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Base Imponible</th>
                  <th className="py-3 px-4 text-right">IGV Crédito</th>
                  <th className="py-3 px-4 text-right">Total (S/)</th>
                  <th className="py-3 px-4 text-center">Alertas SPOT/Banc.</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {purchase.fecha}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200 uppercase truncate max-w-[200px]">{purchase.proveedor}</p>
                      <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500">RUC: {purchase.rucProveedor}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {purchase.tipoComprobante} {purchase.serieNumero}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {purchase.categoria.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {purchase.baseImponible.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {purchase.igv.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white font-black">
                      {purchase.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        {purchase.detraccionAplica && (
                          <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded text-[7.5px] font-black uppercase">
                            SPOT {((purchase.tasaDetraccion || 0) * 100)}%
                          </span>
                        )}
                        {purchase.bancarizado && (
                          <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded text-[7.5px] font-black uppercase">
                            BANC.
                          </span>
                        )}
                        {!purchase.detraccionAplica && !purchase.bancarizado && (
                          <span className="text-slate-400 dark:text-slate-600 text-[10px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeletePurchase(purchase.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: LIQUIDACIÓN TRIBUTARIA SUNAT (IGV - RENTA)        */}
      {/* ========================================================= */}
      {activeTab === 'LIQUIDACION_SUNAT' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              Determinación de la Obligación Tributaria Mensual (Formulario Virtual 621)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cálculo de IGV por Pagar (Débito Fiscal - Crédito Fiscal) y Pago a Cuenta del Impuesto a la Renta de Tercera Categoría.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Determinación de IGV */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Scale className="w-4 h-4 text-brand-600 dark:text-brand-400" /> 1. Impuesto General a las Ventas (IGV 18%)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Ventas Netas Gravadas (Base Imponible):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">S/ {taxSettlement.ventasBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Débito Fiscal IGV (18% de Ventas):</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">+ S/ {taxSettlement.ventasIgvDebito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Compras con Derecho a Crédito Fiscal:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">S/ {taxSettlement.comprasBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Crédito Fiscal IGV (18% de Compras):</span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400">- S/ {taxSettlement.comprasIgvCredito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm bg-brand-50/50 dark:bg-brand-950/40 p-3 rounded-xl border border-brand-100 dark:border-brand-800">
                  <span className="font-black text-brand-900 dark:text-brand-200 uppercase">IGV Resultante por Pagar:</span>
                  <span className="font-mono font-black text-brand-700 dark:text-brand-300 text-base">S/ {taxSettlement.igvPorPagar.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Impuesto a la Renta & Total Deuda */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" /> 2. Impuesto a la Renta (Pagos a Cuenta)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Régimen Tributario:</span>
                  <span className="font-bold text-brand-700 dark:text-brand-400 uppercase">{fiscalConfig.regimenTributario}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Tasa Pago a Cuenta:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{(taxSettlement.tasaRenta * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Pago a Cuenta de Renta del Periodo:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">S/ {taxSettlement.pagoCuentaRenta.toFixed(2)}</span>
                </div>

                {/* Total Deuda Tributaria Consolidada */}
                <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-2xl space-y-2 mt-4 border border-slate-800">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Total Deuda Tributaria a Pagar a SUNAT</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-300 font-semibold">IGV + Renta Mensual:</span>
                    <span className="text-2xl font-display font-black text-emerald-400">
                      S/ {taxSettlement.totalDeudaTributaria.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: CONFIGURACIÓN FISCAL & RUC                        */}
      {/* ========================================================= */}
      {activeTab === 'CONFIG_FISCAL' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 max-w-4xl">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Parámetros Fiscales & Domicilio Tributario SUNAT
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configura el RUC de la empresa, series electrónicas y régimen contable según la legislación tributaria peruana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">RUC Empresa (11 Dígitos)</label>
              <input
                type="text"
                maxLength={11}
                value={fiscalConfig.ruc}
                onChange={(e) => saveFiscalConfig({ ...fiscalConfig, ruc: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 font-mono font-bold text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Razón Social Legal</label>
              <input
                type="text"
                value={fiscalConfig.razonSocial}
                onChange={(e) => saveFiscalConfig({ ...fiscalConfig, razonSocial: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 font-bold text-sm outline-none focus:border-brand-500 uppercase text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dirección Fiscal / Local</label>
              <input
                type="text"
                value={fiscalConfig.direccionFiscal}
                onChange={(e) => saveFiscalConfig({ ...fiscalConfig, direccionFiscal: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold outline-none focus:border-brand-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Régimen Tributario</label>
              <select
                value={fiscalConfig.regimenTributario}
                onChange={(e) => {
                  const reg = e.target.value as any;
                  saveFiscalConfig({
                    ...fiscalConfig,
                    regimenTributario: reg,
                    tasaRentaMensual: reg === 'MYPE_TRIBUTARIO' ? 0.01 : 0.015
                  });
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer text-slate-900 dark:text-white"
              >
                <option value="MYPE_TRIBUTARIO">Régimen MYPE Tributario (RMT - 1.0% Renta)</option>
                <option value="REGIMEN_GENERAL">Régimen General (RG - 1.5% Renta)</option>
                <option value="REGIMEN_ESPECIAL">Régimen Especial (RER - 1.5% Renta)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor UIT Vigente (2024)</label>
              <input
                type="number"
                value={fiscalConfig.uitVigente}
                onChange={(e) => saveFiscalConfig({ ...fiscalConfig, uitVigente: parseFloat(e.target.value) || 5150 })}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 font-mono font-bold text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Serie Boleta Electrónica</label>
              <input
                type="text"
                value={fiscalConfig.serieBoleta}
                onChange={(e) => saveFiscalConfig({ ...fiscalConfig, serieBoleta: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 font-mono font-bold text-xs outline-none focus:border-brand-500 uppercase text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Serie Factura Electrónica</label>
              <input
                type="text"
                value={fiscalConfig.serieFactura}
                onChange={(e) => saveFiscalConfig({ ...fiscalConfig, serieFactura: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 font-mono font-bold text-xs outline-none focus:border-brand-500 uppercase text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR NUEVA COMPRA / GASTO                     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showPurchaseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPurchaseModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Registrar Compra / Factura</h3>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Ingreso al Registro de Compras (PLE 8.1)</p>
                  </div>
                </div>
                <button onClick={() => setShowPurchaseModal(false)} className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400">
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">RUC Proveedor (11 Dígitos)</label>
                    <input
                      type="text"
                      maxLength={11}
                      required
                      placeholder="20XXXXXXXXX"
                      value={purchaseForm.rucProveedor}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, rucProveedor: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 font-mono font-bold text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo Comprobante</label>
                    <select
                      value={purchaseForm.tipoComprobante}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, tipoComprobante: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer text-slate-900 dark:text-white"
                    >
                      <option value="FACTURA">01 - FACTURA</option>
                      <option value="BOLETA">03 - BOLETA</option>
                      <option value="RECIBO_HONORARIOS">02 - RECIBO POR HONORARIOS</option>
                      <option value="TICKET">12 - TICKET</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nombre o Razón Social Proveedor</label>
                  <input
                    type="text"
                    required
                    placeholder="DISTRIBUIDORA EJEMPLO S.A.C."
                    value={purchaseForm.proveedor}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, proveedor: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-brand-500 uppercase text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Serie y Número</label>
                    <input
                      type="text"
                      placeholder="F001-0001245"
                      value={purchaseForm.serieNumero}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, serieNumero: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 font-mono font-bold text-xs outline-none focus:border-brand-500 uppercase text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monto Total (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={purchaseForm.total}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, total: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 font-mono font-black text-sm outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categoría del Gasto</label>
                    <select
                      value={purchaseForm.categoria}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, categoria: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer text-slate-900 dark:text-white"
                    >
                      <option value="INSUMOS_ALIMENTOS">Carnes, Verduras e Insumos</option>
                      <option value="BEBIDAS">Bebidas y Gaseosas</option>
                      <option value="SERVICIOS_BASICOS">Luz, Agua y Gas</option>
                      <option value="ALQUILER">Alquiler de Local</option>
                      <option value="TRANSPORTE">Transporte / Flete</option>
                      <option value="MANTENIMIENTO">Mantenimiento y Reparación</option>
                      <option value="OTROS">Otros Gastos</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Medio de Pago</label>
                    <select
                      value={purchaseForm.metodoPago}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, metodoPago: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-brand-500 cursor-pointer text-slate-900 dark:text-white"
                    >
                      <option value="EFECTIVO">Efectivo de Caja</option>
                      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                      <option value="YAPE">Billetera Yape / Plin</option>
                      <option value="CREDITO">Crédito / Por Pagar</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    Guardar Compra
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: VISTA PREVIA COMPROBANTE SUNAT                     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {previewOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewOrder(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100 dark:border-slate-800"
            >
              {/* Ticket Layout Standard Peru SUNAT */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <h3 className="font-display font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                  {fiscalConfig.razonSocial}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">RUC: {fiscalConfig.ruc}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">{fiscalConfig.direccionFiscal}</p>
                <div className="pt-2">
                  <span className="px-3 py-1 bg-slate-900 dark:bg-slate-800 text-white rounded-md text-[10px] font-mono font-black block w-fit mx-auto border border-slate-700">
                    BOLETA DE VENTA ELECTRÓNICA: {fiscalConfig.serieBoleta}-{previewOrder.id.split('-').pop()?.padStart(8, '0')}
                  </span>
                </div>
              </div>

              {/* Order Info */}
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex justify-between">
                  <span>Fecha de Emisión:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{previewOrder.fecha} {previewOrder.hora}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-bold text-slate-800 dark:text-white uppercase">{previewOrder.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mesa:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{previewOrder.mesaId === '13' ? 'Para Llevar' : `Mesa ${previewOrder.mesaId}`}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-700 py-2 space-y-1 text-xs">
                {previewOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300">{item.cantidad}x Plato/Item</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">S/ {(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Tax Breakdown */}
              {(() => {
                const breakdown = calculateTaxBreakdown(previewOrder.total, 0.18);
                return (
                  <div className="space-y-1 text-xs font-semibold">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Op. Gravada:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">S/ {breakdown.baseImponible.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>I.G.V. (18%):</span>
                      <span className="font-mono text-brand-600 dark:text-brand-400">S/ {breakdown.igv.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>TOTAL A PAGAR:</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">S/ {previewOrder.total.toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 text-center">
                      SON: {numberToSpanishWords(previewOrder.total)}
                    </p>
                  </div>
                );
              })()}

              <button
                onClick={() => setPreviewOrder(null)}
                className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminContabilidadSunatView;
