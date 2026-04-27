/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Check, Clock, Utensils, AlertCircle, Trash2, Search, X, Plus, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const OrderTimer: React.FC<{ timestamp: number; isCompleted?: boolean; className?: string }> = ({ timestamp, isCompleted, className }) => {
  const [elapsed, setElapsed] = useState('');

  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      setElapsed('--:--');
      setIsDelayed(false);
      return;
    }

    const interval = setInterval(() => {
      const diff = Date.now() - timestamp;
      setIsDelayed(diff > 900000); // 15 minutes in ms
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      const parts = [];
      if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
      parts.push(minutes.toString().padStart(2, '0'));
      parts.push(seconds.toString().padStart(2, '0'));
      
      setElapsed(parts.join(':'));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp, isCompleted]);

  return (
    <motion.div 
      animate={isDelayed ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 2 } } : {}}
      className={className || `flex items-center gap-1.5 px-3 py-1 rounded-lg backdrop-blur-sm border transition-colors ${
        isDelayed ? 'bg-rose-600 border-rose-400 shadow-lg shadow-rose-200' : 'bg-white/10 border-white/10'
      }`}
    >
      <Timer className={`w-3.5 h-3.5 ${isDelayed ? 'text-white' : 'text-violet-300'}`} />
      <span className="font-mono font-bold text-sm tracking-tighter text-white">{elapsed}</span>
    </motion.div>
  );
};

