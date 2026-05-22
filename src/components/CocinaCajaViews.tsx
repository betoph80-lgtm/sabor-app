/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Check, Clock, Utensils, AlertCircle, Trash2, Search, X, Plus, Timer, User, Download, LayoutDashboard, Edit2, Lock, Coins, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderTimer } from './OrderTimer.tsx';
import { OrderModal } from './OrderModal.tsx';
import * as XLSX from 'xlsx';

export const CocinaView: React.FC = () => {
  const { orders, products, updateItemStatus, currentMenu, selectedDate, isTodaySelected, mesas } = useApp();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const itemsToPrepare = orders
    .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
    .flatMap(order => {
      const seconds = order.items.filter(i => {
        const p = products.find(prod => prod.id === i.productoId);
        return p?.tipo === 'SEGUNDO';
      });
      const hasPendingSeconds = seconds.some(i => i.estado !== 'SERVIDO');
      const hasNoSeconds = seconds.length === 0;

      return order.items.map(item => ({ 
        ...item, 
        orderId: order.id, 
        mesaId: order.mesaId,
        usuarioNombre: order.usuarioNombre,
        timestamp: order.timestamp,
        hasPendingSeconds,
        hasNoSeconds
      }));
    })
    .filter(item => {
      const product = products.find(p => p.id === item.productoId);
      const isSoup = product?.tipo === 'SOPA';

      if (item.estado !== 'SERVIDO') return true;
      
      // Keep served soup if there are pending seconds OR no seconds have been ordered yet
      return isSoup && (item.hasPendingSeconds || item.hasNoSeconds);
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Filter main dishes and soup from current menu to show stock
  const menuStock = currentMenu
    .filter(m => m.fecha === selectedDate)
    .map(item => {
      const product = products.find(p => p.id === item.productoId);
      return { 
        id: item.id,
        nombre: product?.nombre || 'Desconocido',
        tipo: product?.tipo,
        stockActual: item.stockActual,
        stockInicial: item.stockInicial
      };
    })
    .filter(item => item.tipo === 'SEGUNDO' || item.tipo === 'SOPA')
    .sort((a, b) => {
      if (a.tipo === 'SOPA' && b.tipo !== 'SOPA') return -1;
      if (a.tipo !== 'SOPA' && b.tipo === 'SOPA') return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  if (itemsToPrepare.length === 0 && menuStock.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-300 gap-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
           <Utensils className="w-10 h-10 opacity-20" />
        </div>
        <p className="font-bold uppercase tracking-widest text-xs">Cocina despejada</p>
      </div>
    );
  }

  const summary = itemsToPrepare
    .filter(item => item.estado !== 'SERVIDO')
    .reduce((acc, item) => {
      const name = products.find(p => p.id === item.productoId)?.nombre || 'Desconocido';
      acc[name] = (acc[name] || 0) + item.cantidad;
      return acc;
    }, {} as Record<string, number>);

  // Group by Mesa but keep order ID in mind
  const itemsByMesa = itemsToPrepare.reduce((acc, item) => {
    const key = `${item.mesaId}-${item.orderId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as {[key: string]: any[]});

  // Sort groups by timestamp ascending
  const sortedMesaKeys = Object.keys(itemsByMesa).sort((a, b) => {
    const timestampA = itemsByMesa[a][0].timestamp || 0;
    const timestampB = itemsByMesa[b][0].timestamp || 0;
    return timestampA - timestampB;
  });

  return (
    <div className="p-2 md:p-6 space-y-3 md:space-y-4 max-w-[1600px] mx-auto">
      {/* Metrics Bar Compact */}
      <div className="flex flex-col xl:flex-row gap-2 md:gap-3">
        <div className="flex-1 bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border border-slate-100 soft-shadow flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest border-b md:border-b-0 md:border-r border-slate-100 pb-1.5 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <div className="w-1 h-1 rounded-full bg-brand-500" />
             Stock Crítico
          </div>
          <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar">
            {menuStock.map(item => (
              <div key={item.id} className="flex items-baseline gap-1.5 md:gap-2 shrink-0">
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[70px] md:max-w-[80px]">{item.nombre}</span>
                <span className={`text-base md:text-lg font-display font-bold ${item.stockActual < 5 ? 'text-rose-500' : 'text-slate-800'}`}>
                  {item.stockActual}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl md:rounded-2xl p-3 md:p-4 text-white shadow-lg flex flex-col md:flex-row md:items-center gap-3 md:gap-4 min-w-fit">
          <div className="text-[8px] md:text-[9px] font-black text-brand-400 uppercase tracking-widest border-b md:border-b-0 md:border-r border-white/10 pb-1.5 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" /> Hoy
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {Object.entries(summary).map(([name, qty]) => (
              <div key={name} className="flex items-baseline gap-1 shrink-0">
                <span className="text-base md:text-lg font-display font-bold text-brand-400 leading-none">{qty}</span>
                <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-tight text-slate-300 leading-none">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preparation Count Floating Style */}
      <div className="flex justify-end pr-2">
        <span className="bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest soft-shadow">
          {itemsToPrepare.length} Items en Proceso
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sortedMesaKeys.map((key) => {
          const items = itemsByMesa[key];
          const mesaId = items[0].mesaId;
          const orderTimestamp = items[0].timestamp || Date.now();
          const elapsedMinutes = Math.floor((Date.now() - orderTimestamp) / 60000);
          
          const orderId = items[0].orderId;
          const fullOrder = orders.find(o => o.id === orderId);

          // "Falta Segundo" alert check
          const totalSoupItems = fullOrder?.items.filter(i => {
            const p = products.find(prod => prod.id === i.productoId);
            return p?.tipo === 'SOPA';
          }) || [];
          
          const totalSecondItems = fullOrder?.items.filter(i => {
            const p = products.find(prod => prod.id === i.productoId);
            return p?.tipo === 'SEGUNDO';
          }) || [];

          const hasSoup = totalSoupItems.length > 0;
          const hasNoSecondsOrderedYet = totalSecondItems.length === 0;
          const isOnlySoupAndNoSeconds = hasSoup && hasNoSecondsOrderedYet;

          // Find if there's any soup item marked as SERVIDO ("Listo")
          const servedSoup = totalSoupItems.find(i => i.estado === 'SERVIDO');
          const isSoupServed = !!servedSoup;

          let isFaltaSegundoAlert = false;
          let elapsedMsSinceSoupListo = 0;
          let minutesSinceSoupListo = 0;
          let secondsSinceSoupListo = 0;

          if (isOnlySoupAndNoSeconds && isSoupServed && servedSoup) {
            const baseTime = servedSoup.timestampServido || servedSoup.timestampPedido || fullOrder?.timestamp || orderTimestamp;
            elapsedMsSinceSoupListo = now - baseTime;
            minutesSinceSoupListo = Math.floor(elapsedMsSinceSoupListo / 60000);
            secondsSinceSoupListo = Math.floor((elapsedMsSinceSoupListo % 60000) / 1000);

            // Warning is red after 10 minutes (600,000 ms) of marked "Listo"
            isFaltaSegundoAlert = elapsedMsSinceSoupListo >= 600000;
          }

          let headerColorClass = 'bg-brand-600';
          let textColorClass = 'text-brand-100';
          
          if (elapsedMinutes >= 20) {
            headerColorClass = 'bg-rose-600';
            textColorClass = 'text-rose-50';
          } else if (elapsedMinutes >= 10) {
            headerColorClass = 'bg-amber-600';
            textColorClass = 'text-amber-50';
          }

          return (
            <div 
              key={key} 
              className={`bg-white rounded-[32px] md:rounded-[40px] border shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
                isFaltaSegundoAlert
                  ? 'border-rose-500 ring-2 ring-rose-200 shadow-[0_4px_24px_rgba(239,68,68,0.12)]'
                  : (elapsedMinutes >= 20 ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-200')
              }`}
            >
            <div className={`${headerColorClass} px-4 md:px-5 py-3 md:py-4 flex justify-between items-center text-white relative transition-colors duration-500`}>
               <div className="absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full blur-2xl -translate-y-8 translate-x-8" />
               <div className="flex flex-col relative z-10">
                  <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] ${textColorClass} leading-none mb-1 md:mb-1.5`}>
                    #{items[0].orderId.split('-').pop()} • Ticket
                  </span>
                  <h3 className="text-lg md:text-xl font-display font-bold leading-none">
                    {mesaId === '13' ? 'PARA LLEVAR' : (mesas.find(m => m.id === mesaId)?.nombre.toUpperCase() || `MESA ${mesaId}`)}
                  </h3>
                  <p className={`text-[7px] md:text-[8px] font-bold uppercase tracking-widest mt-1 ${textColorClass} opacity-80`}>Por: {items[0].usuarioNombre || 'Desconocido'}</p>
               </div>
               <div className="flex flex-col items-end gap-1 md:gap-2 relative z-10">
                  <OrderTimer timestamp={orderTimestamp} className="text-base md:text-lg" />
                  <p className="text-[7px] md:text-[8px] font-mono font-bold uppercase tracking-widest tabular-nums px-1.5 py-0.5 bg-black/20 rounded-md md:rounded-lg backdrop-blur-sm border border-white/5">A las {items[0].horaPedido}</p>
               </div>
            </div>

            <div className="p-3 md:p-4 space-y-2 md:space-y-3 flex-1 overflow-auto">
              {/* Alerta de Falta Segundo */}
              {isOnlySoupAndNoSeconds && isSoupServed && (
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                  isFaltaSegundoAlert 
                    ? 'bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-200 animate-pulse' 
                    : 'bg-amber-50 border-amber-200 text-amber-900 border-dashed'
                }`}>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-sm">⚠️</span>
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isFaltaSegundoAlert ? '¡FALTA SEGUNDO!' : 'Sopa Servida (Esperando Segundo)'}
                    </span>
                  </div>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isFaltaSegundoAlert ? 'text-rose-100' : 'text-amber-600'}`}>
                    Sopa lista hace: {minutesSinceSoupListo}m {secondsSinceSoupListo}s
                  </p>
                </div>
              )}
              {/* Items already served for this mesa in this order */}
              {(() => {
                const orderId = items[0].orderId;
                const servedItems = orders.find(o => o.id === orderId && o.fecha === selectedDate)?.items.filter(i => i.estado === 'SERVIDO') || [];
                if (servedItems.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-50">
                    {servedItems.map(si => {
                      const p = products.find(prod => prod.id === si.productoId);
                      return (
                        <div key={si.id} className="px-2 py-0.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-1 opacity-60">
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">{si.cantidad}x {p?.nombre}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="space-y-1">
                {items
                  .filter(item => item.estado !== 'SERVIDO')
                  .map((item) => {
                  const product = products.find(p => p.id === item.productoId);
                  const isSoup = product?.tipo === 'SOPA';
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between group py-1 border-b border-slate-50 last:border-0 pb-1.5 last:pb-0.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
                          isSoup ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-brand-50 text-brand-600 border border-brand-100'
                        }`}>
                          {item.cantidad}
                        </div>
                        <div className="flex flex-col">
                           <div className="flex items-center gap-1.5 flex-wrap">
                             <p className="font-bold text-slate-800 uppercase tracking-tight leading-tight text-[13px]">{product?.nombre}</p>
                             {item.estado !== 'SERVIDO' && item.timestampPedido && (
                               <OrderTimer 
                                 timestamp={item.timestampPedido} 
                                 hideIcon
                                 className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-md text-white text-[9.5px] font-mono font-bold leading-none shrink-0"
                               />
                             )}
                           </div>
                           <p className={`text-[8.5px] font-bold uppercase tracking-widest mt-0.5 ${isSoup ? 'text-violet-400' : 'text-slate-400'} leading-none`}>
                              {isSoup ? 'Entrada/Sopa' : (item.notas ? `⚠️ NOTA: ${item.notas.toUpperCase()}` : (product?.categoria === 'MENÚ' ? 'Plato Fondo' : product?.categoria))}
                           </p>
                        </div>
                      </div>

                      {item.estado === 'SERVIDO' ? (
                        <div className="text-emerald-500 p-2">
                          <Check className="w-5 h-5" />
                        </div>
                      ) : (
                        <button
                          onClick={() => updateItemStatus(item.orderId, item.id, 'SERVIDO')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-100 flex items-center gap-2"
                        >
                          Listo
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
};

export const CajaView: React.FC = () => {
  const { currentUser, orders, payOrder, resetStock, products, customers, deleteOrder, setOrders, requestConfirmation, selectedDate, isTodaySelected, cashControls, openCash, closeCash, reopenCash, currentCash, addItemsToOrder, updateOrderInfo, updateWholeOrder, currentMenu, mesas } = useApp();
  const [selectingCustomerFor, setSelectingCustomerFor] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [efectivoModalFor, setEfectivoModalFor] = useState<{
    id: string;
    cliente: string;
    total: number;
    balance: number;
    defaultMonto: number;
  } | null>(null);
  const [efectivoMontoAPagar, setEfectivoMontoAPagar] = useState('');
  const [efectivoDineroRecibido, setEfectivoDineroRecibido] = useState('');

  const isCashClosed = cashControls.find(c => c.fecha === selectedDate)?.estado === 'CERRADA';
  const [customerSearch, setCustomerSearch] = useState('');
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('0');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [cashCounted, setCashCounted] = useState('');

  const openOrders = [...orders]
    .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate && o.total > 0 && o.items.every(i => i.estado === 'SERVIDO'))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const allPaymentsToday = orders
    .filter(o => o.fecha === selectedDate)
    .flatMap(o => o.pagos || []);

  const totalEfectivoVentas = allPaymentsToday
    .filter(p => p.metodo === 'EFECTIVO')
    .reduce((acc, p) => acc + p.monto, 0);

  const totalYapeVentas = allPaymentsToday
    .filter(p => p.metodo === 'YAPE')
    .reduce((acc, p) => acc + p.monto, 0);

  // Calcular cobros a clientes hoy (Depósitos y Pagos de crédito)
  const customerPaymentsTodayRaw = customers.flatMap(c => 
    c.historial
      .filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
      .map(t => ({ ...t, cliente: c.nombre }))
  );
  
  const totalEfectivoCobros = customerPaymentsTodayRaw
    .filter(t => t.metodoPago === 'EFECTIVO')
    .reduce((acc, t) => acc + t.monto, 0);
    
  const totalYapeCobros = customerPaymentsTodayRaw
    .filter(t => t.metodoPago === 'YAPE')
    .reduce((acc, t) => acc + t.monto, 0);

  const baseCaja = currentCash?.montoApertura || 0;
  
  // CAJA TOTAL = (Efectivo Ventas + Efectivo Cobros) + (Yape Ventas + Yape Cobros) + Base
  const totalCajaGlobal = totalEfectivoVentas + totalYapeVentas + totalEfectivoCobros + totalYapeCobros + baseCaja;
  
  // CAJA REAL (Efectivo) = (Efectivo Ventas + Efectivo Cobros) + Base
  const totalCajaEfectivo = totalEfectivoVentas + totalEfectivoCobros + baseCaja;

  const exportFullDatabaseExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Detalle de Ventas (Row per item)
    const allSales = orders.flatMap(order => 
      order.items.map(item => {
        const product = products.find(p => p.id === item.productoId);
        return {
          'FECHA': order.fecha,
          'HORA': order.hora,
          'TICKET': order.id.split('-').pop(),
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
    const allPayments = orders.flatMap(order => 
      (order.pagos || []).map(p => ({
        'FECHA': p.fecha,
        'HORA': p.hora,
        'PEDIDO ID': order.id.split('-').pop(),
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
    const cashSheet = XLSX.utils.json_to_sheet(cashControls.map(c => ({
      'FECHA': c.fecha,
      'ESTADO': c.estado,
      'APERTURA': c.montoApertura,
      'EFECTIVO': c.ingresosEfectivo,
      'YAPE': c.ingresosYape,
      'FIAR (CREDITOS)': c.ingresosFiar,
      'CIERRE TOTAL': c.montoCierre,
      'H. APERTURA': c.horaApertura,
      'H. CIERRE': c.horaCierre || '-'
    })));
    XLSX.utils.book_append_sheet(workbook, cashSheet, "Control Diario Caja");

    // 4. Clientes y Saldos
    const clientSheet = XLSX.utils.json_to_sheet(customers.map(c => ({
       'NOMBRE/RAZON SOCIAL': c.nombre,
       'TELEFONO': c.telefono,
       'SALDO ACUMULADO': c.saldo,
       'TOTAL TRANSACCIONES': c.historial.length
    })));
    XLSX.utils.book_append_sheet(workbook, clientSheet, "Base Clientes");

    // 5. Movimientos de Cuentas (Solo hoy)
    const movementsToday = customers.flatMap(c => 
      c.historial
        .filter(t => t.fecha === selectedDate)
        .map(t => ({
          'FECHA': t.fecha,
          'HORA': t.hora,
          'CLIENTE': c.nombre,
          'TIPO': t.tipo,
          'DESCRIPCION': t.descripcion,
          'METODO': t.metodoPago || '-',
          'MONTO': t.monto
        }))
    ).sort((a, b) => a.HORA.localeCompare(b.HORA));
    
    const movementSheet = XLSX.utils.json_to_sheet(movementsToday);
    XLSX.utils.book_append_sheet(workbook, movementSheet, "Movimientos Cuentas");

    // 6. Menu/Productos
    const productSheet = XLSX.utils.json_to_sheet(products.map(p => ({
      'CATEGORIA': p.categoria,
      'PRODUCTO': p.nombre,
      'PRECIO': p.precio,
      'STOCK INICIAL': p.stockInicial,
      'STOCK ACTUAL': p.stockActual
    })));
    XLSX.utils.book_append_sheet(workbook, productSheet, "Catalogo Menu");

    XLSX.writeFile(workbook, `SaborAbanquino_DB_Full_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Order summary for the table (all orders today)
  const orderSummary = [...orders]
    .filter(o => o.fecha === selectedDate)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  const getMesaNumber = (mesaId: string) => {
    const found = mesas.find(m => m.id === mesaId);
    const name = found ? found.nombre : mesaId;
    const numOnly = name.replace(/\D/g, '');
    return numOnly ? numOnly.padStart(2, '0') : name;
  };

  const getMetodoBadgeStyle = (metodo: string) => {
    const m = metodo.toUpperCase();
    if (m === 'YAPE') return 'text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100/50';
    if (m === 'EFECTIVO') return 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50';
    if (m === 'CREDITO') return 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100/50';
    return 'text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-150';
  };

  const orderToEdit = orders.find(o => o.id === editingOrderId);

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
       {editingOrderId && orderToEdit && (
        <OrderModal
          onClose={() => setEditingOrderId(null)}
          onAdd={() => {}}
          onSaveEdit={async (qtys, notes, newClienteName, newMesaId) => {
            await updateWholeOrder(editingOrderId, newMesaId, newClienteName, qtys, notes);
            setEditingOrderId(null);
          }}
          products={products}
          currentMenu={currentMenu.filter(m => m.fecha === selectedDate)}
          mesaId={orderToEdit.mesaId}
          mesaName={mesas.find(m => m.id === orderToEdit.mesaId)?.nombre || orderToEdit.mesaId}
          initialClienteName={orderToEdit.cliente}
          mesas={mesas}
          initialItems={orderToEdit.items}
          title="Modificar Pedido en Caja"
        />
      )}
      {/* Control de Jornada Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white/50 p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-100 mb-1 md:mb-2">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-50 rounded-xl md:rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
            <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Caja Central</h1>
            <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Gestión de ingresos</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={exportFullDatabaseExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.1em] hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100/50 group"
          >
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Descargar Excel Completo
          </button>
        </div>
      </div>

      {/* Caja Status Banner */}
      {!currentCash && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl md:rounded-[32px] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 soft-shadow-sm">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-rose-600 rounded-xl md:rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
              <AlertCircle className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-rose-900 uppercase tracking-tight italic">Caja Cerrada</h3>
              <p className="text-rose-600/70 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Abre caja para operar en {selectedDate}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowOpenModal(true)}
            className="w-full md:w-auto px-6 md:px-10 py-4 md:py-5 bg-rose-600 text-white rounded-xl md:rounded-[22px] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
          >
            Abrir Caja
          </button>
        </div>
      )}

      {currentCash && currentCash.estado === 'ABIERTA' && (
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[32px] p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 soft-shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-900 uppercase tracking-tight">Caja Abierta • {currentCash.horaApertura}</h3>
              <p className="text-emerald-600/70 text-[9px] font-bold uppercase tracking-widest">Base: S/ {currentCash.montoApertura.toFixed(2)} | Fecha: {selectedDate}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setCashCounted(totalCajaEfectivo.toFixed(2));
              setShowCloseModal(true);
            }}
            className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all active:scale-95"
          >
            Cerrar Caja Final
          </button>
        </div>
      )}

      {currentCash && currentCash.estado === 'CERRADA' && currentCash.efectivoFisico !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2 animate-in fade-in slide-in-from-top-2 duration-700">
          <div className="bg-white p-5 rounded-2xl md:rounded-[32px] border border-slate-100 flex flex-col items-center text-center soft-shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Efectivo Sistema</p>
            <p className="font-display font-bold text-slate-700 text-2xl tracking-tighter">S/ {(currentCash.montoApertura + currentCash.ingresosEfectivo).toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl md:rounded-[32px] border border-brand-100 flex flex-col items-center text-center soft-shadow-sm ring-4 ring-brand-50/30">
            <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest mb-1.5">Efectivo Físico</p>
            <p className="font-display font-bold text-brand-600 text-2xl tracking-tighter">S/ {currentCash.efectivoFisico.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl md:rounded-[32px] border border-slate-100 flex flex-col items-center text-center soft-shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diferencia Auditores</p>
            <p className={`font-display font-bold text-2xl tracking-tighter ${currentCash.diferencia === 0 ? 'text-slate-400' : currentCash.diferencia! > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {currentCash.diferencia! > 0 ? '+' : ''}{currentCash.diferencia?.toFixed(2)}
            </p>
            <span className="text-[6px] font-bold text-slate-400 uppercase mt-1">
              {currentCash.diferencia === 0 ? 'Cuadre Perfecto' : currentCash.diferencia! > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
            </span>
          </div>
        </div>
      )}

      {currentCash && currentCash.estado === 'CERRADA' && (
        <div className="bg-slate-100 border-2 border-slate-200 rounded-[32px] p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 soft-shadow-sm grayscale">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-400 rounded-2xl flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-600 uppercase tracking-tight">Jornada Finalizada • {currentCash.horaCierre}</h3>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Cierre: S/ {currentCash.montoCierre.toFixed(2)} | Fecha: {selectedDate}</p>
            </div>
          </div>
          {isTodaySelected && currentUser?.role === 'ADMIN' ? (
            <button 
              onClick={() => reopenCash()}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-100"
            >
              Reabrir Caja para {selectedDate}
            </button>
          ) : isTodaySelected ? (
            <div className="px-6 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Registro Cerrado
            </div>
          ) : (
            <div className="px-6 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Registro Histórico
            </div>
          )}
        </div>
      )}

      {/* Daily Summary Compact */}
      <div className="flex flex-col xl:flex-row gap-3 md:gap-4 opacity-100 transition-opacity">
        <div className={`flex-1 bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 soft-shadow flex flex-col md:flex-row md:items-center gap-4 md:gap-6 relative overflow-hidden ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <div className="absolute top-0 left-0 w-20 h-20 md:w-24 md:h-24 bg-brand-50 rounded-full blur-2xl -translate-y-8 -translate-x-8" />
          <div className="shrink-0 relative z-10">
            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-brand-600 mb-0.5 md:mb-1">Caja Total</p>
            <div className="flex items-baseline gap-1 md:gap-1.5">
              <span className="text-lg md:text-xl font-display font-bold text-brand-600">S/</span>
              <span className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tighter">{totalCajaGlobal.toFixed(2)}</span>
            </div>
            <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Efectivo + Yape + Base</p>
          </div>
          
          <div className="h-px md:h-10 w-full md:w-px bg-slate-100 shrink-0" />

          <div className="flex flex-wrap items-center gap-4 md:gap-8 relative z-10 flex-1">
            <div className="flex flex-col">
              <p className="text-[7px] md:text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Caja Real (Efectivo)</p>
              <p className="font-display font-bold text-slate-900 text-xl md:text-2xl italic tracking-tighter">S/ {totalCajaEfectivo.toFixed(2)}</p>
              <p className="text-[6px] text-slate-400 font-bold uppercase">Solo Efectivo + Base</p>
            </div>
            <div className="flex flex-col opacity-60">
              <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Yape</p>
              <p className="font-display font-bold text-slate-800 text-base md:text-lg">S/ {(totalYapeVentas + totalYapeCobros).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className={`xl:w-[400px] bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-200 flex flex-col soft-shadow-sm max-h-[140px] md:max-h-[160px] ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 md:mb-3">Flujo Reciente</p>
          <div className="space-y-1.5 md:space-y-2 overflow-y-auto no-scrollbar">
            {customerPaymentsTodayRaw.length === 0 ? (
              <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase py-1">Sin actividad</p>
            ) : (
              customerPaymentsTodayRaw.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/50 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl border border-white transition-colors">
                  <div className="flex flex-col">
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-700 truncate max-w-[120px] md:max-w-[150px] uppercase">{t.cliente}</p>
                    <span className="text-[6px] text-slate-400 font-black uppercase tracking-tighter">{t.metodoPago} • {t.hora}</span>
                  </div>
                  <p className="text-[10px] md:text-[11px] font-display font-bold text-emerald-600">+S/ {t.monto.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {currentCash && currentCash.estado === 'CERRADA' && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500 mb-6 grayscale-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-100 rounded-[22px] flex items-center justify-center text-amber-600 shadow-sm">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-display font-bold text-amber-900 uppercase tracking-tight text-lg mb-1">Caja Cerrada</h3>
              <p className="text-amber-700 text-xs font-medium leading-relaxed max-w-sm">La jornada ha finalizado. No se permiten más cobros ni modificaciones de pedidos para esta fecha.</p>
            </div>
          </div>
          {isTodaySelected && currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => reopenCash()}
              className="px-8 py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all active:scale-95 shadow-lg shadow-amber-200/50"
            >
              Reabrir Caja
            </button>
          )}
        </div>
      )}

      <div className={`space-y-4 ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cobros Pendientes</h2>
          </div>
          <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-brand-100">
            {openOrders.length} por liquidar
          </span>
        </div>

        {openOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3 bg-white rounded-3xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Caja al día</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {openOrders.map((order) => {
              const isReadyToPay = order.items.every(i => i.estado === 'SERVIDO');
              const totalPaid = (order.pagos || []).reduce((acc, p) => acc + p.monto, 0);
              const balance = Math.max(0, order.total - totalPaid);

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-[24px] p-3 md:p-4 shadow-sm border transition-all duration-300 relative overflow-hidden ${
                    isReadyToPay 
                      ? 'border-emerald-200 ring-4 ring-emerald-100/10 shadow-lg' 
                      : 'border-slate-100'
                  } flex flex-col sm:flex-row gap-3 lg:flex-col xl:flex-row`}
                >
                  {/* Visual Status Indicator */}
                  {!isReadyToPay && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200" />
                  )}
                  {isReadyToPay && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  )}

                  {/* Order Info & Total */}
                  <div className="flex flex-col justify-between gap-2 min-w-[130px] shrink-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-[0.15em]">
                          #{order.id.split('-').pop()}
                        </span>
                        {isReadyToPay ? (
                          <span className="text-[7px] font-black text-emerald-600 uppercase">Listo</span>
                        ) : (
                          <span className="text-[7px] font-black text-amber-500 uppercase">Cocina</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                         <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 shrink-0">
                            <span className={`font-display font-bold text-brand-600 ${order.mesaId === '13' ? 'text-[7px] leading-tight px-0.5 text-center' : 'text-xs'}`}>
                              {order.mesaId === '13' ? 'Para Llevar' : (mesas.find(m => m.id === order.mesaId)?.nombre.replace(/mesa\s+/i, '') || order.mesaId)}
                            </span>
                         </div>
                         <div className="flex flex-col min-w-0">
                            <h3 className="font-display font-bold text-slate-900 text-sm uppercase leading-tight truncate max-w-[110px]">{order.cliente}</h3>
                            <p className="text-[7px] font-black text-brand-500 uppercase tracking-widest leading-none my-0.5">Mesero: {order.usuarioNombre || 'Desconocido'}</p>
                            <button 
                              onClick={() => {
                                if (isCashClosed) return;
                                setEditingOrderId(order.id);
                              }}
                              disabled={isCashClosed}
                              className={`flex items-center gap-0.5 text-[7px] font-black text-brand-600 uppercase hover:text-brand-700 transition-colors ${
                                isCashClosed ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <Edit2 className="w-2 h-2" /> Editar
                            </button>
                         </div>
                      </div>
                    </div>

                    <div>
                       <div className="flex justify-between items-end mb-0.5">
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Total: S/ {order.total.toFixed(2)}</p>
                         {totalPaid > 0 && <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Pagado: S/ {totalPaid.toFixed(2)}</p>}
                       </div>
                       <div className="flex items-baseline gap-1">
                          <span className="text-sm font-display font-bold text-emerald-600">S/</span>
                          <p className="text-2xl font-display font-bold text-slate-900 tracking-tighter leading-none">
                            {balance.toFixed(2)}
                          </p>
                       </div>
                       <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Saldo Pendiente</p>
                    </div>
                  </div>

                  {/* Compact Detail Panel */}
                  <div className="flex-1 bg-slate-50/50 rounded-xl p-2 border border-slate-100 flex flex-col min-h-[70px]">
                    <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        Consumo • {order.items.length} Platos
                      </p>
                      
                      {/* Historial de pagos parciales */}
                      <div className="flex gap-1 overflow-x-auto no-scrollbar ml-2">
                        {(order.pagos || []).map((p, i) => (
                          <span key={p.id} className="text-[6px] font-black bg-white border border-slate-200 px-1 py-0.5 rounded-md text-slate-500 uppercase whitespace-nowrap">
                            {p.metodo === 'EFECTIVO' ? 'EF' : p.metodo === 'YAPE' ? 'YP' : 'FI'}: {p.monto.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-0.5 overflow-y-auto max-h-[100px] pr-1.5 no-scrollbar">
                      {order.items.map((item) => {
                        const p = products.find(prod => prod.id === item.productoId);
                        return (
                          <div key={item.id} className="flex justify-between items-center text-[8px] py-[1px]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 rounded-md bg-white shadow-sm flex items-center justify-center text-[7px] font-black text-slate-500 shrink-0">{item.cantidad}</span>
                              <span className="font-bold text-slate-700 uppercase tracking-tight truncate max-w-[90px]">
                                {p?.nombre}
                              </span>
                            </div>
                            <span className="font-mono text-slate-400 text-[8px] tabular-nums">
                              {(item.cantidad * item.precioUnitario).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Highly Compact Actions */}
                  <div className="flex flex-col gap-1 min-w-[140px] justify-center">
                    <div className="flex flex-col gap-0.5 px-0.5">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Monto a pagar</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">S/</span>
                        <input 
                          type="number"
                          step="0.1"
                          placeholder="0.00"
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg py-0.5 pl-5 pr-2 text-[11px] font-bold outline-none focus:border-brand-400 focus:bg-white transition-all"
                          value={partialAmounts[order.id] ?? balance.toFixed(2)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setPartialAmounts(prev => ({ ...prev, [order.id]: '' }));
                              return;
                            }
                            const numVal = parseFloat(val);
                            if (numVal > balance) {
                              setPartialAmounts(prev => ({ ...prev, [order.id]: balance.toFixed(2) }));
                            } else {
                              setPartialAmounts(prev => ({ ...prev, [order.id]: val }));
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          const amount = parseFloat(partialAmounts[order.id] || balance.toString());
                          if (amount > 0) {
                            const finalAmount = Math.min(amount, balance);
                            setEfectivoModalFor({
                              id: order.id,
                              cliente: order.cliente,
                              total: order.total,
                              balance: balance,
                              defaultMonto: finalAmount
                            });
                            setEfectivoMontoAPagar(finalAmount.toFixed(2));
                            setEfectivoDineroRecibido('');
                          }
                        }}
                        disabled={!isReadyToPay}
                        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl transition-all active:scale-95 border-2 ${
                          isReadyToPay 
                            ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600' 
                            : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-[8px] font-black uppercase tracking-[0.1em]">Efectivo</span>
                        <Check className="w-2.5 h-2.5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          const amount = parseFloat(partialAmounts[order.id] || balance.toString());
                          if (amount > 0) {
                            const finalAmount = Math.min(amount, balance);
                            payOrder(order.id, 'YAPE', finalAmount);
                            setPartialAmounts(prev => {
                              const next = { ...prev };
                              delete next[order.id];
                              return next;
                            });
                          }
                        }}
                        disabled={!isReadyToPay}
                        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl transition-all active:scale-95 border-2 ${
                          isReadyToPay 
                            ? 'bg-brand-600 border-brand-500 text-white hover:bg-brand-700' 
                            : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-[8px] font-black uppercase tracking-[0.1em]">Yape</span>
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectingCustomerFor(order.id)}
                      disabled={!isReadyToPay}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl transition-all border-2 text-[8px] font-black uppercase tracking-widest ${
                        isReadyToPay 
                          ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' 
                          : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      Fiar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden p-8 space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-[24px] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Cierre de Auditoría</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">Compara el total calculado en sistema con el efectivo físico que tienes en caja.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Calculado en Sistema (Efectivo)</p>
                <p className="text-2xl font-display font-bold text-slate-900 tracking-tight">S/ {totalCajaEfectivo.toFixed(2)}</p>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Base: {baseCaja.toFixed(2)} + Ventas: {(totalEfectivoVentas + totalEfectivoCobros).toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Efectivo Físico Contado</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">S/</span>
                  <input 
                    autoFocus
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 pl-10 pr-4 text-2xl font-display font-bold outline-none focus:bg-white focus:border-brand-500 transition-all text-slate-800"
                    value={cashCounted}
                    onChange={(e) => setCashCounted(e.target.value)}
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

      {showOpenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
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
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] py-6 pl-16 pr-6 text-2xl font-display font-bold focus:border-brand-500 focus:bg-white outline-none transition-all text-slate-800"
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const amount = parseFloat(openingAmount || '0');
                    if (amount < 0) return;
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
                  className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {selectingCustomerFor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cargar a Cuenta</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecciona el cliente para esta orden</p>
                </div>
                <button onClick={() => setSelectingCustomerFor(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-4">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    autoFocus
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] py-5 pl-14 pr-6 text-base font-bold focus:border-brand-500 focus:bg-white outline-none transition-all soft-shadow-sm"
                    placeholder="Buscar por nombre de cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                
                <div className="space-y-3 max-h-[350px] overflow-auto pr-2 no-scrollbar">
                  {customers
                    .filter(c => c.nombre.toLowerCase().includes(customerSearch.toLowerCase()))
                    .map(customer => (
                       <button
                        key={customer.id}
                        onClick={() => {
                          const selectedOrder = orders.find(o => o.id === selectingCustomerFor && o.fecha === selectedDate);
                          const amount = parseFloat(partialAmounts[selectingCustomerFor!] || (selectedOrder?.total! - (selectedOrder?.pagos || []).reduce((acc, p) => acc + p.monto, 0)).toString());
                          if (amount > 0) {
                            payOrder(selectingCustomerFor!, 'CREDITO', amount, customer.id);
                            setSelectingCustomerFor(null);
                            setPartialAmounts(prev => ({ ...prev, [selectingCustomerFor!]: '' }));
                            setCustomerSearch('');
                          }
                        }}
                        className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center hover:border-brand-500 hover:bg-brand-50/30 transition-all group soft-shadow-sm"
                      >
                        <div className="text-left flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-brand-500 transition-colors">
                             <User className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-slate-900 group-hover:text-brand-700 transition-colors">{customer.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Saldo: <span className="text-emerald-500">S/ {customer.saldo.toFixed(2)}</span></p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand-600 group-hover:text-white transition-all">
                           <Plus className="w-5 h-5" />
                        </div>
                      </button>
                    ))}
                  {customers.filter(c => c.nombre.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                    <p className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                      No se encontraron clientes
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {efectivoModalFor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Coins className="w-5 h-5 text-emerald-500 animate-pulse" />
                    Lógica de Vuelto
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Pago de {efectivoModalFor.cliente} • Ticket #{efectivoModalFor.id.split('-').pop()}
                  </p>
                </div>
                <button 
                  onClick={() => setEfectivoModalFor(null)} 
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-5">
                {/* Campo A: Monto a pagar */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] block">
                    Campo A: Monto a pagar con efectivo
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">S/</span>
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3.5 pl-10 pr-4 text-base font-bold outline-none focus:bg-white focus:border-brand-500 transition-all text-slate-800"
                      value={efectivoMontoAPagar}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setEfectivoMontoAPagar('');
                          return;
                        }
                        const numVal = parseFloat(val);
                        if (numVal > efectivoModalFor.balance) {
                          setEfectivoMontoAPagar(efectivoModalFor.balance.toFixed(2));
                        } else if (numVal < 0) {
                          setEfectivoMontoAPagar('0.00');
                        } else {
                          setEfectivoMontoAPagar(val);
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase px-0.5">
                    <span>Saldo pendiente: S/ {efectivoModalFor.balance.toFixed(2)}</span>
                    <button 
                      onClick={() => setEfectivoMontoAPagar(efectivoModalFor.balance.toFixed(2))}
                      className="text-brand-600 hover:text-brand-700 font-extrabold"
                    >
                      Pagar total
                    </button>
                  </div>
                </div>

                {/* Campo B: Dinero Recibido */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] block">
                    Campo B: Dinero Recibido
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">S/</span>
                    <input 
                      autoFocus
                      type="number"
                      step="0.5"
                      placeholder="0.00"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-4.5 pl-10 pr-4 text-xl font-bold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all text-slate-800 text-left"
                      value={efectivoDineroRecibido}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setEfectivoDineroRecibido('');
                        } else {
                          setEfectivoDineroRecibido(val);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Quick cash bills selection */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button 
                      onClick={() => setEfectivoDineroRecibido(parseFloat(efectivoMontoAPagar || '0').toFixed(2))}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-tight rounded-lg transition-colors border border-slate-200"
                    >
                      Monto Exacto
                    </button>
                    {[10, 20, 50, 100, 200].map((bill) => (
                      <button
                        key={bill}
                        onClick={() => {
                          setEfectivoDineroRecibido(bill.toFixed(2));
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg transition-colors border border-emerald-100"
                      >
                        S/ {bill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo C: Vuelto / Cambio */}
                {(() => {
                  const valA = parseFloat(efectivoMontoAPagar) || 0;
                  const valB = parseFloat(efectivoDineroRecibido) || 0;
                  const diff = valB - valA;
                  const isInsufficient = valB > 0 && valB < valA;
                  const isExact = valB === 0 || !efectivoDineroRecibido || Math.abs(diff) < 0.001;

                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Campo C: Vuelto (Solo Lectura)
                      </p>
                      
                      {isInsufficient ? (
                        <div className="space-y-1">
                          <p className="text-xl font-display font-extrabold text-rose-500 tracking-tight">
                            Dinero Insuficiente
                          </p>
                          <p className="text-[9.5px] font-bold text-rose-400 uppercase tracking-tight">
                            Faltan S/ {Math.abs(diff).toFixed(2)} para completar el pago
                          </p>
                        </div>
                      ) : isExact ? (
                        <div className="space-y-0.5">
                          <p className="text-2xl font-display font-extrabold text-slate-600 tracking-tight">
                            S/ 0.00
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            Monto exacto (No requiere vuelto)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-3xl font-display font-extrabold text-emerald-600 tracking-tight">
                            S/ {diff.toFixed(2)}
                          </p>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest font-mono">
                            Entregar vuelto al cliente
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => setEfectivoModalFor(null)}
                    className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      const amount = parseFloat(efectivoMontoAPagar);
                      if (amount > 0) {
                        const finalAmount = Math.min(amount, efectivoModalFor.balance);
                        payOrder(efectivoModalFor.id, 'EFECTIVO', finalAmount);
                        setPartialAmounts(prev => {
                          const next = { ...prev };
                          delete next[efectivoModalFor.id];
                          return next;
                        });
                        setEfectivoModalFor(null);
                      }
                    }}
                    disabled={
                      !efectivoMontoAPagar || 
                      parseFloat(efectivoMontoAPagar) <= 0 || 
                      ((parseFloat(efectivoDineroRecibido) || 0) > 0 && (parseFloat(efectivoDineroRecibido) || 0) < (parseFloat(efectivoMontoAPagar) || 0))
                    }
                    className="py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-100 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100/50 hover:shadow-emerald-200/50 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Orders Summary Table Compact */}
      <div className="space-y-4 pt-4">
        <div className="px-2">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Registro Histórico</h2>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 soft-shadow overflow-hidden overflow-x-auto no-scrollbar">
           <table className="w-full text-left border-collapse min-w-[850px]">
             <thead>
               <tr className="bg-slate-50/60 border-b border-slate-100">
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pedido</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Mesa</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Comensal</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100/80 bg-slate-50/30">metodo</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right border-l border-slate-100/80 bg-slate-50/30">parcial</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100/80 text-center">Total</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100/80 text-center">Estado</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100/80 text-center">hora de pago</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 animate-fade-in">
               {orderSummary.map((order) => {
                 const shortId = order.id.split('-').pop() || '';
                 const parsedNum = parseInt(shortId, 10);
                 const formattedId = !isNaN(parsedNum) ? String(parsedNum).padStart(3, '0') : shortId;

                 const totalQty = (order.items || []).reduce((acc, item) => acc + item.cantidad, 0);

                 const paymentsList = (order.pagos && order.pagos.length > 0)
                   ? order.pagos
                   : (order.estado === 'PAGADO'
                       ? [{ id: `fallback-${order.id}-pay`, metodo: order.metodoPago || 'EFECTIVO', monto: order.total, hora: order.hora }]
                       : order.estado === 'CREDITO'
                         ? [{ id: `fallback-${order.id}-cred`, metodo: 'CREDITO', monto: order.total, hora: order.hora }]
                         : [{ id: `fallback-${order.id}-open`, metodo: 'PENDIENTE', monto: 0, hora: '-' }]
                     );

                 return (
                   <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                     {/* Pedido */}
                     <td className="px-4 py-3 text-[11px] font-bold text-slate-500 tracking-wider font-mono text-center">
                       #{formattedId}
                     </td>

                     {/* Mesa */}
                     <td className="px-4 py-3 text-center">
                       <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100/80 text-xs font-display font-black text-slate-700 border border-slate-150">
                         {getMesaNumber(order.mesaId)}
                       </span>
                     </td>

                     {/* Comensal */}
                     <td className="px-5 py-3">
                       <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-800 uppercase truncate max-w-[155px]">
                           {order.cliente}
                         </span>
                         <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                           Por: {order.usuarioNombre || 'Administrador'}
                         </span>
                       </div>
                     </td>

                     {/* Cant. */}
                     <td className="px-4 py-3 text-center">
                       <span className="text-[11px] font-black text-slate-600 bg-slate-100/60 px-2.5 py-1 rounded-lg border border-slate-150/40 shadow-sm">
                         {totalQty}
                       </span>
                     </td>

                     {/* Metodo stacked row subdivision */}
                     <td className="p-0 border-l border-slate-100 bg-slate-50/10">
                       <div className="flex flex-col h-full divide-y divide-slate-100">
                         {paymentsList.map((p, idx) => (
                           <div key={p.id || idx} className="px-4 h-11 flex items-center justify-center">
                             <span className={`text-[9.5px] font-extrabold uppercase tracking-widest text-center min-w-[75px] ${getMetodoBadgeStyle(p.metodo)}`}>
                               {p.metodo.toLowerCase()}
                             </span>
                           </div>
                         ))}
                       </div>
                     </td>

                     {/* Parcial stacked row subdivision */}
                     <td className="p-0 border-l border-slate-100 bg-slate-50/10 text-right">
                       <div className="flex flex-col h-full divide-y divide-slate-100">
                         {paymentsList.map((p, idx) => (
                           <div key={p.id || idx} className="px-4 h-11 flex items-center justify-end text-xs font-mono font-bold text-slate-600 min-w-[70px]">
                             {p.monto.toFixed(2)}
                           </div>
                         ))}
                       </div>
                     </td>

                     {/* Total */}
                     <td className="px-5 py-3 text-xs font-display font-black text-slate-800 tracking-tight text-center border-l border-slate-100">
                       S/ {order.total.toFixed(2)}
                     </td>

                     {/* Estado */}
                     <td className="px-5 py-3 text-center border-l border-slate-100">
                       <span className={`text-[8.5px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest leading-none ${
                          order.estado === 'PAGADO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 
                          order.estado === 'CREDITO' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' : 
                          order.estado === 'CANCELADO' ? 'bg-rose-50 text-rose-500 border border-rose-100/50' : 
                          'bg-slate-100 text-slate-500 border border-slate-200/50'
                        }`}>
                         {order.estado === 'CREDITO' ? 'CRÉDITO' : order.estado}
                       </span>
                     </td>

                     {/* Hora de Pago */}
                     <td className="p-0 border-l border-slate-100 text-center">
                       <div className="flex flex-col h-full divide-y divide-slate-100">
                         {paymentsList.map((p, idx) => (
                           <div key={p.id || idx} className="px-4 h-11 flex items-center justify-center text-[10px] font-mono text-slate-400 font-bold min-w-[85px]">
                             {p.hora || order.hora || '-'}
                           </div>
                         ))}
                       </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>

           </table>
        </div>
      </div>
    </div>
  );
};
