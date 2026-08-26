/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Check, CheckCheck, Clock, Utensils, Bell, Volume2 } from 'lucide-react';
import { OrderTimer } from './OrderTimer.tsx';

export const CocinaView: React.FC = () => {
  const { 
    orders, 
    products, 
    updateItemStatus, 
    updateAllItemsStatusInOrder, 
    currentMenu, 
    selectedDate, 
    isTodaySelected, 
    mesas,
    testNotification 
  } = useApp();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const productsMap = React.useMemo(() => {
    const map = new Map<string, typeof products[0]>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const itemsToPrepare = React.useMemo(() => {
    return orders
      .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
      .flatMap(order => {
        const seconds = order.items.filter(i => {
          const p = productsMap.get(i.productoId);
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
        const product = productsMap.get(item.productoId);
        const isSoup = product?.tipo === 'SOPA';

        if (item.estado !== 'SERVIDO') return true;
        
        // Keep served soup if there are pending seconds OR no seconds have been ordered yet
        return isSoup && (item.hasPendingSeconds || item.hasNoSeconds);
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [orders, productsMap, selectedDate]);

  // Filter main dishes and soup from current menu to show stock
  const menuStock = React.useMemo(() => {
    return currentMenu
      .filter(m => m.fecha === selectedDate)
      .map(item => {
        const product = productsMap.get(item.productoId);
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
  }, [currentMenu, productsMap, selectedDate]);

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

  const summary = React.useMemo(() => {
    return itemsToPrepare
      .filter(item => item.estado !== 'SERVIDO')
      .reduce((acc, item) => {
        const name = productsMap.get(item.productoId)?.nombre || 'Desconocido';
        acc[name] = (acc[name] || 0) + item.cantidad;
        return acc;
      }, {} as Record<string, number>);
  }, [itemsToPrepare, productsMap]);

  // Group by Mesa but keep order ID in mind
  const { itemsByMesa, sortedMesaKeys } = React.useMemo(() => {
    const grouped = itemsToPrepare.reduce((acc, item) => {
      const key = `${item.mesaId}-${item.orderId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as {[key: string]: any[]});

    const keys = Object.keys(grouped).sort((a, b) => {
      const timestampA = grouped[a][0].timestamp || 0;
      const timestampB = grouped[b][0].timestamp || 0;
      return timestampA - timestampB;
    });

    return { itemsByMesa: grouped, sortedMesaKeys: keys };
  }, [itemsToPrepare]);

  return (
    <div className="p-2 md:p-6 space-y-3 md:space-y-4 max-w-[1600px] mx-auto">
      {/* Metrics Bar Compact */}
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
             Stock Crítico
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-0.5">
            {menuStock.map(item => {
              const isCritical = item.stockActual < 5;
              return (
                <div key={item.id} className={`flex items-baseline gap-2 shrink-0 px-3 py-1 rounded-full border transition-all ${
                  isCritical 
                    ? 'bg-rose-50/70 border-rose-200/60 text-rose-700 font-extrabold ring-2 ring-rose-500/5' 
                    : 'bg-white border-slate-100 text-slate-700'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[90px]">{item.nombre}</span>
                  <span className={`text-sm font-display font-black leading-none ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>
                    {item.stockActual}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-4 text-white shadow-lg flex flex-col md:flex-row md:items-center gap-4 min-w-fit">
          <div className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] border-b md:border-b-0 md:border-r border-white/10 pb-2 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <Clock className="w-3.5 h-3.5 text-brand-400" /> Hoy Cocinado
          </div>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(summary).map(([name, qty]) => (
              <div key={name} className="flex items-center gap-1.5 shrink-0 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <span className="text-sm font-display font-black text-brand-400 leading-none">{qty}</span>
                <span className="text-[8px] md:text-[9.5px] font-black uppercase tracking-wider text-slate-300 leading-none">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preparation Count & Sound Alert Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-1">
        <button
          id="btn-cocina-test-audio"
          type="button"
          onClick={testNotification}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Probar sonido y vibración que recibe el mesero"
        >
          <Volume2 className="w-3.5 h-3.5 text-brand-600 animate-bounce" />
          <span>Probar Timbre y Vibración Mesero</span>
        </button>

        <span className="bg-brand-50 text-brand-700 border border-brand-100/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider soft-shadow-sm flex items-center justify-center gap-1.5 selection:bg-transparent">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
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

          const totalOrderItems = fullOrder?.items || [];
          const pendingItemsCount = totalOrderItems.filter(i => i.estado !== 'SERVIDO').length;
          const totalItemsCount = totalOrderItems.length;
          const allItemsReady = pendingItemsCount === 0;

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
              id={`ticket-card-${orderId}`}
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
                  <p className="text-[7px] md:text-[8px] font-sans font-extrabold uppercase tracking-widest tabular-nums px-1.5 py-0.5 bg-black/20 rounded-md md:rounded-lg backdrop-blur-sm border border-white/5">A las {items[0].horaPedido}</p>
               </div>
            </div>

            {/* Ticket Quick Batch Action Bar: Listo a Todos los Platos */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider">Progreso:</span>
                <span className="text-[10px] font-black text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  {totalItemsCount - pendingItemsCount} / {totalItemsCount} listos
                </span>
              </div>

              {allItemsReady ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[9.5px] font-black uppercase tracking-wider">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Todos Listos ✓
                </span>
              ) : (
                <button
                  id={`btn-listo-todo-${orderId}`}
                  type="button"
                  onClick={() => updateAllItemsStatusInOrder(orderId, 'SERVIDO')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  title="Marcar todos los platos de este ticket como listos y enviar sonido/vibración al mesero"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Listo Todo ({pendingItemsCount})</span>
                </button>
              )}
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
                    <div key={item.id} className="flex items-center justify-between group py-1.5 border-b border-slate-50 last:border-0 pb-2 last:pb-0.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
                          isSoup ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-brand-50 text-brand-700 border border-brand-100'
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
                                 className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-md text-white text-[9.5px] font-sans font-extrabold leading-none shrink-0"
                               />
                             )}
                           </div>
                           <p className="text-[8.5px] font-bold uppercase tracking-widest mt-0.5 text-slate-400 leading-none">
                              {isSoup ? 'Entrada/Sopa' : (item.notas ? `⚠️ ${item.notas.toUpperCase()}` : (product?.categoria === 'MENÚ' ? 'Plato Fondo' : product?.categoria))}
                           </p>
                        </div>
                      </div>

                      {item.estado === 'SERVIDO' ? (
                        <div className="text-emerald-500 p-2">
                          <Check className="w-5 h-5" />
                        </div>
                      ) : (
                        <button
                          id={`btn-listo-item-${item.id}`}
                          type="button"
                          onClick={() => updateItemStatus(item.orderId, item.id, 'SERVIDO')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-sm shadow-emerald-100 flex items-center gap-2 cursor-pointer"
                          title="Marcar este plato como listo y notificar al mesero"
                        >
                          <Check className="w-3.5 h-3.5" />
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

export default CocinaView;
