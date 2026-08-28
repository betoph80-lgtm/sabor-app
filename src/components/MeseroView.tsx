/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Plus, Minus, Check, Clock, User, X, ChevronRight, Soup, Utensils as Meal, Lock, Receipt, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { OrderItem, ItemStatus, Mesa } from '../types';
import { OrderModal } from './OrderModal.tsx';
import { OrderTimer } from './OrderTimer.tsx';

export const MeseroView: React.FC = () => {
  const { 
    mesas, orders, createOrder, products, currentMenu, 
    updateItemStatus, addItemsToOrder, selectedDate, 
    isTodaySelected, cashControls, currentUser, navigateToCajaWithOrder 
  } = useApp();
  const [selectedMesa, setSelectedMesa] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const productsMap = React.useMemo(() => {
    const map = new Map<string, typeof products[0]>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const mesasMap = React.useMemo(() => {
    const map = new Map<string, typeof mesas[0]>();
    mesas.forEach(m => map.set(m.id, m));
    return map;
  }, [mesas]);

  const isCashClosed = cashControls.find(c => c.fecha === selectedDate)?.estado === 'CERRADA';

  const sortedMesas = [...mesas].sort((a, b) => {
    if (a.id === '13') return 1;
    if (b.id === '13') return -1;
    const numA = parseInt(a.nombre.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.nombre.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  const isMesero = currentUser?.role === 'MESERO';
  const filteredOrders = isMesero 
    ? orders.filter(o => o.usuarioId === currentUser?.id)
    : orders;

  const mesaOrders = filteredOrders.filter(o => o.mesaId === selectedMesa && o.estado === 'ABIERTO' && o.fecha === selectedDate);

  const getMesaLabel = (mesa: Mesa) => {
    if (mesa.id === '13') return 'Para Llevar';
    return mesa.nombre.replace(/mesa\s+/i, '');
  };

  // Table statistics
  const listTables = sortedMesas.filter(m => m.id !== '13');
  const occupiedCount = listTables.filter(m => 
    orders.some(o => o.mesaId === m.id && o.estado === 'ABIERTO' && o.fecha === selectedDate)
  ).length;
  const freeCount = listTables.length - occupiedCount;
  const deliveryOrdersCount = orders.filter(o => o.mesaId === '13' && o.estado === 'ABIERTO' && o.fecha === selectedDate).length;

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {isCashClosed && (
        <div className="bg-amber-50 border border-amber-200 p-3 md:p-4 rounded-[24px] md:rounded-3xl flex items-center gap-3 md:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-amber-900 uppercase tracking-tight text-sm">Caja Cerrada</h3>
            <p className="text-amber-700 text-[10px] font-medium leading-relaxed">No se pueden realizar nuevos pedidos ni modificaciones para esta fecha.</p>
          </div>
        </div>
      )}

      {/* Floor Plan Header and Status chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[28px] md:rounded-[40px] border border-slate-200/80 shadow-sm">
        <div className="text-left">
          <span className="text-[8px] md:text-[9.5px] font-black uppercase tracking-[0.25em] text-brand-600 mb-1.5 block">Distribución en tiempo real</span>
          <h2 className="text-lg md:text-2xl font-display font-black text-slate-900 tracking-tight leading-none">Salón Principal</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 text-white rounded-full text-[10px] md:text-xs font-bold border-none shadow-[0_4px_12px_rgba(16,185,129,0.25)] transition-all selection:bg-transparent select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Libres: <strong className="font-extrabold text-emerald-50">{freeCount}</strong>
          </span>
          <span className="flex items-center gap-2 px-3.5 py-2 bg-rose-500 text-white rounded-full text-[10px] md:text-xs font-bold border-none shadow-[0_4px_12px_rgba(244,63,94,0.25)] transition-all select-none">
            <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
            Ocupadas: <strong className="font-extrabold text-rose-50">{occupiedCount}</strong>
          </span>
          {deliveryOrdersCount > 0 && (
            <span className="flex items-center gap-2 px-3.5 py-2 bg-brand-500 text-white rounded-full text-[10px] md:text-xs font-bold border-none shadow-[0_4px_12px_rgba(109,40,217,0.25)] transition-all animate-pulse select-none">
              <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
              Llevar: <strong className="font-extrabold text-brand-50">{deliveryOrdersCount}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-5">
        {sortedMesas.map((mesa) => {
          const allMesaActiveOrders = orders.filter(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
          const mesaActiveOrders = filteredOrders.filter(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
          const isOccupied = allMesaActiveOrders.length > 0;
          const label = getMesaLabel(mesa);

          const activeOrder = allMesaActiveOrders[0];

          return (
            <button
              key={mesa.id}
              onClick={() => {
                if (isCashClosed) return;
                
                // OPCIÓN A: Para Administrador o Cajero, clic en mesa ocupada va directo a Caja para cobrar
                const isCashierOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'CAJA' || (currentUser?.role as string) === 'CAJERO';
                if (isOccupied && activeOrder && isCashierOrAdmin && mesa.id !== '13') {
                  navigateToCajaWithOrder(activeOrder.id);
                  return;
                }

                setSelectedMesa(mesa.id);
                if (!isOccupied || mesa.id === '13') {
                  setShowOrderModal(true);
                }
              }}
              title={
                isOccupied && (currentUser?.role === 'ADMIN' || currentUser?.role === 'CAJA' || (currentUser?.role as string) === 'CAJERO')
                  ? '⚡ Clic para Cobrar en Caja'
                  : undefined
              }
              disabled={isCashClosed}
              className={`relative aspect-square min-h-[96px] rounded-2xl md:rounded-[36px] border flex flex-col items-center justify-between transition-all duration-300 group hover:-translate-y-1 active:scale-[0.95] w-full p-2.5 md:p-4 ${
                isCashClosed ? 'opacity-40 cursor-not-allowed grayscale' : ''
              } ${
                isOccupied
                  ? mesa.id === '13' 
                    ? 'bg-brand-500 border-brand-600 text-white shadow-md shadow-brand-100/40 hover:bg-brand-600 hover:border-brand-700 cursor-pointer' 
                    : 'bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-100/40 hover:bg-rose-600 hover:border-rose-700 cursor-pointer'
                  : 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600 hover:border-emerald-700 shadow-md shadow-emerald-100/40 justify-center cursor-pointer'
              }`}
            >
              {isOccupied ? (() => {
                const totalMesaMonto = allMesaActiveOrders.reduce((acc, o) => acc + o.total, 0);

                return (
                  <div className="w-full h-full flex flex-col justify-between text-center overflow-hidden">
                    {/* Top Ticket metadata */}
                    <div className="flex flex-col select-none w-full">
                      <p className={`text-[5.5px] xs:text-[6.5px] md:text-[8px] font-extrabold uppercase tracking-tight leading-none ${
                        mesa.id === '13' ? 'text-brand-100' : 'text-rose-100'
                      }`}>
                        PEDIDO: #{(activeOrder?.id || '').split('-').pop()}
                      </p>
                      <p className={`text-[5px] xs:text-[6.0px] md:text-[7px] font-semibold leading-none mt-0.5 ${
                        mesa.id === '13' ? 'text-brand-200/90' : 'text-rose-200/90'
                      }`}>
                        A LAS {activeOrder?.hora}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-0.5 select-none w-full leading-none">
                        <span className="text-[5.5px] xs:text-[6.5px] md:text-[7.5px] font-black uppercase text-white truncate max-w-[80%]">
                          {activeOrder?.cliente || 'CONSU. FINAL'}
                        </span>
                      </div>
                    </div>

                    {/* Big table label */}
                    <div className="relative flex items-center justify-center my-0.5 shrink-0">
                      <div className="font-display font-black leading-none uppercase text-base xs:text-lg sm:text-xl md:text-2.5xl text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.2)] transition-transform duration-300 group-hover:scale-110">
                        {label}
                      </div>
                    </div>

                    {/* Order Amount display */}
                    <div className={`w-full flex items-center justify-center py-1 px-1 border-t ${
                      mesa.id === '13' ? 'border-brand-400/40 bg-brand-600/50' : 'border-rose-400/40 bg-rose-600/50'
                    } rounded-xl`}>
                      <span className="font-display font-black text-xs xs:text-sm md:text-base text-white tracking-tight leading-none drop-shadow-xs">
                        S/ {totalMesaMonto.toFixed(2)}
                      </span>
                    </div>

                    {/* Footer - who took the order */}
                    <div className={`text-[5.5px] xs:text-[6.5px] md:text-[7.5px] font-black uppercase tracking-wider truncate max-w-full leading-none border-t pt-1 mt-0.5 shrink-0 ${
                      mesa.id === '13' ? 'text-brand-100 border-brand-400/30' : 'text-rose-100 border-rose-400/30'
                    }`}>
                      {activeOrder?.usuarioNombre?.split(' ')[0] || 'ADMINISTRADOR'}
                    </div>
                  </div>
                );
              })() : (
                <>
                  <div className={`font-display font-black leading-none uppercase px-1 text-center select-none text-white transition-all duration-300 group-hover:scale-110 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.2)] ${
                    label.length > 3 ? 'text-xs md:text-base tracking-tight' : 'text-xl md:text-3.5xl'
                  }`}>
                    {label}
                  </div>
                  
                  {mesa.id !== '13' && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-600/55 border border-emerald-400/30 rounded-full text-[6.5px] md:text-[8px] font-black text-emerald-50 uppercase tracking-wider whitespace-nowrap select-none">
                      {mesa.sillas || 0} sil.
                    </div>
                  )}

                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mt-2.5 shadow-sm"></div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Order Detail Panel */}
      {selectedMesa && !showOrderModal && (
        <div className="space-y-6">
          <div className="flex justify-end items-center px-2 md:px-4">
             <button onClick={() => setSelectedMesa(null)} className="p-2 md:p-3 bg-white soft-shadow text-slate-400 hover:text-rose-500 rounded-xl md:rounded-2xl border border-slate-100 transition-colors">
               <X className="w-4 h-4 md:w-5 md:h-5" />
             </button>
          </div>

          {mesaOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-7">
              {mesaOrders.map((activeOrder, orderIdx) => (
                <motion.div 
                  key={activeOrder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] md:rounded-[40px] p-4 md:p-10 soft-shadow border border-slate-50 space-y-4 md:space-y-8 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-brand-50 rounded-bl-[100px] -z-0 opacity-40 translate-x-8 -translate-y-8" />
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex items-center gap-3 md:gap-6">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-brand-600 text-white rounded-xl md:rounded-[26px] flex items-center justify-center text-xl md:text-3xl font-display font-bold shadow-xl shadow-brand-100">
                        {getMesaLabel(mesasMap.get(selectedMesa!) || { id: selectedMesa, nombre: selectedMesa, estado: 'LIBRE' } as Mesa)}
                      </div>
                      <div>
                        <h2 className="text-lg md:text-2xl font-display font-bold text-brand-500 leading-tight">
                          {mesasMap.get(selectedMesa!)?.nombre || selectedMesa}
                          {mesaOrders.length > 1 && <span className="ml-2">- Pedido #{orderIdx + 1}</span>}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4">
                    {activeOrder.items.map((item) => {
                      const product = productsMap.get(item.productoId);
                      const isServed = item.estado === 'SERVIDO';

                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-center justify-between p-3 md:p-6 rounded-2xl md:rounded-[24px] border transition-all ${
                            isServed 
                              ? 'bg-emerald-50/50 border-emerald-100' 
                              : 'bg-white border-brand-100 border-2 border-dashed'
                          }`}
                        >
                          <div className="flex items-center gap-3 md:gap-5 min-w-0">
                            <div className={`shrink-0 w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl flex items-center justify-center ${
                              isServed ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white shadow-lg shadow-brand-100 animate-pulse'
                            }`}>
                              {product?.tipo === 'SOPA' ? <Soup className="w-4 h-4 md:w-6 md:h-6" /> : <Meal className="w-4 h-4 md:w-6 md:h-6" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                 <p className="font-bold text-slate-900 leading-tight text-sm md:text-lg truncate">{product?.nombre}</p>
                                 {item.cantidad > 1 && (
                                    <span className="shrink-0 bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-lg text-[9px] md:text-[11px] font-black uppercase">
                                       x{item.cantidad}
                                    </span>
                                 )}
                              </div>
                              <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] ${
                                isServed ? 'text-emerald-500' : 'text-brand-500'
                              }`}>
                                {isServed ? 'SERVIDO' : 'PREPARANDO'}
                              </span>
                            </div>
                          </div>

                          {!isServed ? (
                            <button
                              onClick={() => updateItemStatus(activeOrder.id, item.id, 'SERVIDO')}
                              className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white px-4 md:px-8 py-2 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-bold uppercase tracking-widest soft-shadow transition-all active:scale-95"
                            >
                              Entregar
                            </button>
                          ) : (
                            <div className="shrink-0 w-10 h-10 md:w-16 md:h-16 bg-white text-emerald-500 rounded-full flex items-center justify-center soft-shadow border border-emerald-50">
                              <Check className="w-6 h-6 md:w-10 md:h-10" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative z-10 pt-4 md:pt-10 border-t border-slate-50 flex flex-col xs:flex-row gap-4 md:gap-5 items-center justify-between font-display">
                    <div className="flex flex-col items-center xs:items-start leading-none">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Pedido</p>
                      <p className="text-2xl md:text-4xl font-black text-brand-900 tracking-tight">S/ {activeOrder.total.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2 min-w-full xs:min-w-0 md:gap-3 w-full xs:w-auto">
                      <button
                        onClick={() => {
                          if (isCashClosed) return;
                          setSelectedMesa(selectedMesa);
                          setShowOrderModal(true);
                        }}
                        disabled={isCashClosed}
                        className={`flex-1 xs:flex-none py-3.5 md:py-4 px-6 md:px-8 bg-slate-900 text-white text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all soft-shadow active:scale-95 ${
                          isCashClosed ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Añadir
                      </button>
                      <button
                        onClick={() => navigateToCajaWithOrder(activeOrder.id)}
                        className="flex-1 xs:flex-none py-3.5 md:py-4 px-6 md:px-8 bg-brand-600 hover:bg-brand-700 text-white text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl md:rounded-2xl transition-all soft-shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Cobrar en Caja
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] p-8 md:p-12 soft-shadow border border-slate-50 text-center animate-in fade-in zoom-in-95">
               <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
               </div>
               <h3 className="font-display font-bold text-slate-800 text-lg uppercase tracking-tight">Mesa Ocupada</h3>
               <p className="text-slate-400 text-xs font-medium mt-1">Este pedido fue generado por otro usuario y no tienes permisos para verlo.</p>
            </div>
          )}
        </div>
      )}

      {/* New Order Modal */}
      {showOrderModal && (
        <OrderModal
          onClose={() => setShowOrderModal(false)}
          onAdd={(items, clienteName) => {
             if (selectedMesa) {
                const existingOrder = orders.find(o => o.mesaId === selectedMesa && o.estado === 'ABIERTO' && o.fecha === selectedDate);
                if (existingOrder && selectedMesa !== '13') { // Para llevar always creates new ones normally, but here we append to active
                   addItemsToOrder(existingOrder.id, items);
                } else {
                   createOrder(selectedMesa, clienteName || 'Cliente', items);
                }
                setShowOrderModal(false);
             }
          }}
          products={products}
          currentMenu={currentMenu.filter(m => m.fecha === selectedDate)}
          mesaId={selectedMesa || ''}
          mesaName={mesasMap.get(selectedMesa || '')?.nombre || ''}
        />
      )}
    </div>
  );
};