export const CocinaView: React.FC = () => {
  const { orders, products, updateItemStatus, currentMenu } = useApp();

  const itemsToPrepare = orders
    .filter(o => o.estado === 'ABIERTO')
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
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Comandas por Mesa</h2>
        <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
          {itemsToPrepare.length} Ítems Total
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Real-time Stock of Segundos */}
        <div className="lg:col-span-2 bg-white rounded-[32px] p-6 border-2 border-slate-100 shadow-sm flex flex-wrap gap-4 h-fit">
          <div className="w-full flex justify-between items-center mb-1">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Stock Segundos hoy</p>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          {menuStock.map(item => (
            <div key={item.id} className="flex flex-col bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 min-w-[120px] flex-1">
              <span className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[150px]">{item.nombre}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-black ${item.stockActual < 5 ? 'text-rose-600' : 'text-violet-900'}`}>
                  {item.stockActual}
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">disponibles</span>
              </div>
            </div>
          ))}
        </div>

        {/* Preparation Summary */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl flex flex-wrap gap-4 h-fit font-sans">
          <div className="w-full mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">Total a Cocinar</p>
          </div>
          {Object.entries(summary).map(([name, qty]) => (
            <div key={name} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <span className="text-2xl font-black text-violet-400">{qty}</span>
              <span className="text-xs font-bold uppercase tracking-tight text-slate-300">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedMesaKeys.map((key) => {
          const items = itemsByMesa[key];
          const mesaId = items[0].mesaId;
          const orderTimestamp = items[0].timestamp;
          return (
            <div 
              key={key} 
              className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col"
            >
            <div className="bg-violet-600 px-6 py-4 flex justify-between items-center text-white">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-violet-100 leading-none mb-1">
                    {items[0].orderId} • Orden de Servicio
                  </span>
                  <h3 className="text-xl font-black leading-none">{mesaId === '13' ? 'PARA LLEVAR' : `MESA ${mesaId}`}</h3>
               </div>
               <div className="flex flex-col items-end gap-2">
                  <OrderTimer timestamp={orderTimestamp} />
                  <p className="text-[9px] font-mono opacity-50 font-bold uppercase tracking-tighter tabular-nums px-2 py-0.5 bg-black/20 rounded">A LAS {items[0].horaPedido}</p>
               </div>
            </div>

            <div className="p-4 space-y-4 flex-1">
              {/* Items already served for this mesa in this order */}
              {(() => {
                const orderId = items[0].orderId;
                const servedItems = orders.find(o => o.id === orderId)?.items.filter(i => i.estado === 'SERVIDO') || [];
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
                        <div>
                           <p className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1 text-sm">{product?.nombre}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {isSoup ? 'Sopa' : 'Plato de Fondo'}
                           </p>
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
  const { orders, payOrder, resetStock, products, customers, deleteOrder, setOrders, requestConfirmation } = useApp();
  const [selectingCustomerFor, setSelectingCustomerFor] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const today = new Date().toLocaleDateString();

  const openOrders = [...orders]
    .filter(o => o.estado === 'ABIERTO')
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const directPaidOrders = orders.filter(o => o.estado === 'PAGADO' && o.fecha === today);
  const totalEfectivo = directPaidOrders.filter(o => o.metodoPago === 'EFECTIVO').reduce((acc, o) => acc + o.total, 0);
  const totalYape = directPaidOrders.filter(o => o.metodoPago === 'YAPE').reduce((acc, o) => acc + o.total, 0);
  const totalDirecto = totalEfectivo + totalYape;

  // Calcular cobros a clientes hoy (Depósitos y Pagos de crédito)
  const customerPaymentsToday = customers.flatMap(c => 
    c.historial
      .filter(t => t.fecha === today && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
      .map(t => ({ ...t, cliente: c.nombre }))
  );
  const totalCustomerPayments = customerPaymentsToday.reduce((acc, t) => acc + t.monto, 0);

  const totalRecaudado = totalDirecto + totalCustomerPayments;

  // Order summary for the table (all orders today)
  const orderSummary = [...orders]
    .filter(o => o.fecha === today)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 flex flex-col items-center justify-center text-center shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">Total Recaudado Hoy</p>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-emerald-600">S/</span>
            <span className="text-5xl font-black text-emerald-900 tracking-tighter">{totalRecaudado.toFixed(2)}</span>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="text-center">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Efectivo</p>
              <p className="font-bold text-emerald-700 text-xs">S/ {totalEfectivo.toFixed(2)}</p>
            </div>
            <div className="w-px bg-emerald-200"></div>
            <div className="text-center">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Yape</p>
              <p className="font-bold text-emerald-700 text-xs">S/ {totalYape.toFixed(2)}</p>
            </div>
            <div className="w-px bg-emerald-200"></div>
            <div className="text-center">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Cobros Clientes</p>
              <p className="font-bold text-emerald-700 text-xs">S/ {totalCustomerPayments.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-200 flex flex-col shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Pagos de Clientes hoy</p>
          <div className="space-y-2 overflow-y-auto max-h-[150px] no-scrollbar">
            {customerPaymentsToday.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest py-4 text-center italic">No hay pagos registrados</p>
            ) : (
              customerPaymentsToday.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                   <div>
                     <p className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[150px]">{t.cliente}</p>
                     <p className="text-[8px] text-slate-400 font-bold uppercase">{t.tipo === 'DEPOSITO' ? 'Adelanto' : 'Pago Deuda'}</p>
                   </div>
                   <p className="text-sm font-black text-emerald-600">+S/ {t.monto.toFixed(2)}</p>
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
                  <div className="w-full md:w-[120px] shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
                        {order.id}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        Mesa {order.mesaId === '13' ? 'PL' : order.mesaId}
                      </span>
                    </div>
                    
                    <OrderTimer 
                      timestamp={order.timestamp} 
                      isCompleted={isReadyToPay} 
                      className="flex items-center gap-1.5 mb-2 py-1 px-2 bg-slate-900 rounded-lg w-fit"
                    />

                    <h3 className="font-bold text-slate-800 text-sm truncate leading-tight uppercase">{order.cliente}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                       <span className="text-xs font-bold text-emerald-600">S/</span>
                       <p className="text-3xl font-extrabold text-slate-800 tracking-tighter leading-none">{order.total.toFixed(2)}</p>
                    </div>
                    {!isReadyToPay && (
                       <div className="flex items-center gap-1.5 mt-2 bg-violet-50 px-2 py-1 rounded-lg w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
                          <span className="text-[8px] text-violet-600 font-bold uppercase tracking-wider">Cocinando</span>
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
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-[140px] pt-3 md:pt-0">
                    <div className="flex flex-row md:flex-col gap-2 flex-1">
                      <button
                        onClick={() => payOrder(order.id, 'EFECTIVO')}
                        disabled={!isReadyToPay}
                        className={`flex-1 px-2 py-2 rounded-xl font-black uppercase tracking-widest text-[8px] transition-all shadow-sm active:scale-95 text-center flex flex-col justify-center leading-tight ${
                          isReadyToPay 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        EFECTIVO
                      </button>
                      <button
                        onClick={() => payOrder(order.id, 'YAPE')}
                        disabled={!isReadyToPay}
                        className={`flex-1 px-2 py-2 rounded-xl font-black uppercase tracking-widest text-[8px] transition-all shadow-sm active:scale-95 text-center flex flex-col justify-center leading-tight ${
                          isReadyToPay 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        YAPE
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectingCustomerFor(order.id)}
                      disabled={!isReadyToPay}
                      className={`flex-1 px-2 py-2 rounded-xl font-black uppercase tracking-widest text-[8px] transition-all shadow-sm active:scale-95 text-center flex flex-col justify-center leading-tight ${
                        isReadyToPay 
                          ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-100' 
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      <span>A CUENTA</span>
                      <span className="opacity-60 text-[7px]">(Fiar)</span>
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
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      autoFocus
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-violet-500 outline-none transition-all"
                      placeholder="Buscar cliente por nombre..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-auto pr-2 no-scrollbar">
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
                          className="w-full p-4 bg-white border-2 border-slate-50 rounded-2xl flex justify-between items-center hover:border-violet-500 hover:shadow-md transition-all group"
                        >
                          <div className="text-left">
                            <p className="font-bold text-slate-800 group-hover:text-violet-600">{customer.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">S/ {customer.saldo.toFixed(2)} Saldo</p>
                          </div>
                          <Plus className="w-5 h-5 text-violet-200 group-hover:text-violet-500" />
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

        <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden overflow-x-auto no-scrollbar">
           <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-100">
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha/Hora</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Items</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {orderSummary.map((order) => (
                 <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 py-4 text-xs font-black text-slate-900">{order.id}</td>
                   <td className="px-6 py-4 text-xs font-bold text-slate-500">
                      <div className="flex flex-col">
                        <span>{order.fecha}</span>
                        <span className="text-[10px] opacity-60">{order.hora}</span>
                      </div>
                   </td>
                   <td className="px-6 py-4 text-xs font-black text-slate-800">
                      {order.mesaId === '13' ? 'PARA LLEVAR' : `${order.mesaId}`}
                   </td>
                   <td className="px-6 py-4 text-xs font-black text-slate-800 uppercase">{order.cliente}</td>
                   <td className="px-6 py-4 text-xs font-black text-violet-600 text-center">{order.items.length}</td>
                   <td className="px-6 py-4 text-xs font-black text-slate-800">S/ {order.total.toFixed(2)}</td>
                   <td className="px-6 py-4">
                     <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                       order.estado === 'PAGADO' ? 'bg-emerald-100 text-emerald-600' : 
                       order.estado === 'CREDITO' ? 'bg-violet-100 text-violet-600' : 'bg-violet-50 text-violet-500'
                     }`}>
                       {order.estado}
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
