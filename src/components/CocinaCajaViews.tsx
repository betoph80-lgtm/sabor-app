/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Check, Clock, Utensils, AlertCircle, Trash2, Search, X, Plus, Timer, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderTimer } from './OrderTimer.tsx';

export const CocinaView: React.FC = () => {
  const { orders, products, updateItemStatus, currentMenu, selectedDate, isTodaySelected } = useApp();

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

  // Filter main dishes from current menu to show stock
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
    .filter(item => item.tipo === 'SEGUNDO');

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
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Monitor de Cocina</h2>
          <p className="text-slate-600 font-medium text-sm">Sigue el estado de las preparaciones en tiempo real.</p>
        </div>
        <span className="bg-brand-50 text-brand-700 border border-brand-100 px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest soft-shadow">
          {itemsToPrepare.length} Preparaciones Pendientes
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Real-time Stock of Segundos */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-50 soft-shadow flex flex-wrap gap-5 h-fit">
          <div className="w-full flex justify-between items-center mb-2">
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Stock para Almuerzos</p>
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">En Línea</span>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             </div>
          </div>
          {menuStock.map(item => (
            <div key={item.id} className="flex flex-col bg-slate-50 p-5 rounded-[28px] border border-slate-100 min-w-[140px] flex-1 soft-shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.nombre}</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-4xl font-display font-bold ${item.stockActual < 5 ? 'text-rose-500' : 'text-brand-900'}`}>
                  {item.stockActual}
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">unidades</span>
              </div>
            </div>
          ))}
        </div>

        {/* Preparation Summary */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl flex flex-wrap gap-5 h-fit overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -translate-y-16 -translate-x-16" />
          <div className="w-full mb-2 relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400">Acumulado a Servir</p>
          </div>
          {Object.entries(summary).map(([name, qty]) => (
            <div key={name} className="relative z-10 flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-[24px] border border-white/10 soft-shadow">
              <span className="text-3xl font-display font-bold text-brand-400">{qty}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-200">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedMesaKeys.map((key) => {
          const items = itemsByMesa[key];
          const mesaId = items[0].mesaId;
          const orderTimestamp = items[0].timestamp || Date.now();
          const elapsedMinutes = Math.floor((Date.now() - orderTimestamp) / 60000);
          
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
              className={`bg-white rounded-[40px] border shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
                elapsedMinutes >= 20 ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-200'
              }`}
            >
            <div className={`${headerColorClass} px-8 py-6 flex justify-between items-center text-white relative transition-colors duration-500`}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-8 translate-x-8" />
               <div className="flex flex-col relative z-10">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${textColorClass} leading-none mb-2`}>
                    PEDIDO-{items[0].orderId.split('-').pop()} • Ticket
                  </span>
                  <h3 className="text-2xl font-display font-bold leading-none">{mesaId === '13' ? 'PL (CLIENTE)' : `MESA ${mesaId}`}</h3>
               </div>
               <div className="flex flex-col items-end gap-3 relative z-10">
                  <OrderTimer timestamp={orderTimestamp} />
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest tabular-nums px-3 py-1 bg-black/30 rounded-xl backdrop-blur-sm border border-white/10">RECIBIDO A LAS {items[0].horaPedido}</p>
               </div>
            </div>

            <div className="p-4 space-y-4 flex-1">
              {/* Items already served for this mesa in this order */}
              {(() => {
                const orderId = items[0].orderId;
                const servedItems = orders.find(o => o.id === orderId && o.fecha === selectedDate)?.items.filter(i => i.estado === 'SERVIDO') || [];
                if (servedItems.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-50">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest w-full mb-1">Ya servido:</span>
                    {servedItems.map(si => {
                      const p = products.find(prod => prod.id === si.productoId);
                      return (
                        <div key={si.id} className="px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{si.cantidad}x {p?.nombre}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="space-y-4">
                {items.map((item) => {
                  const product = products.find(p => p.id === item.productoId);
                  const isSoup = product?.tipo === 'SOPA';
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between group py-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg shadow-inner ${
                          isSoup ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-violet-50 text-violet-600 border border-violet-100'
                        }`}>
                          {item.cantidad}
                        </div>
                        <div className="flex flex-col">
                           <p className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1 text-sm">{product?.nombre}</p>
                           <div className="flex items-center gap-2">
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {isSoup ? 'Sopa' : 'Plato de Fondo'}
                             </p>
                             {item.estado !== 'SERVIDO' && item.timestampPedido && (
                               <OrderTimer 
                                 timestamp={item.timestampPedido} 
                                 hideIcon
                                 className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded-lg border border-white/10 scale-90 origin-left ml-1 text-white"
                               />
                             )}
                           </div>
                        </div>
                      </div>

                      {item.estado === 'SERVIDO' ? (
                        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-tight flex items-center gap-1">
                          <Check className="w-3 h-3" /> Servido
                        </div>
                      ) : (
                        <button
                          onClick={() => updateItemStatus(item.orderId, item.id, 'SERVIDO')}
                          className="bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-100 hover:border-emerald-200 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-tight transition-all active:scale-95 shadow-sm"
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
  const { orders, payOrder, resetStock, products, customers, deleteOrder, setOrders, requestConfirmation, selectedDate, isTodaySelected } = useApp();
  const [selectingCustomerFor, setSelectingCustomerFor] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const openOrders = [...orders]
    .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
    .sort((a, b) => {
      const aReady = a.items.every(i => i.estado === 'SERVIDO');
      const bReady = b.items.every(i => i.estado === 'SERVIDO');
      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

  const directPaidOrders = orders.filter(o => o.estado === 'PAGADO' && o.fecha === selectedDate);
  const totalEfectivo = directPaidOrders.filter(o => o.metodoPago === 'EFECTIVO').reduce((acc, o) => acc + o.total, 0);
  const totalYape = directPaidOrders.filter(o => o.metodoPago === 'YAPE').reduce((acc, o) => acc + o.total, 0);
  const totalDirecto = totalEfectivo + totalYape;

  // Calcular cobros a clientes hoy (Depósitos y Pagos de crédito)
  const customerPaymentsToday = customers.flatMap(c => 
    c.historial
      .filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
      .map(t => ({ ...t, cliente: c.nombre }))
  );
  const totalCustomerPayments = customerPaymentsToday.reduce((acc, t) => acc + t.monto, 0);

  const totalRecaudado = totalDirecto + totalCustomerPayments;

  // Order summary for the table (all orders today)
  const orderSummary = [...orders]
    .filter(o => o.fecha === selectedDate)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Daily Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-emerald-50 p-10 rounded-[48px] border border-emerald-200 flex flex-col items-center justify-center text-center soft-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl -translate-y-16 -translate-x-16" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-700 mb-4 relative z-10">Caja Real del Día</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-xl font-display font-bold text-emerald-700">S/</span>
            <span className="text-6xl font-display font-bold text-emerald-900 tracking-tighter">{totalRecaudado.toFixed(2)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 relative z-10">
            <div className="text-center bg-white/70 backdrop-blur-sm px-6 py-4 rounded-3xl border border-emerald-100 soft-shadow-sm">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Efectivo</p>
              <p className="font-display font-bold text-emerald-900 text-xl">S/ {totalEfectivo.toFixed(2)}</p>
            </div>
            <div className="text-center bg-white/70 backdrop-blur-sm px-6 py-4 rounded-3xl border border-emerald-100 soft-shadow-sm">
              <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest mb-1.5">Yape</p>
              <p className="font-display font-bold text-brand-900 text-xl">S/ {totalYape.toFixed(2)}</p>
            </div>
            <div className="text-center bg-white/70 backdrop-blur-sm px-6 py-4 rounded-3xl border border-emerald-100 soft-shadow-sm">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Recursos</p>
              <p className="font-display font-bold text-slate-900 text-xl">S/ {totalCustomerPayments.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-200 flex flex-col soft-shadow relative overflow-hidden h-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/40 rounded-full blur-3xl -translate-y-16 translate-x-16" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-6 relative z-10">Flujo de Cobros Recientes</p>
          <div className="space-y-3 overflow-y-auto max-h-[200px] no-scrollbar relative z-10">
            {customerPaymentsToday.length === 0 ? (
              <div className="flex flex-col items-center py-10 opacity-30">
                <Clock className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Sin actividad reciente</p>
              </div>
            ) : (
              customerPaymentsToday.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 soft-shadow-sm group hover:border-emerald-200 transition-colors">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                        <Check className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-xs font-bold text-slate-900 uppercase truncate max-w-[200px]">{t.cliente}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t.tipo === 'DEPOSITO' ? 'Abono Directo' : 'Cancelación Deuda'}</p>
                     </div>
                   </div>
                   <p className="text-base font-display font-bold text-emerald-600">+S/ {t.monto.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Cuentas por Liquidar</h2>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
            {openOrders.length} Pendientes
          </span>
        </div>

        {openOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
               <AlertCircle className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-bold uppercase tracking-widest text-[10px]">Sin cuentas pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {openOrders.map((order) => {
              const isReadyToPay = order.items.every(i => i.estado === 'SERVIDO');

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-4 shadow-sm border transition-all ${
                    isReadyToPay 
                      ? 'border-emerald-200 ring-4 ring-emerald-50' 
                      : 'border-slate-200'
                  } flex flex-col md:flex-row gap-4 items-stretch md:items-start`}
                >
                  {/* Left: Info */}
                  <div className="w-full md:w-[130px] shrink-0">
                    <div className="flex flex-col gap-3 mb-4 relative z-10">
                      <span className="bg-slate-900 text-white px-4 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest w-fit soft-shadow">
                        PEDIDO-{order.id.split('-').pop()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-display font-bold text-sm">
                          {order.mesaId === '13' ? 'PL' : order.mesaId}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {order.mesaId === '13' ? 'Llevar' : 'Comensal en Mesa'}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-display font-bold text-slate-900 text-lg truncate leading-tight uppercase relative z-10">{order.cliente}</h3>
                    <div className="flex items-baseline gap-1 mt-4 relative z-10">
                       <span className="text-lg font-display font-bold text-emerald-600">S/</span>
                       <p className="text-4xl font-display font-bold text-slate-900 tracking-tighter leading-none">{order.total.toFixed(2)}</p>
                    </div>
                    {!isReadyToPay && (
                       <div className="flex items-center gap-2 mt-4 bg-rose-50 px-3 py-1.5 rounded-xl w-fit border border-rose-100 relative z-10">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-[9px] text-rose-600 font-bold uppercase tracking-[0.2em]">Cocinando...</span>
                       </div>
                    )}
                  </div>

                  {/* Middle: Items Detail (The "Platos") */}
                  <div className="flex-1 py-3 md:py-0 md:px-6 md:border-x border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Detalle:</p>
                    <div className="space-y-1.5">
                      {order.items.map((item) => {
                        const p = products.find(prod => prod.id === item.productoId);
                        return (
                          <div key={item.id} className="flex justify-between items-start text-[11px] bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-700 uppercase leading-snug pr-2">
                              {item.cantidad}× {p?.nombre || 'Producto'}
                            </span>
                            <span className="font-black text-slate-500 shrink-0 tabular-nums">
                              S/ {(item.cantidad * item.precioUnitario).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Buttons (Ultra Compact) */}
                  <div className="flex flex-row md:flex-col gap-3 shrink-0 md:w-[160px] pt-4 md:pt-0">
                    <div className="flex flex-row md:flex-col gap-3 flex-1">
                      <button
                        onClick={() => payOrder(order.id, 'EFECTIVO')}
                        disabled={!isReadyToPay}
                        className={`flex-1 px-4 py-3 rounded-2xl font-bold uppercase tracking-[0.2em] text-[9px] transition-all soft-shadow active:scale-95 text-center flex flex-col justify-center leading-tight ${
                          isReadyToPay 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-slate-50 text-slate-200 cursor-not-allowed border border-slate-100 grayscale'
                        }`}
                      >
                        EN EFECTIVO
                      </button>
                      <button
                        onClick={() => payOrder(order.id, 'YAPE')}
                        disabled={!isReadyToPay}
                        className={`flex-1 px-4 py-3 rounded-2xl font-bold uppercase tracking-[0.2em] text-[9px] transition-all soft-shadow active:scale-95 text-center flex flex-col justify-center leading-tight ${
                          isReadyToPay 
                            ? 'bg-brand-600 text-white hover:bg-brand-700' 
                            : 'bg-slate-50 text-slate-200 cursor-not-allowed border border-slate-100 grayscale'
                        }`}
                      >
                        VIA YAPE
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectingCustomerFor(order.id)}
                      disabled={!isReadyToPay}
                      className={`flex-1 px-4 py-3 rounded-2xl font-bold uppercase tracking-[0.2em] text-[9px] transition-all soft-shadow active:scale-95 text-center flex flex-col justify-center leading-tight ${
                        isReadyToPay 
                          ? 'bg-slate-900 text-white hover:bg-slate-800' 
                          : 'bg-slate-50 text-slate-200 cursor-not-allowed border border-slate-100 grayscale'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Plus className="w-3 h-3" /> FIAR (CUENTA)
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {selectingCustomerFor && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                            payOrder(selectingCustomerFor, 'CREDITO', customer.id);
                            setSelectingCustomerFor(null);
                            setCustomerSearch('');
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
        </AnimatePresence>
      </div>

      {/* Orders Summary Table */}
      <div className="space-y-4 pt-4">
        <div className="px-2">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registro de Comandas (Totales)</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Resumen consolidado por cada número de pedido
          </p>
        </div>

        <div className="bg-white rounded-[48px] border border-slate-100 soft-shadow overflow-hidden overflow-x-auto no-scrollbar relative z-10">
           <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="bg-slate-50/50 border-b border-slate-100">
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Orden</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Registro</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Ubicación</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Comensal</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center">Cant.</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Total</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Estado Pago</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {orderSummary.map((order) => (
                 <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                   <td className="px-8 py-5 text-[10px] font-bold text-slate-900 tracking-widest uppercase bg-slate-50/50 rounded-xl border border-slate-100">PEDIDO-{order.id.split('-').pop()}</td>
                   <td className="px-8 py-5 text-xs font-bold text-slate-500">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{order.fecha}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{order.hora}</span>
                      </div>
                   </td>
                   <td className="px-8 py-5">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                        order.mesaId === '13' ? 'bg-orange-50 text-orange-600' : 'bg-brand-50 text-brand-600'
                      }`}>
                        {order.mesaId === '13' ? 'Para Llevar' : `Mesa ${order.mesaId}`}
                      </span>
                   </td>
                   <td className="px-8 py-5 text-xs font-display font-bold text-slate-900 uppercase tracking-tight">{order.cliente}</td>
                   <td className="px-8 py-5 text-center">
                     <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[10px] font-bold text-slate-600">
                       {order.items.length}
                     </span>
                   </td>
                   <td className="px-8 py-5 text-sm font-display font-bold text-slate-900 tracking-tight">S/ {order.total.toFixed(2)}</td>
                   <td className="px-8 py-5">
                     <span className={`text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest soft-shadow-sm ${
                        order.estado === 'PAGADO' ? 'bg-emerald-50 text-emerald-600' : 
                        order.estado === 'CREDITO' ? 'bg-slate-900 text-white' : 'bg-rose-50 text-rose-500 border border-rose-100'
                      }`}>
                        {order.estado === 'CREDITO' ? 'A Cuenta' : order.estado}
                      </span>
                   </td>
                 </tr>
               ))}
               {orderSummary.length === 0 && (
                 <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">
                      No hay pedidos registrados
                    </td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};
