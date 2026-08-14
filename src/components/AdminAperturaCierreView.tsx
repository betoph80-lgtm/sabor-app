import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { 
  Wallet, Calendar, Download, AlertCircle, Check, Clock, Edit2, 
  Coins, ArrowUpRight, ShieldCheck, DollarSign, TrendingUp,
  FileSpreadsheet, User, RefreshCw, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase.ts';

export default function AdminAperturaCierreView() {
  const { 
    currentUser, orders, products, customers, mesas,
    selectedDate, isTodaySelected, cashControls, 
    openCash, closeCash, reopenCash, updateCashOpening, 
    currentCash 
  } = useApp();

  const [desdeDate, setDesdeDate] = useState<string>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const y = firstDay.getFullYear();
    const m = String(firstDay.getMonth() + 1).padStart(2, '0');
    const d = String(firstDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [hastaDate, setHastaDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [isExporting, setIsExporting] = useState(false);

  // Modal States
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('0');
  const [showEditOpenModal, setShowEditOpenModal] = useState(false);
  const [editOpeningAmount, setEditOpeningAmount] = useState('0');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [cashCounted, setCashCounted] = useState('');

  // Financial Metrics Calculation for Selected Date
  const financialMetrics = React.useMemo(() => {
    const allPaymentsToday = orders
      .filter(o => o.fecha === selectedDate)
      .flatMap(o => o.pagos || []);

    const totalEfectivoVentas = allPaymentsToday
      .filter(p => p.metodo === 'EFECTIVO')
      .reduce((acc, p) => acc + p.monto, 0);

    const totalYapeVentas = allPaymentsToday
      .filter(p => p.metodo === 'YAPE' || p.metodo === 'PLIN')
      .reduce((acc, p) => acc + p.monto, 0);

    const customerPaymentsTodayRaw = customers.flatMap(c => 
      c.historial
        .filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
        .map(t => ({ ...t, cliente: c.nombre }))
    );
    
    const totalEfectivoCobros = customerPaymentsTodayRaw
      .filter(t => t.metodoPago === 'EFECTIVO')
      .reduce((acc, t) => acc + t.monto, 0);
      
    const totalYapeCobros = customerPaymentsTodayRaw
      .filter(t => t.metodoPago === 'YAPE' || t.metodoPago === 'PLIN')
      .reduce((acc, t) => acc + t.monto, 0);

    const baseCaja = currentCash?.montoApertura || 0;
    
    const totalCajaGlobal = totalEfectivoVentas + totalYapeVentas + totalEfectivoCobros + totalYapeCobros + baseCaja;
    const totalCajaEfectivo = totalEfectivoVentas + totalEfectivoCobros + baseCaja;
    const totalYapeGlobal = totalYapeVentas + totalYapeCobros;

    const salesToday = orders.filter(o => o.fecha === selectedDate);
    const totalCreditoVendido = salesToday.filter(o => o.estado === 'CREDITO').reduce((acc, o) => acc + o.total, 0);

    return {
      allPaymentsToday,
      totalEfectivoVentas,
      totalYapeVentas,
      customerPaymentsTodayRaw,
      totalEfectivoCobros,
      totalYapeCobros,
      baseCaja,
      totalCajaGlobal,
      totalCajaEfectivo,
      totalYapeGlobal,
      totalCreditoVendido,
      salesTodayCount: salesToday.length,
      paidOrdersCount: salesToday.filter(o => o.estado === 'PAGADO').length,
      openOrdersCount: salesToday.filter(o => o.estado === 'ABIERTO').length,
      creditOrdersCount: salesToday.filter(o => o.estado === 'CREDITO').length
    };
  }, [orders, customers, currentCash, selectedDate]);

  const {
    totalEfectivoVentas,
    totalYapeVentas,
    totalEfectivoCobros,
    totalYapeCobros,
    baseCaja,
    totalCajaGlobal,
    totalCajaEfectivo,
    totalYapeGlobal,
    totalCreditoVendido,
    salesTodayCount,
    paidOrdersCount,
    openOrdersCount,
    creditOrdersCount
  } = financialMetrics;

  const exportFullDatabaseExcel = async () => {
    setIsExporting(true);
    try {
      const [ordersSnapshot, cashSnapshot] = await Promise.all([
        getDocs(collection(db, 'pedidos')),
        getDocs(collection(db, 'control_caja'))
      ]);

      const allOrders = ordersSnapshot.docs.map(doc => doc.data() as any);
      const allCashControls = cashSnapshot.docs.map(doc => doc.data() as any);

      const start = new Date(desdeDate + 'T00:00:00');
      const end = new Date(hastaDate + 'T23:59:59');

      const isDateInRange = (dateStr: string) => {
        if (!dateStr) return false;
        const [d, m, y] = dateStr.split('/').map(Number);
        const dObj = new Date(y, m - 1, d);
        return dObj >= start && dObj <= end;
      };

      const filteredOrders = allOrders.filter(o => isDateInRange(o.fecha));
      const filteredCash = allCashControls.filter(c => isDateInRange(c.fecha));

      const workbook = XLSX.utils.book_new();

      // 1. Detalle de Ventas (Row per item)
      const allSales = filteredOrders.flatMap(order => 
        (order.items || []).map((item: any) => {
          const product = products.find(p => p.id === item.productoId);
          return {
            'FECHA': order.fecha,
            'HORA': order.hora,
            'TICKET': order.id ? order.id.split('-').pop() : '',
            'MESA': order.mesaId === '13' ? 'PL' : (mesas.find(m => m.id === order.mesaId)?.nombre || order.mesaId),
            'CLIENTE': order.cliente,
            'USUARIO': order.usuarioNombre || 'Desconocido',
            'PRODUCTO': product?.nombre || 'Desconocido',
            'CANTIDAD': item.cantidad,
            'PRECIO UNIT.': item.precioUnitario || 0,
            'SUBTOTAL': item.cantidad * (item.precioUnitario || 0),
            'ESTADO PEDIDO': order.estado
          };
        })
      );
      const saleSheet = XLSX.utils.json_to_sheet(allSales);
      XLSX.utils.book_append_sheet(workbook, saleSheet, "Ventas Detalladas");

      // 2. Historial de Pagos
      const allPayments = filteredOrders.flatMap(order => 
        (order.pagos || []).map((p: any) => ({
          'FECHA': p.fecha,
          'HORA': p.hora,
          'PEDIDO ID': order.id ? order.id.split('-').pop() : '',
          'CLIENTE': order.cliente,
          'MONTO': p.monto,
          'METODO': p.metodo,
          'USUARIO': p.usuarioNombre || order.usuarioNombre || 'Desconocido',
          'ESTADO FINAL': order.estado
        }))
      );
      const paymentSheet = XLSX.utils.json_to_sheet(allPayments);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, "Historial Pagos");

      // 3. Control de Caja
      const cashSheet = XLSX.utils.json_to_sheet(filteredCash.map((c: any) => ({
        'FECHA': c.fecha,
        'ESTADO': c.estado,
        'APERTURA': c.montoApertura,
        'EFECTIVO': c.ingresosEfectivo,
        'YAPE': c.ingresosYape,
        'FIAR (CREDITOS)': c.ingresosFiar,
        'CIERRE TOTAL': c.montoCierre,
        'EFECTIVO FISICO': c.efectivoFisico !== undefined ? c.efectivoFisico : '-',
        'DIFERENCIA': c.diferencia !== undefined ? c.diferencia : '-',
        'H. APERTURA': c.horaApertura,
        'H. CIERRE': c.horaCierre || '-'
      })));
      XLSX.utils.book_append_sheet(workbook, cashSheet, "Control Diario Caja");

      // 4. Clientes y Saldos
      const clientSheet = XLSX.utils.json_to_sheet(customers.map(c => ({
         'NOMBRE/RAZON SOCIAL': c.nombre,
         'TELEFONO': c.telefono,
         'SALDO ACUMULADO': c.saldo,
         'TOTAL TRANSACCIONES': c.historial ? c.historial.length : 0
      })));
      XLSX.utils.book_append_sheet(workbook, clientSheet, "Base Clientes");

      // 5. Movimientos de Cuentas
      const movementsRanged = customers.flatMap(c => 
        (c.historial || [])
          .filter(t => isDateInRange(t.fecha))
          .map(t => ({
            'FECHA': t.fecha,
            'HORA': t.hora,
            'CLIENTE': c.nombre,
            'TIPO': t.tipo,
            'DESCRIPCION': t.descripcion,
            'METODO': t.metodoPago || '-',
            'MONTO': t.monto
          }))
      ).sort((a, b) => {
        const orderA = a.FECHA.split('/').reverse().join('') + a.HORA;
        const orderB = b.FECHA.split('/').reverse().join('') + a.HORA;
        return orderA.localeCompare(orderB);
      });
      
      const movementSheet = XLSX.utils.json_to_sheet(movementsRanged);
      XLSX.utils.book_append_sheet(workbook, movementSheet, "Movimientos Cuentas");

      // 6. Catalogo Productos
      const productSheet = XLSX.utils.json_to_sheet(products.map(p => ({
        'CATEGORIA': p.categoria,
        'PRODUCTO': p.nombre,
        'PRECIO': p.precio,
        'STOCK INICIAL': p.stockInicial || 0,
        'STOCK ACTUAL': p.stockActual || 0
      })));
      XLSX.utils.book_append_sheet(workbook, productSheet, "Catalogo Menu");

      const rangeString = `${desdeDate.split('-').reverse().join('-')}_al_${hastaDate.split('-').reverse().join('-')}`;
      XLSX.writeFile(workbook, `SaborAbanquino_Caja_${rangeString}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Hubo un error al descargar el archivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* Sub-module Header with Title and Range Export */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 md:p-8 rounded-[32px] border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
            <Wallet className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
              Apertura y Cierre de Caja
            </h1>
            <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
              Control de jornada diaria, arqueo de caja y auditoría • Fecha: {selectedDate}
            </p>
          </div>
        </div>

        {/* Date range filter & Full Excel Download */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl w-full lg:w-auto">
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="flex flex-col gap-1">
              <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest pl-1 select-none">DESDE</span>
              <div className="relative flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 h-[38px] hover:border-brand-300 transition-all cursor-pointer">
                <span className="text-[11px] font-sans font-black text-slate-900 select-none">
                  {(() => {
                    if (!desdeDate) return '';
                    const [y, m, d] = desdeDate.split('-');
                    return `${d}/${m}/${y}`;
                  })()}
                </span>
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
                <input 
                  type="date"
                  value={desdeDate}
                  onChange={(e) => setDesdeDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest pl-1 select-none">HASTA</span>
              <div className="relative flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 h-[38px] hover:border-brand-300 transition-all cursor-pointer">
                <span className="text-[11px] font-sans font-black text-slate-900 select-none">
                  {(() => {
                    if (!hastaDate) return '';
                    const [y, m, d] = hastaDate.split('-');
                    return `${d}/${m}/${y}`;
                  })()}
                </span>
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
                <input 
                  type="date"
                  value={hastaDate}
                  onChange={(e) => setHastaDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>
          </div>
          <button 
            onClick={exportFullDatabaseExcel}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-4.5 h-[38px] sm:mt-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-350 disabled:text-slate-400 text-white rounded-xl font-black uppercase text-[9.5px] tracking-wider transition-all active:scale-95 shadow-md shadow-emerald-100/50 group shrink-0 cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
            {isExporting ? 'Exportando...' : 'Descargar Excel'}
          </button>
        </div>
      </div>

      {/* Main Cash Status Banner */}
      {!currentCash && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
              <AlertCircle className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-xl md:text-2xl font-black text-rose-900 uppercase tracking-tight italic">
                  Caja Cerrada / Sin Apertura
                </h3>
              </div>
              <p className="text-rose-600/80 text-xs font-bold uppercase tracking-widest mt-1">
                Abre caja e ingresa el fondo base inicial para operar en {selectedDate}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowOpenModal(true)}
            className="w-full md:w-auto px-8 py-4.5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Abrir Caja de Hoy</span>
          </button>
        </div>
      )}

      {currentCash && currentCash.estado === 'ABIERTA' && (
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
              <Check className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xl md:text-2xl font-black text-emerald-900 uppercase tracking-tight">
                  Caja Abierta • {currentCash.horaApertura}
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  Monto Base: <span className="font-extrabold font-mono">S/ {currentCash.montoApertura.toFixed(2)}</span> | Fecha: {selectedDate}
                </p>
                <button
                  onClick={() => {
                    setEditOpeningAmount(currentCash.montoApertura.toString());
                    setShowEditOpenModal(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                  title="Editar monto base de apertura"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Editar Base</span>
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              setCashCounted(totalCajaEfectivo.toFixed(2));
              setShowCloseModal(true);
            }}
            className="w-full md:w-auto px-8 py-4.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Cerrar Caja Final</span>
          </button>
        </div>
      )}

      {currentCash && currentCash.estado === 'CERRADA' && currentCash.efectivoFisico !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 flex flex-col items-center text-center shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Efectivo Calculado en Sistema</p>
            <p className="font-display font-black text-slate-800 text-3xl tracking-tight">
              S/ {(currentCash.montoApertura + currentCash.ingresosEfectivo).toFixed(2)}
            </p>
            <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Base + Ventas y Cobros Efectivo</span>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-brand-200 flex flex-col items-center text-center shadow-sm ring-4 ring-brand-50/50">
            <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest mb-1.5">Efectivo Físico Contado</p>
            <p className="font-display font-black text-brand-700 text-3xl tracking-tight">
              S/ {currentCash.efectivoFisico.toFixed(2)}
            </p>
            <span className="text-[8px] font-bold text-brand-400 uppercase mt-1">Conteo reportado al cierre</span>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 flex flex-col items-center text-center shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diferencia de Cuadre</p>
            <p className={`font-display font-black text-3xl tracking-tight ${
              currentCash.diferencia === 0 ? 'text-slate-400' : currentCash.diferencia! > 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {currentCash.diferencia! > 0 ? '+' : ''}{currentCash.diferencia?.toFixed(2)}
            </p>
            <span className={`text-[8.5px] font-black uppercase mt-1 px-2.5 py-0.5 rounded-full ${
              currentCash.diferencia === 0 
                ? 'bg-slate-100 text-slate-600' 
                : currentCash.diferencia! > 0 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-rose-50 text-rose-700'
            }`}>
              {currentCash.diferencia === 0 ? 'Cuadre Perfecto' : currentCash.diferencia! > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
            </span>
          </div>
        </div>
      )}

      {currentCash && currentCash.estado === 'CERRADA' && (
        <div className="bg-slate-100 border-2 border-slate-200 rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-400 rounded-2xl flex items-center justify-center text-white shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-700 uppercase tracking-tight">
                Jornada Finalizada • Cerrada a las {currentCash.horaCierre || '-'}
              </h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                Monto de Cierre Total: S/ {currentCash.montoCierre.toFixed(2)} | Fecha: {selectedDate}
              </p>
            </div>
          </div>
          {isTodaySelected ? (
            <button 
              onClick={() => reopenCash()}
              className="flex items-center gap-2 px-6 py-3.5 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-100 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reabrir Caja para {selectedDate}</span>
            </button>
          ) : (
            <div className="px-6 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Registro Histórico Cerrado
            </div>
          )}
        </div>
      )}

      {/* Financial Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Caja Total */}
        <div className="bg-white p-5 md:p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-600">Caja Total</span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-400">S/</span>
            <span className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
              {totalCajaGlobal.toFixed(2)}
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">
            Efectivo + Yape + Fondo Base
          </p>
        </div>

        {/* Caja Real (Efectivo) */}
        <div className="bg-white p-5 md:p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">Caja Real (Efectivo)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-400">S/</span>
            <span className="text-3xl md:text-4xl font-display font-black text-emerald-700 tracking-tight">
              {totalCajaEfectivo.toFixed(2)}
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">
            Fondo Base (S/ {baseCaja.toFixed(2)}) + Efectivo
          </p>
        </div>

        {/* Total Yape / Plin */}
        <div className="bg-white p-5 md:p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-600">Total Yape / Plin</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-400">S/</span>
            <span className="text-3xl md:text-4xl font-display font-black text-purple-700 tracking-tight">
              {totalYapeGlobal.toFixed(2)}
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">
            Ventas y cobros electrónicos
          </p>
        </div>

        {/* Créditos y Fiar */}
        <div className="bg-white p-5 md:p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">Créditos / Fiados</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-400">S/</span>
            <span className="text-3xl md:text-4xl font-display font-black text-amber-700 tracking-tight">
              {totalCreditoVendido.toFixed(2)}
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">
            {creditOrdersCount} comandas pendientes de cobro
          </p>
        </div>
      </div>

      {/* Comandas Breakdown and Cash Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comandas Summary */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Composición de Comandas</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
              <span className="text-xs font-bold text-slate-600 uppercase">Órdenes Totales Creadas</span>
              <span className="font-display font-black text-slate-900 text-base">{salesTodayCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-800 uppercase">Órdenes Pagadas</span>
              <span className="font-display font-black text-emerald-700 text-base">{paidOrdersCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
              <span className="text-xs font-bold text-amber-800 uppercase">Órdenes al Crédito / Fiar</span>
              <span className="font-display font-black text-amber-700 text-base">{creditOrdersCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
              <span className="text-xs font-bold text-blue-800 uppercase">Órdenes Abiertas en Mesa</span>
              <span className="font-display font-black text-blue-700 text-base">{openOrdersCount}</span>
            </div>
          </div>
        </div>

        {/* Financial Flow Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Desglose Detallado de Ingresos de Hoy</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ingresos por Ventas de Comandas</p>
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Efectivo:</span>
                <span className="font-mono text-emerald-700">S/ {totalEfectivoVentas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Yape / Plin:</span>
                <span className="font-mono text-purple-700">S/ {totalYapeVentas.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobros y Abonos a Cuentas Clientes</p>
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Efectivo Cobrado:</span>
                <span className="font-mono text-emerald-700">S/ {totalEfectivoCobros.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Yape Cobrado:</span>
                <span className="font-mono text-purple-700">S/ {totalYapeCobros.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo en Caja Física Disponible</p>
              <p className="text-xs text-slate-300 font-medium">Efectivo total en gaveta (Base + Ventas + Cobros)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-display font-black text-emerald-400">
                S/ {totalCajaEfectivo.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Register of Cash Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            <span>Historial de Jornadas y Cajas Registradas</span>
          </h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {cashControls.length} Jornadas Registradas
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Base Apertura</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Efectivo</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Yape/Plin</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Físico Contado</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Diferencia</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Horarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {cashControls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400 uppercase text-xs font-bold">
                    No hay registros de control de caja
                  </td>
                </tr>
              ) : (
                cashControls.map((c) => (
                  <tr key={c.id || c.fecha} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      {c.fecha}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                        c.estado === 'ABIERTA' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-600">
                      S/ {c.montoApertura.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                      S/ {c.ingresosEfectivo.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-purple-700">
                      S/ {c.ingresosYape.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {c.efectivoFisico !== undefined ? `S/ ${c.efectivoFisico.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.diferencia !== undefined ? (
                        <span className={`font-mono font-bold text-xs ${
                          c.diferencia === 0 ? 'text-slate-400' : c.diferencia > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {c.diferencia > 0 ? '+' : ''}{c.diferencia.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-[10px] text-slate-500 font-mono">
                      {c.horaApertura} {c.horaCierre ? `• ${c.horaCierre}` : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Apertura de Caja */}
      <AnimatePresence>
        {showOpenModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-brand-100">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Apertura de Jornada</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.1em]">Ingresa el fondo inicial de caja</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-display font-bold text-slate-400">S/</span>
                  <input 
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] py-6 pl-16 pr-6 text-2xl font-display font-bold focus:border-brand-500 focus:bg-white outline-none transition-all text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                    value={openingAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setOpeningAmount(val);
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      const amount = parseFloat(openingAmount || '0');
                      if (isNaN(amount) || amount < 0) return;
                      openCash(amount);
                      setShowOpenModal(false);
                      setOpeningAmount('0');
                    }}
                    className="w-full py-5 bg-brand-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all active:scale-95 cursor-pointer"
                  >
                    Iniciar Operaciones
                  </button>
                  <button 
                    onClick={() => setShowOpenModal(false)}
                    className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Modificar Apertura / Base */}
      <AnimatePresence>
        {showEditOpenModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-brand-100">
                  <Coins className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Modificar Apertura</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.1em]">Actualiza el fondo inicial de caja</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-display font-bold text-slate-400">S/</span>
                  <input 
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] py-6 pl-16 pr-6 text-2xl font-display font-bold focus:border-brand-500 focus:bg-white outline-none transition-all text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0.00"
                    value={editOpeningAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setEditOpeningAmount(val);
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      const amount = parseFloat(editOpeningAmount || '0');
                      if (isNaN(amount) || amount < 0) {
                        alert('El monto no puede ser menor a 0.');
                        return;
                      }
                      await updateCashOpening(amount);
                      setShowEditOpenModal(false);
                    }}
                    className="w-full py-5 bg-brand-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all active:scale-95 cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                  <button 
                    onClick={() => setShowEditOpenModal(false)}
                    className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Cerrar Caja Final con Arqueo */}
      <AnimatePresence>
        {showCloseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-slate-100 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <Clock className="w-8 h-8 text-slate-800" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Cierre de Jornada</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.1em]">Ingresa el conteo de efectivo físico</p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Calculado en Sistema (Efectivo)</p>
                  <p className="text-2xl font-display font-bold text-slate-900 tracking-tight">S/ {totalCajaEfectivo.toFixed(2)}</p>
                  <p className="text-[7.5px] text-slate-400 font-bold uppercase mt-1">
                    Base: {baseCaja.toFixed(2)} + Ventas y Cobros Efectivo: {(totalEfectivoVentas + totalEfectivoCobros).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Efectivo Físico Contado</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">S/</span>
                    <input 
                      autoFocus
                      type="text"
                      inputMode="decimal"
                      className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 pl-10 pr-4 text-2xl font-display font-bold outline-none focus:bg-white focus:border-brand-500 transition-all text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={cashCounted}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setCashCounted(val);
                        }
                      }}
                    />
                  </div>
                </div>

                {Number(cashCounted) !== totalCajaEfectivo && Number(cashCounted) > 0 && (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${Number(cashCounted) > totalCajaEfectivo ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-[10px] font-bold uppercase tracking-tight leading-tight">
                      Diferencia: S/ {(Number(cashCounted) - totalCajaEfectivo).toFixed(2)} 
                      ({Number(cashCounted) > totalCajaEfectivo ? 'SOBRANTE' : 'FALTANTE'})
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setShowCloseModal(false)}
                  className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    closeCash(Number(cashCounted) || 0);
                    setShowCloseModal(false);
                  }}
                  className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95"
                >
                  Confirmar Cierre
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
