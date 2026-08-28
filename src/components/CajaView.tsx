/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext.tsx';
import { 
  Bell, FileText, Wallet, User, Check, Clock, Edit2, 
  Trash2, Plus, Search, X, Printer, Download, 
  AlertCircle, ChevronRight, Calculator, Coins, 
  ArrowUpDown, TrendingUp, TrendingDown, DollarSign,
  Receipt, Sparkles, Building2, Mail, CreditCard,
  QrCode, Scale, ChevronDown, ArrowUpRight, UserPlus,
  ExternalLink, RefreshCw, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderModal } from './OrderModal.tsx';
import * as XLSX from 'xlsx';

interface PartialCheckoutPayment {
  id: string;
  metodo: 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'CREDITO';
  monto: number;
  referencia?: string;
}

export const CajaView: React.FC = () => {
  const { 
    currentUser, orders, payOrder, products, customers, 
    addCustomer, navigateToCustomerInCuentas,
    updateWholeOrder, currentMenu, mesas, selectedDate, 
    cashControls, identity, openCash, closeCash, reopenCash,
    currentCash, selectedOrderIdForCaja, setSelectedOrderIdForCaja
  } = useApp();

  const isCashClosed = useMemo(() => {
    const cash = cashControls.find(c => c.fecha === selectedDate && (c.estado === 'ABIERTA' || c.estado === 'ABIERTO'))
      || cashControls.find(c => c.fecha === selectedDate);
    return cash?.estado === 'CERRADA' || cash?.estado === 'CERRADO';
  }, [cashControls, selectedDate]);

  const activeCashControl = useMemo(() => {
    return cashControls.find(c => c.fecha === selectedDate && (c.estado === 'ABIERTA' || c.estado === 'ABIERTO'))
      || cashControls.find(c => c.fecha === selectedDate);
  }, [cashControls, selectedDate]);

  const productsMap = useMemo(() => {
    const map = new Map<string, typeof products[0]>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const mesasMap = useMemo(() => {
    const map = new Map<string, typeof mesas[0]>();
    mesas.forEach(m => map.set(m.id, m));
    return map;
  }, [mesas]);

  // Open active orders today
  const activeOrders = useMemo(() => {
    return orders
      .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [orders, selectedDate]);

  // Selected order for checkout
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Sync selectedOrderId if navigated from Mesas or other views
  useEffect(() => {
    if (selectedOrderIdForCaja) {
      setSelectedOrderId(selectedOrderIdForCaja);
      setSelectedOrderIdForCaja(null);
    }
  }, [selectedOrderIdForCaja, setSelectedOrderIdForCaja]);

  // If none selected, default to first active order
  useEffect(() => {
    if (activeOrders.length > 0) {
      if (!selectedOrderId || !activeOrders.some(o => o.id === selectedOrderId)) {
        setSelectedOrderId(activeOrders[0].id);
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [activeOrders, selectedOrderId]);

  const currentOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Billing data states
  const [docType, setDocType] = useState<'DNI' | 'RUC'>('DNI');
  const [docNumber, setDocNumber] = useState<string>('00000000');
  const [clientName, setClientName] = useState<string>('Clientes Varios');
  const [clientEmail, setClientEmail] = useState<string>('cliente@restaurante.pe');
  const [includeTip, setIncludeTip] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Credit / Cuentas selected customer
  const [selectedCreditCustomerId, setSelectedCreditCustomerId] = useState<string>('');
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState<boolean>(false);
  const [newCustForm, setNewCustForm] = useState({ nombre: '', documento: '', telefono: '' });

  // Sync billing data when currentOrder changes
  useEffect(() => {
    if (currentOrder) {
      // Check if order customer matches a registered customer
      let foundCustomer = currentOrder.customerId 
        ? customers.find(c => c.id === currentOrder.customerId) 
        : undefined;

      if (!foundCustomer) {
        foundCustomer = customers.find(c => 
          c.nombre.trim().toLowerCase() === (currentOrder.cliente || '').trim().toLowerCase() ||
          (c.documento && c.documento === currentOrder.cliente)
        );
      }

      if (foundCustomer) {
        setDocNumber(foundCustomer.documento || '00000000');
        setClientName(foundCustomer.nombre);
        setSelectedCreditCustomerId(foundCustomer.id);
      } else {
        setClientName(currentOrder.cliente || 'Clientes Varios');
        setDocNumber('00000000');
        setSelectedCreditCustomerId('');
      }
      setIncludeTip(false);
      setDiscountAmount(0);
      setAddedPayments([]);
      setCurrentPaymentAmount('');
      setCashReceived('');
    }
  }, [currentOrder?.id]);

  // SUNAT Invoice Type: Sin Comprobante / Pago Rápido, Boleta B001, Factura F001, Nota de Venta
  const [comprobanteType, setComprobanteType] = useState<'SIN_COMPROBANTE' | 'BOLETA' | 'FACTURA' | 'NOTA_VENTA'>('SIN_COMPROBANTE');

  // Payment composing states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'CREDITO'>('EFECTIVO');
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<string>('');
  const [addedPayments, setAddedPayments] = useState<PartialCheckoutPayment[]>([]);
  const [cashReceived, setCashReceived] = useState<string>('');

  // Modals
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [showArqueoModal, setShowArqueoModal] = useState<boolean>(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [movementDescription, setMovementDescription] = useState<string>('');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [cashMovementsList, setCashMovementsList] = useState<Array<{
    id: string;
    tipo: 'INGRESO' | 'EGRESO';
    desc: string;
    monto: number;
    hora: string;
  }>>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [ticketToPrint, setTicketToPrint] = useState<{
    order: typeof orders[0];
    comprobante: string;
    docNumber: string;
    clientName: string;
    clientEmail: string;
    tip: number;
    total: number;
    pagos: PartialCheckoutPayment[];
    vuelto: number;
  } | null>(null);

  // Quick helper to compute customer balance
  const getCustomerBalance = (cust: typeof customers[0]) => {
    return (cust.historial || []).reduce((acc, tx) => acc + tx.monto, 0);
  };

  // Calculations for current selected order
  const orderBaseTotal = useMemo(() => {
    if (!currentOrder) return 0;
    return currentOrder.total;
  }, [currentOrder]);

  const tipAmount = useMemo(() => {
    if (!includeTip || !currentOrder) return 0;
    return Number((orderBaseTotal * 0.10).toFixed(2));
  }, [includeTip, currentOrder, orderBaseTotal]);

  const finalTotalToPay = useMemo(() => {
    return Math.max(0, orderBaseTotal + tipAmount - discountAmount);
  }, [orderBaseTotal, tipAmount, discountAmount]);

  const subtotalGravado = useMemo(() => {
    return Number((finalTotalToPay / 1.18).toFixed(2));
  }, [finalTotalToPay]);

  const igvAmount = useMemo(() => {
    return Number((finalTotalToPay - subtotalGravado).toFixed(2));
  }, [finalTotalToPay, subtotalGravado]);

  const totalAddedPayments = useMemo(() => {
    return addedPayments.reduce((acc, p) => acc + p.monto, 0);
  }, [addedPayments]);

  const remainingToPay = useMemo(() => {
    return Math.max(0, finalTotalToPay - totalAddedPayments);
  }, [finalTotalToPay, totalAddedPayments]);

  // Set default amount in input when remaining changes
  useEffect(() => {
    if (remainingToPay > 0) {
      setCurrentPaymentAmount(remainingToPay.toFixed(2));
    } else {
      setCurrentPaymentAmount('');
    }
  }, [remainingToPay]);

  // Cash change (vuelto)
  const cashChange = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    const cashPortion = addedPayments.filter(p => p.metodo === 'EFECTIVO').reduce((acc, p) => acc + p.monto, 0);
    const effectiveToCompare = cashPortion > 0 ? cashPortion : remainingToPay;
    if (received > effectiveToCompare) {
      return received - effectiveToCompare;
    }
    return 0;
  }, [cashReceived, addedPayments, remainingToPay]);

  // Add a partial or full payment to list
  const handleAddPayment = () => {
    const amt = parseFloat(currentPaymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newPayment: PartialCheckoutPayment = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      metodo: selectedPaymentMethod,
      monto: Math.min(amt, remainingToPay > 0 ? remainingToPay : amt)
    };

    setAddedPayments(prev => [...prev, newPayment]);
  };

  const handleRemovePayment = (id: string) => {
    setAddedPayments(prev => prev.filter(p => p.id !== id));
  };

  // Keyboard shortcut listener (e.g. F8 for Efectivo, F9 for Yape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setSelectedPaymentMethod('EFECTIVO');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setSelectedPaymentMethod('YAPE');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Customer search auto-fill helper
  const handleDocChange = (val: string) => {
    setDocNumber(val);
    if (val.length >= 8) {
      const match = customers.find(c => c.documento === val);
      if (match) {
        setClientName(match.nombre);
      }
    }
  };

  // Direct quick cash payment handler for a specific order
  const handleDirectQuickPay = async (targetOrder: typeof orders[0]) => {
    if (isProcessingPayment) return;
    if (isCashClosed) {
      if (confirm('La caja está cerrada. ¿Deseas reabrirla ahora para poder cobrar?')) {
        reopenCash();
      }
      return;
    }
    setIsProcessingPayment(true);
    try {
      const finalPayments: PartialCheckoutPayment[] = [{
        id: `p-quick-${Date.now()}`,
        metodo: 'EFECTIVO',
        monto: targetOrder.total
      }];
      await payOrder(
        targetOrder.id,
        finalPayments,
        undefined,
        undefined,
        targetOrder.cliente || 'Consumidor Final',
        targetOrder.total,
        0,
        0
      );
      setAddedPayments([]);
      setCashReceived('');
    } catch (err: any) {
      console.error(err);
      alert('Error al realizar cobro directo: ' + (err?.message || err));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Execute complete order checkout & close table
  const handleEmitAndCloseTable = async () => {
    if (!currentOrder || isProcessingPayment) return;
    if (isCashClosed) {
      if (confirm('La caja del día está cerrada. ¿Deseas reabrirla ahora para procesar el cobro?')) {
        reopenCash();
      }
      return;
    }

    // Determine final payments list
    let finalPayments: PartialCheckoutPayment[] = [];
    if (addedPayments.length > 0) {
      finalPayments = [...addedPayments];
      // If remaining balance exists, add remaining with selected method
      if (remainingToPay > 0.01) {
        finalPayments.push({
          id: `p-rest-${Date.now()}`,
          metodo: selectedPaymentMethod,
          monto: remainingToPay
        });
      }
    } else {
      // Full payment in single selected method
      finalPayments = [{
        id: `p-full-${Date.now()}`,
        metodo: selectedPaymentMethod,
        monto: finalTotalToPay
      }];
    }

    setIsProcessingPayment(true);
    try {
      // Find customer for credit/fiado if any payment is CREDITO
      let targetCustomerId: string | undefined = selectedCreditCustomerId || undefined;
      let targetCustomerName: string = clientName;

      const hasCredit = finalPayments.some(p => p.metodo === 'CREDITO');
      if (hasCredit) {
        let found = targetCustomerId ? customers.find(c => c.id === targetCustomerId) : undefined;
        if (!found) {
          found = customers.find(c => 
            c.nombre.toLowerCase().trim() === clientName.toLowerCase().trim() ||
            (c.documento && c.documento === docNumber && docNumber !== '00000000')
          );
        }

        if (!found) {
          alert(`Para registrar pago a crédito/fiar, el cliente "${clientName}" debe estar registrado en el módulo de Cuentas. Por favor selecciónelo o use "+ Registrar Cliente".`);
          setIsProcessingPayment(false);
          return;
        }
        targetCustomerId = found.id;
        targetCustomerName = found.nombre;
      }

      // Process complete payment atomically in AppContext
      await payOrder(
        currentOrder.id, 
        finalPayments, 
        undefined, 
        targetCustomerId, 
        targetCustomerName,
        finalTotalToPay,
        tipAmount,
        discountAmount
      );

      // Set ticket to print only if requested
      if (comprobanteType !== 'SIN_COMPROBANTE') {
        const correlativo = comprobanteType === 'BOLETA' 
          ? `B001-${String(Math.floor(Math.random() * 9000 + 1000))}`
          : comprobanteType === 'FACTURA'
            ? `F001-${String(Math.floor(Math.random() * 9000 + 1000))}`
            : `NV01-${currentOrder.id.split('-').pop()}`;

        setTicketToPrint({
          order: currentOrder,
          comprobante: `${comprobanteType === 'BOLETA' ? 'Boleta de Venta' : comprobanteType === 'FACTURA' ? 'Factura Electrónica' : 'Nota de Venta'} (${correlativo})`,
          docNumber,
          clientName: targetCustomerName || clientName,
          clientEmail,
          tip: tipAmount,
          total: finalTotalToPay,
          pagos: finalPayments,
          vuelto: cashChange
        });
      }

      // Clear selection
      setAddedPayments([]);
      setCashReceived('');
    } catch (err: any) {
      console.error(err);
      alert('Error al procesar el pago y emitir comprobante: ' + (err?.message || err));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleQuickCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustForm.nombre.trim()) return;

    const newId = Math.random().toString(36).substr(2, 9);
    addCustomer({
      nombre: newCustForm.nombre.trim(),
      documento: newCustForm.documento.trim(),
      telefono: newCustForm.telefono.trim()
    });

    setClientName(newCustForm.nombre.trim());
    if (newCustForm.documento.trim()) {
      setDocNumber(newCustForm.documento.trim());
    }
    setSelectedCreditCustomerId(newId);
    setShowQuickCustomerModal(false);
    setNewCustForm({ nombre: '', documento: '', telefono: '' });
  };

  const getMesaName = (mesaId: string) => {
    if (mesaId === '13') return 'Para Llevar';
    const m = mesasMap.get(mesaId);
    return m ? m.nombre : `Mesa ${mesaId}`;
  };

  return (
    <div className="p-2 md:p-6 space-y-6 max-w-[1680px] mx-auto">
      
      {/* 1. TOP HEADER (Facturación & Checkout) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Facturación & Checkout
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border ${
              isCashClosed 
                ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60' 
                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-900/60'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isCashClosed ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              {isCashClosed ? 'Caja Cerrada' : `Turno activo desde: ${selectedDate} ${activeCashControl?.horaApertura || '08:00'}`}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Cajero: <strong className="text-slate-800 dark:text-slate-200">{currentUser?.nombre || 'Administrador'}</strong></span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isCashClosed && (
            <button
              onClick={() => reopenCash()}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              🔓 Reabrir Caja Hoy
            </button>
          )}

          <button
            onClick={() => setShowArqueoModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Arqueo / Cierre Z
          </button>

          <button
            onClick={() => setShowCashMovementModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Ingreso / Egreso
          </button>
        </div>
      </div>

      {/* Warning if cash is closed */}
      {isCashClosed && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-black text-sm uppercase tracking-tight text-amber-950 dark:text-amber-100">Caja del Día Cerrada</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">No se pueden procesar cobros mientras la caja esté cerrada. Reábrala para continuar cobrando comandas.</p>
            </div>
          </div>
          <button
            onClick={() => reopenCash()}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black uppercase text-[11px] tracking-wider transition-all active:scale-95 shrink-0 shadow-sm cursor-pointer"
          >
            🔓 Reabrir Caja Ahora
          </button>
        </div>
      )}

      {/* 2. THREE-COLUMN CHECKOUT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* COLUMN 1: MESAS ACTIVAS */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-full min-h-[580px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/60">
                  <Bell className="w-4 h-4" />
                </div>
                <h2 className="font-display font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                  Mesas Activas
                </h2>
              </div>
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-display font-black text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                {activeOrders.length}
              </span>
            </div>

            {/* List of active tables */}
            <div className="space-y-3 pt-4 flex-1 overflow-y-auto max-h-[600px] no-scrollbar">
              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 dark:text-slate-500 space-y-3">
                  <AlertCircle className="w-10 h-10 opacity-30 text-slate-400 dark:text-slate-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">No hay comandas activas</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Las mesas ocupadas por los mozos aparecerán aquí en tiempo real.</p>
                </div>
              ) : (
                activeOrders.map((order) => {
                  const isSelected = order.id === selectedOrderId;
                  const isReady = order.items.every(i => i.estado === 'SERVIDO');
                  const mesaName = getMesaName(order.mesaId);

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative ${
                        isSelected 
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/40 ring-4 ring-indigo-500/10 shadow-md' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-black text-slate-900 dark:text-white text-base leading-tight">
                              {mesaName}
                            </h3>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isReady 
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60' 
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                            }`}>
                              {isReady ? 'LISTO' : 'EN PREP'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">
                            Salón Principal • #{order.id.split('-').pop()}
                          </p>
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'}`} />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                          <User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          <span className="truncate max-w-[110px]">{order.usuarioNombre || 'Carlos Mesero'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOrderId(order.id);
                            }}
                            title="Editar comanda o cambiar mesa"
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-display font-black text-slate-900 dark:text-white text-sm">
                            S/ {order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quick direct charge button right on card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                          handleDirectQuickPay(order);
                        }}
                        disabled={isProcessingPayment}
                        className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Cobrar comanda en Efectivo en 1 clic"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Cobro Rápido (Efectivo) S/ {order.total.toFixed(2)}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2: LIQUIDACIÓN DE CUENTA */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-full min-h-[580px]">
            
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h2 className="font-display font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                    Liquidación de Cuenta
                  </h2>
                </div>
                {currentOrder && (
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-display font-black text-xs rounded-full border border-indigo-100/80 dark:border-indigo-900/60">
                    {getMesaName(currentOrder.mesaId)}
                  </span>
                )}
              </div>

              {currentOrder ? (
                <>
                  {/* DATOS DE FACTURACIÓN O PAGO RÁPIDO */}
                  {comprobanteType === 'SIN_COMPROBANTE' ? (
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wide">
                            ⚡ Modo Pago Rápido (Sin Comprobante)
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            Cobro express directo a caja sin emitir ticket ni reporte SUNAT
                          </p>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-black text-emerald-900 dark:text-emerald-200 bg-emerald-200/70 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                        Rápido
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50/70 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          DATOS DE FACTURACIÓN
                        </p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setDocType('DNI')}
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md cursor-pointer ${docType === 'DNI' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                          >
                            DNI
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocType('RUC')}
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md cursor-pointer ${docType === 'RUC' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                          >
                            RUC
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            value={docNumber}
                            onChange={(e) => handleDocChange(e.target.value)}
                            placeholder={docType === 'DNI' ? 'DNI (8 dígitos)' : 'RUC (11 dígitos)'}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Nombre o Razón Social"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="cliente@restaurante.pe (Envío de Comprobante)"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* LIST OF CONSUMED DISHES */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {currentOrder.items.map((item) => {
                      const p = productsMap.get(item.productoId);
                      const itemTotal = item.cantidad * item.precioUnitario;

                      return (
                        <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                          <div>
                            <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
                              {item.cantidad}x {p?.nombre || 'Plato'}
                            </p>
                            {item.notas && (
                              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                + {item.notas}
                              </p>
                            )}
                          </div>
                          <span className="font-display font-black text-slate-900 dark:text-white whitespace-nowrap ml-3">
                            S/ {itemTotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-xs font-bold">Selecciona una mesa para liquidar la cuenta</p>
                </div>
              )}
            </div>

            {/* FINANCIAL BREAKDOWN */}
            {currentOrder && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 mt-4">
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>Op. Gravada / Subtotal:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">S/ {subtotalGravado.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>Inc. I.G.V. 18% (Discriminado):</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">S/ {igvAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Propina Sugerida (10%):</span>
                    <button
                      type="button"
                      onClick={() => setIncludeTip(!includeTip)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${includeTip ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                      title={includeTip ? 'Quitar propina' : 'Añadir propina'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className={`font-mono font-bold ${includeTip ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    S/ {(includeTip ? tipAmount : 0).toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                  <span className="font-display font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                    TOTAL A PAGAR:
                  </span>
                  <span className="font-display font-black text-2xl text-indigo-700 dark:text-indigo-400 tracking-tight">
                    S/ {finalTotalToPay.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* COLUMN 3: MÉTODO DE PAGO */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-full min-h-[580px]">
            
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/60">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h2 className="font-display font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                    Método de Pago
                  </h2>
                </div>
              </div>

              {/* TIPO DE COMPROBANTE SUNAT */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Tipo de Comprobante
                </label>
                <select
                  value={comprobanteType}
                  onChange={(e) => setComprobanteType(e.target.value as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                    comprobanteType === 'SIN_COMPROBANTE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 focus:ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-indigo-500/20'
                  }`}
                >
                  <option value="SIN_COMPROBANTE">⚡ Sin Comprobante / Pago Rápido (Sin Reporte)</option>
                  <option value="BOLETA">Boleta de Venta Electrónica (B001)</option>
                  <option value="FACTURA">Factura Electrónica (F001)</option>
                  <option value="NOTA_VENTA">Nota de Venta / Ticket de Consumo</option>
                </select>
              </div>

              {/* COMPOSICIÓN DE PAGOS */}
              <div className="space-y-3">
                <label className="text-[10.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Composición de Pagos
                </label>

                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="EFECTIVO">Efectivo [F8]</option>
                  <option value="YAPE">Yape [F9]</option>
                  <option value="PLIN">Plin</option>
                  <option value="TARJETA">Tarjeta Débito / Crédito</option>
                  <option value="CREDITO">Crédito / Fiar a Cuenta</option>
                </select>

                {/* DEDICATED PANEL FOR CRÉDITO / FIAR A CUENTA */}
                {(selectedPaymentMethod === 'CREDITO' || addedPayments.some(p => p.metodo === 'CREDITO')) && (
                  <div className="bg-amber-50/80 dark:bg-amber-950/50 rounded-2xl p-3.5 border border-amber-200/80 dark:border-amber-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        Cliente para Crédito / Fiar (Módulo Cuentas)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowQuickCustomerModal(true)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/70 dark:bg-amber-900/60 hover:bg-amber-300/80 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Registrar Cliente</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <select
                        value={selectedCreditCustomerId}
                        onChange={(e) => {
                          const custId = e.target.value;
                          setSelectedCreditCustomerId(custId);
                          const cust = customers.find(c => c.id === custId);
                          if (cust) {
                            setClientName(cust.nombre);
                            if (cust.documento) setDocNumber(cust.documento);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                      >
                        <option value="">-- Seleccione Cliente Registrado --</option>
                        {customers.map(c => {
                          const bal = getCustomerBalance(c);
                          const balText = bal < 0 
                            ? `(Debe: S/ ${Math.abs(bal).toFixed(2)})` 
                            : bal > 0 
                              ? `(A favor: S/ ${bal.toFixed(2)})` 
                              : `(Al día)`;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.nombre} {c.documento ? `[${c.documento}]` : ''} - {balText}
                            </option>
                          );
                        })}
                      </select>

                      {selectedCreditCustomerId && (() => {
                        const selectedCust = customers.find(c => c.id === selectedCreditCustomerId);
                        if (!selectedCust) return null;
                        const bal = getCustomerBalance(selectedCust);
                        return (
                          <div className="flex items-center justify-between pt-1 px-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Saldo actual:</span>
                              <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                                bal < 0 ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' : bal > 0 ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                S/ {bal.toFixed(2)} {bal < 0 ? '(Debe)' : bal > 0 ? '(A favor)' : '(Al día)'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigateToCustomerInCuentas(selectedCust.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 underline underline-offset-2 cursor-pointer"
                            >
                              <span>Ver Cuenta</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Amount input + Añadir Pago button */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 text-xs">S/</span>
                    <input
                      type="number"
                      step="0.5"
                      value={currentPaymentAmount}
                      onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-8 pr-3 text-sm font-display font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPayment}
                    disabled={!currentPaymentAmount || parseFloat(currentPaymentAmount) <= 0}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer"
                  >
                    Añadir Pago
                  </button>
                </div>

                {/* Added payments list */}
                <div className="space-y-1.5 min-h-[60px]">
                  {addedPayments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium leading-relaxed py-1">
                      Ningún pago registrado en el checkout. (Se asumirá pago total en {selectedPaymentMethod === 'EFECTIVO' ? 'Efectivo [F8]' : selectedPaymentMethod}).
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {addedPayments.map(p => (
                        <div key={p.id} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-[10px] uppercase px-2 py-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                              {p.metodo}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">S/ {p.monto.toFixed(2)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cash received & change calculation if cash used */}
                {selectedPaymentMethod === 'EFECTIVO' && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/60 space-y-2">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">Efectivo Recibido del Cliente:</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 text-xs">S/</span>
                        <input
                          type="number"
                          step="1"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder={finalTotalToPay.toFixed(2)}
                          className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg py-1 pl-6 pr-2 text-xs font-black text-slate-800 dark:text-slate-100 text-right focus:outline-none"
                        />
                      </div>
                    </div>
                    {cashChange > 0 && (
                      <div className="flex justify-between items-center text-xs font-black text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-100 dark:border-emerald-800/60">
                        <span>Vuelto a entregar:</span>
                        <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">S/ {cashChange.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SUMMARY AND EMIT BUTTON */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Suma Pagos Agregados:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">S/ {totalAddedPayments.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-700 dark:text-amber-400">Restante por pagar:</span>
                <span className="font-mono font-black text-amber-700 dark:text-amber-400">S/ {remainingToPay.toFixed(2)}</span>
              </div>

              {/* Button status info */}
              {!currentOrder && activeOrders.length > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 rounded-xl p-2.5 text-center font-bold">
                  👈 Seleccione una mesa activa en la columna izquierda para cobrar.
                </p>
              )}
              {!currentOrder && activeOrders.length === 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-center font-medium">
                  No hay comandas activas pendientes de cobro para hoy.
                </p>
              )}

              <button
                type="button"
                onClick={handleEmitAndCloseTable}
                disabled={!currentOrder || isProcessingPayment}
                className={`w-full py-4 rounded-2xl font-display font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:shadow-none ${
                  isCashClosed
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                    : comprobanteType === 'SIN_COMPROBANTE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 hover:shadow-emerald-600/35 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 hover:shadow-indigo-600/30 text-white'
                }`}
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Procesando Pago...</span>
                  </>
                ) : isCashClosed ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    <span>Caja Cerrada (Clic para Reabrir y Cobrar)</span>
                  </>
                ) : !currentOrder ? (
                  <span>Seleccione una Mesa para Cobrar</span>
                ) : comprobanteType === 'SIN_COMPROBANTE' ? (
                  <>
                    <Zap className="w-5 h-5 fill-white/20" />
                    <span>Cobrar S/ {finalTotalToPay.toFixed(2)} y Cerrar Mesa</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    <span>
                      {comprobanteType === 'FACTURA' 
                        ? 'Emitir Factura y Cerrar Mesa' 
                        : comprobanteType === 'NOTA_VENTA'
                          ? 'Emitir Nota de Venta y Cerrar Mesa'
                          : 'Emitir Boleta y Cerrar Mesa'}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* 3. ORDER EDITING MODAL */}
      {editingOrderId && (
        <OrderModal
          onClose={() => setEditingOrderId(null)}
          onAdd={() => {}}
          onSaveEdit={async (qtys, notes, newClienteName, newMesaId) => {
            await updateWholeOrder(editingOrderId, newMesaId, newClienteName, qtys, notes);
            setEditingOrderId(null);
          }}
          products={products}
          currentMenu={currentMenu.filter(m => m.fecha === selectedDate)}
          mesaId={orders.find(o => o.id === editingOrderId)?.mesaId || '1'}
          mesaName={getMesaName(orders.find(o => o.id === editingOrderId)?.mesaId || '1')}
          initialClienteName={orders.find(o => o.id === editingOrderId)?.cliente}
          mesas={mesas}
          initialItems={orders.find(o => o.id === editingOrderId)?.items || []}
          title="Modificar Pedido en Caja"
        />
      )}

      {/* 4. MODAL DE ARQUEO / CIERRE Z */}
      <AnimatePresence>
        {showArqueoModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/60">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">
                      Arqueo de Caja / Cierre Z
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{selectedDate}</p>
                  </div>
                </div>
                <button onClick={() => setShowArqueoModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-300 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto no-scrollbar">
                {(() => {
                  const todayOrders = orders.filter(o => o.fecha === selectedDate);
                  const paidOrCreditOrders = todayOrders.filter(o => o.estado === 'PAGADO' || o.estado === 'CREDITO');

                  // Extract all payments accurately
                  const allPaymentsToday = paidOrCreditOrders.flatMap(o => 
                    o.pagos && o.pagos.length > 0 
                      ? o.pagos 
                      : (o.metodoPago ? [{ id: o.id, metodo: o.metodoPago, monto: o.total }] : [])
                  );

                  const efectivoVentas = allPaymentsToday
                    .filter(p => p.metodo === 'EFECTIVO')
                    .reduce((acc, p) => acc + p.monto, 0);

                  const yapeVentas = allPaymentsToday
                    .filter(p => p.metodo === 'YAPE' || p.metodo === 'PLIN')
                    .reduce((acc, p) => acc + p.monto, 0);

                  const tarjetaVentas = allPaymentsToday
                    .filter(p => p.metodo === 'TARJETA')
                    .reduce((acc, p) => acc + p.monto, 0);

                  const creditoVentas = allPaymentsToday
                    .filter(p => p.metodo === 'CREDITO')
                    .reduce((acc, p) => acc + p.monto, 0);

                  // Customer Cuenta transactions collected today
                  const customerTxToday = customers.flatMap(c => 
                    (c.historial || [])
                      .filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
                  );
                  const cobrosEfectivo = customerTxToday
                    .filter(t => t.metodoPago === 'EFECTIVO')
                    .reduce((acc, t) => acc + t.monto, 0);
                  const cobrosYape = customerTxToday
                    .filter(t => t.metodoPago === 'YAPE' || t.metodoPago === 'PLIN')
                    .reduce((acc, t) => acc + t.monto, 0);

                  const movIngresos = cashMovementsList
                    .filter(m => m.tipo === 'INGRESO')
                    .reduce((acc, m) => acc + m.monto, 0);
                  const movEgresos = cashMovementsList
                    .filter(m => m.tipo === 'EGRESO')
                    .reduce((acc, m) => acc + m.monto, 0);

                  const apertura = activeCashControl?.montoApertura || 0;
                  const totalEsperadoEfectivo = apertura + efectivoVentas + cobrosEfectivo + movIngresos - movEgresos;
                  const totalVentasGlobal = efectivoVentas + yapeVentas + tarjetaVentas + creditoVentas;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-400">Fondo Inicial:</span>
                          <p className="text-base font-display font-black text-slate-800 dark:text-slate-100">S/ {apertura.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-100 dark:border-emerald-800/60">
                          <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Ventas Efectivo:</span>
                          <p className="text-base font-display font-black text-emerald-900 dark:text-emerald-200">S/ {efectivoVentas.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-sky-50 dark:bg-sky-950/50 rounded-2xl border border-sky-100 dark:border-sky-800/60">
                          <span className="text-[9px] font-black uppercase text-sky-600 dark:text-sky-400">Ventas Yape/Plin:</span>
                          <p className="text-base font-display font-black text-sky-900 dark:text-sky-200">S/ {yapeVentas.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-2xl border border-purple-100 dark:border-purple-800/60">
                          <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400">Ventas Tarjeta:</span>
                          <p className="text-base font-display font-black text-purple-900 dark:text-purple-200">S/ {tarjetaVentas.toFixed(2)}</p>
                        </div>
                        {creditoVentas > 0 && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-100 dark:border-amber-800/60">
                            <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">Crédito / Fiado:</span>
                            <p className="text-base font-display font-black text-amber-900 dark:text-amber-200">S/ {creditoVentas.toFixed(2)}</p>
                          </div>
                        )}
                        {(cobrosEfectivo > 0 || cobrosYape > 0) && (
                          <div className="p-3 bg-teal-50 dark:bg-teal-950/50 rounded-2xl border border-teal-100 dark:border-teal-800/60">
                            <span className="text-[9px] font-black uppercase text-teal-600 dark:text-teal-400">Cobros de Cuentas:</span>
                            <p className="text-base font-display font-black text-teal-900 dark:text-teal-200">S/ {(cobrosEfectivo + cobrosYape).toFixed(2)}</p>
                          </div>
                        )}
                        <div className="col-span-2 p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 block">Total Efectivo en Gaveta:</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">(Apertura + Ventas Efec. + Cobros - Egresos)</span>
                          </div>
                          <p className="text-xl font-display font-black text-indigo-900 dark:text-indigo-200">S/ {totalEsperadoEfectivo.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white rounded-2xl space-y-1 text-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total de Ventas Globales Hoy:</span>
                        <p className="text-2xl font-display font-black text-emerald-400">S/ {totalVentasGlobal.toFixed(2)}</p>
                        <div className="text-[10px] text-slate-400 pt-1 flex justify-center gap-3">
                          <span>Comandas: {paidOrCreditOrders.length} cobradas</span>
                          <span>•</span>
                          <span>Pendientes: {todayOrders.filter(o => o.estado === 'ABIERTO').length}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            window.print();
                          }}
                          className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" /> Imprimir Reporte Z
                        </button>
                        <button
                          onClick={() => {
                            setShowArqueoModal(false);
                          }}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider flex items-center justify-center cursor-pointer"
                        >
                          Aceptar
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL DE INGRESO / EGRESO */}
      <AnimatePresence>
        {showCashMovementModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/60">
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                  <h3 className="font-display font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                    Movimiento de Caja Chica
                  </h3>
                </div>
                <button onClick={() => setShowCashMovementModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-300 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 block mb-1">Tipo de Movimiento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovementType('INGRESO')}
                      className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                        movementType === 'INGRESO'
                          ? 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Ingreso de Dinero
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementType('EGRESO')}
                      className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                        movementType === 'EGRESO'
                          ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Egreso / Gasto Menor
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 block mb-1">Motivo / Descripción</label>
                  <input
                    type="text"
                    value={movementDescription}
                    onChange={(e) => setMovementDescription(e.target.value)}
                    placeholder="Ej: Compra de hielo, recarga de sencillo..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 block mb-1">Monto (S/)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-display font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {cashMovementsList.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                    <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Movimientos registrados hoy:</span>
                    {cashMovementsList.map(m => (
                      <div key={m.id} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700 flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{m.desc} ({m.hora})</span>
                        <span className={`font-mono font-bold ${m.tipo === 'INGRESO' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {m.tipo === 'INGRESO' ? '+' : '-'} S/ {m.monto.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setShowCashMovementModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-wider cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    disabled={!movementDescription.trim() || !movementAmount || parseFloat(movementAmount) <= 0}
                    onClick={() => {
                      const amt = parseFloat(movementAmount);
                      if (isNaN(amt) || amt <= 0) return;
                      const now = new Date();
                      const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                      setCashMovementsList(prev => [
                        ...prev,
                        {
                          id: `mov-${Date.now()}`,
                          tipo: movementType,
                          desc: movementDescription.trim(),
                          monto: amt,
                          hora
                        }
                      ]);
                      setMovementDescription('');
                      setMovementAmount('');
                      setShowCashMovementModal(false);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-sm cursor-pointer"
                  >
                    Registrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. TICKET DE VENTA THERMAL PRINT MODAL */}
      <AnimatePresence>
        {ticketToPrint && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-display font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Comprobante Emitido
                  </span>
                </div>
                <button onClick={() => setTicketToPrint(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Thermal ticket content */}
              <div className="p-6 overflow-y-auto no-scrollbar font-mono text-[11px] text-slate-800 dark:text-slate-200 space-y-3">
                <div className="text-center space-y-0.5">
                  <h4 className="font-display font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">
                    {identity?.nombre || 'SABOR ABANQUINO'}
                  </h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">RUC: 20608974512</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">Av. Arenas 450 - Abancay, Apurímac</p>
                  <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-700 py-1 my-1.5 font-bold text-slate-900 dark:text-white">
                    {ticketToPrint.comprobante}
                  </div>
                </div>

                <div className="space-y-0.5 text-[10px]">
                  <p><strong>Fecha:</strong> {selectedDate} {ticketToPrint.order.hora || '12:00'}</p>
                  <p><strong>Mesa:</strong> {getMesaName(ticketToPrint.order.mesaId)}</p>
                  <p><strong>Cliente:</strong> {ticketToPrint.clientName}</p>
                  <p><strong>Doc:</strong> {ticketToPrint.docNumber}</p>
                </div>

                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-1.5 space-y-1">
                  {ticketToPrint.order.items.map(item => {
                    const p = productsMap.get(item.productoId);
                    return (
                      <div key={item.id} className="flex justify-between">
                        <span className="truncate max-w-[170px]">{item.cantidad}x {p?.nombre || 'Item'}</span>
                        <span>S/ {(item.cantidad * item.precioUnitario).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-1.5 space-y-0.5 text-right font-bold">
                  {ticketToPrint.tip > 0 && (
                    <div className="flex justify-between">
                      <span>Propina (10%):</span>
                      <span>S/ {ticketToPrint.tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-300 dark:border-slate-700">
                    <span>TOTAL:</span>
                    <span>S/ {ticketToPrint.total.toFixed(2)}</span>
                  </div>
                  {ticketToPrint.vuelto > 0 && (
                    <div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-400">
                      <span>Vuelto Entregado:</span>
                      <span>S/ {ticketToPrint.vuelto.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="text-center text-[9px] text-slate-400 dark:text-slate-500 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700">
                  ¡GRACIAS POR SU PREFERENCIA!
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir Ticket
                </button>
                <button
                  onClick={() => setTicketToPrint(null)}
                  className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold uppercase text-[10px] cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. REGISTRO HISTÓRICO DE COMPROBANTES DE HOY */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-display font-black text-slate-900 dark:text-white text-base uppercase tracking-tight flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Registro Histórico de Comprobantes
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Ventas, métodos de pago y cuentas corrientes registradas en ({selectedDate})</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const todayOrders = orders.filter(o => o.fecha === selectedDate);
                const exportData = todayOrders.map(o => {
                  let paymentMethodDisplay = o.metodoPago || (o.estado === 'ABIERTO' ? 'PENDIENTE' : 'EFECTIVO');
                  if (o.pagos && o.pagos.length > 0) {
                    if (o.pagos.length === 1) {
                      paymentMethodDisplay = o.pagos[0].metodo;
                    } else {
                      paymentMethodDisplay = `MIXTO (${o.pagos.map(p => `${p.metodo}: S/ ${p.monto.toFixed(2)}`).join(', ')})`;
                    }
                  }

                  return {
                    'N° Pedido': o.id,
                    'Hora': o.hora || '',
                    'Mesa': getMesaName(o.mesaId),
                    'Cliente': o.cliente,
                    'Estado': o.estado,
                    'Método Pago': paymentMethodDisplay,
                    'Total S/': o.total
                  };
                });
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Ventas_Caja');
                XLSX.writeFile(wb, `Ventas_Caja_${selectedDate.replace(/\//g, '-')}.xlsx`);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar Excel
            </button>
          </div>
        </div>

        {/* Table of Orders */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px] text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">N° Pedido</th>
                <th className="py-3 px-3">Hora</th>
                <th className="py-3 px-4">Mesa</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-3 text-center">Platos</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-4 text-right">Total S/</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders
                .filter(o => o.fecha === selectedDate)
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .map((order) => {
                  const itemsCount = order.items.reduce((acc, i) => acc + i.cantidad, 0);
                  const mesaName = getMesaName(order.mesaId);

                  // Find matching customer in Cuentas
                  const matchedCustomer = (order.customerId ? customers.find(c => c.id === order.customerId) : undefined) ||
                    customers.find(c => c.nombre.trim().toLowerCase() === order.cliente.trim().toLowerCase());

                  // Calculate exact payment method representation
                  const hasPaymentsList = order.pagos && order.pagos.length > 0;
                  const distinctMethods = hasPaymentsList 
                    ? Array.from(new Set(order.pagos!.map(p => p.metodo)))
                    : [];

                  const isSinglePayment = hasPaymentsList && distinctMethods.length === 1;
                  const isMultiplePayments = hasPaymentsList && distinctMethods.length > 1;
                  const singleMethod = isSinglePayment ? distinctMethods[0] : (order.metodoPago || (order.estado === 'CREDITO' ? 'CREDITO' : 'EFECTIVO'));

                  const hasCreditPayment = (hasPaymentsList && order.pagos!.some(p => p.metodo === 'CREDITO')) ||
                    order.metodoPago === 'CREDITO' ||
                    order.estado === 'CREDITO';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                        #{order.id.split('-').pop()}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-400 dark:text-slate-500">
                        {order.hora || '12:00'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {mesaName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white">{order.cliente}</span>
                          {matchedCustomer && (
                            <button
                              onClick={() => navigateToCustomerInCuentas(matchedCustomer.id)}
                              title={`Abrir estado de cuenta de ${matchedCustomer.nombre}`}
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 transition-colors cursor-pointer"
                            >
                              <span>Cuentas</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-400">
                        {itemsCount}
                      </td>
                      
                      {/* MÉTODO DE PAGO CONECTADO CON OPCIONES Y CUENTAS */}
                      <td className="py-3.5 px-4">
                        {order.estado === 'ABIERTO' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Clock className="w-3 h-3 text-slate-400" /> Pendiente
                          </span>
                        ) : isMultiplePayments ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
                                <Coins className="w-3 h-3 text-violet-600 dark:text-violet-400" /> Mixto
                              </span>
                              {hasCreditPayment && matchedCustomer && (
                                <button
                                  onClick={() => navigateToCustomerInCuentas(matchedCustomer.id)}
                                  className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                                >
                                  <Wallet className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                  <span>Ver en Cuentas</span>
                                  <ArrowUpRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <div className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                              {order.pagos!.map(p => `${p.metodo === 'CREDITO' ? 'Crédito' : p.metodo}: S/ ${p.monto.toFixed(2)}`).join(' + ')}
                            </div>
                          </div>
                        ) : singleMethod === 'EFECTIVO' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Efectivo
                          </span>
                        ) : singleMethod === 'YAPE' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                            <QrCode className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Yape
                          </span>
                        ) : singleMethod === 'PLIN' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                            <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" /> Plin
                          </span>
                        ) : singleMethod === 'TARJETA' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                            <CreditCard className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Tarjeta
                          </span>
                        ) : singleMethod === 'CREDITO' || hasCreditPayment ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              <Wallet className="w-3 h-3 text-amber-700 dark:text-amber-400" /> Crédito / Fiar
                            </span>
                            {matchedCustomer ? (
                              <button
                                onClick={() => navigateToCustomerInCuentas(matchedCustomer.id)}
                                title={`Ver cuenta de ${matchedCustomer.nombre} en módulo Cuentas`}
                                className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900/80 px-2 py-0.5 rounded-md border border-amber-300/80 dark:border-amber-800 transition-colors cursor-pointer"
                              >
                                <span>Ver en Cuentas</span>
                                <ArrowUpRight className="w-3 h-3 text-amber-800 dark:text-amber-300" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setNewCustForm({ nombre: order.cliente, documento: '', telefono: '' });
                                  setShowQuickCustomerModal(true);
                                }}
                                title="Vincular / Registrar cliente en módulo Cuentas"
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                <UserPlus className="w-2.5 h-2.5" />
                                <span>Vincular Cuenta</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {order.metodoPago || 'EFECTIVO'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                          order.estado === 'PAGADO' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60' :
                          order.estado === 'CREDITO' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60' :
                          order.estado === 'CANCELADO' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' :
                          'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60'
                        }`}>
                          {order.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-display font-black text-slate-900 dark:text-white">
                        S/ {order.total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK REGISTER CUSTOMER MODAL */}
      <AnimatePresence>
        {showQuickCustomerModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/60">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                      Registrar Cliente en Cuentas
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Permite registrar fiados y controlar su saldo corriente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickCreateCustomerSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Nombre o Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustForm.nombre}
                    onChange={(e) => setNewCustForm({ ...newCustForm, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez / Empresa SAC"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      DNI / RUC
                    </label>
                    <input
                      type="text"
                      value={newCustForm.documento}
                      onChange={(e) => setNewCustForm({ ...newCustForm, documento: e.target.value })}
                      placeholder="8 o 11 dígitos"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={newCustForm.telefono}
                      onChange={(e) => setNewCustForm({ ...newCustForm, telefono: e.target.value })}
                      placeholder="987654321"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickCustomerModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase text-[10.5px] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newCustForm.nombre.trim()}
                    className="flex-[2] py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl font-bold uppercase text-[10.5px] tracking-wider transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Guardar y Seleccionar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CajaView;
