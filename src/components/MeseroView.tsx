/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Plus, Minus, Check, Clock, User, X, ChevronRight, Soup, Utensils as Meal, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { OrderItem, ItemStatus, Mesa } from '../types';
import { OrderModal } from './OrderModal.tsx';

export const MeseroView: React.FC = () => {
  const { mesas, orders, createOrder, products, currentMenu, updateItemStatus, addItemsToOrder, selectedDate, isTodaySelected, cashControls, currentUser } = useApp();
  const [selectedMesa, setSelectedMesa] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

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

  return (
    <div className="p-1 md:p-8 space-y-3 md:space-y-8 max-w-5xl mx-auto">
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
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-1.5 md:gap-5">
        {sortedMesas.map((mesa) => {
          const allMesaActiveOrders = orders.filter(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
          const mesaActiveOrders = filteredOrders.filter(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
          const isOccupied = allMesaActiveOrders.length > 0;
          const label = getMesaLabel(mesa);

          return (
            <button
              key={mesa.id}
              onClick={() => {
                if (isCashClosed) return;
                setSelectedMesa(mesa.id);
                if (!isOccupied || mesa.id === '13') {
                  setShowOrderModal(true);
                }
              }}
              disabled={isCashClosed}
              className={`relative aspect-square min-h-[90px] rounded-[24px] md:rounded-[36px] border flex flex-col items-center justify-center transition-all duration-300 group soft-shadow ${
                isCashClosed ? 'opacity-50 cursor-not-allowed grayscale' : ''
              } ${
                isOccupied
                  ? mesa.id === '13' 
                    ? 'bg-brand-50 border-brand-300 text-brand-800 hover:bg-brand-100 -translate-y-1 shadow-md' 
                    : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100 -translate-y-1 shadow-md'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
                <div className={`font-display font-black leading-tight uppercase px-1 text-center ${
                  label.length > 3 ? 'text-[11px] md:text-base' : 'text-2xl md:text-3xl'
                }`}>
                  {label}
                </div>
                
                {mesa.id !== '13' && (
                  <div className="absolute top-2 right-3 text-[7px] md:text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                    {mesa.sillas || 0}
                    <span className="ml-0.5 opacity-50"> sillas</span>
                  </div>
                )}
              
              {isOccupied && (
                <div className="absolute bottom-1.5 md:bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center w-full px-2">
                  <div className="flex flex-col items-center leading-none mb-1">
                    <span className="text-[6px] md:text-[8px] font-black text-rose-600/60 uppercase tracking-tighter truncate max-w-full">
                      {allMesaActiveOrders[0]?.usuarioNombre?.split(' ')[0]}
                    </span>
                    <span className="text-[5px] md:text-[6px] font-black text-rose-300 uppercase tracking-widest mt-0.5">
                      #{allMesaActiveOrders[0]?.id.split('-')[1]}
                    </span>
                  </div>
                  
                  <div className="flex gap-1 md:gap-1.5">
                    {allMesaActiveOrders[0]?.items.slice(0, 4).map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full border border-white/20 ${item.estado === 'SERVIDO' ? 'bg-emerald-500' : 'bg-brand-400 animate-pulse'}`} 
                        />
                    ))}
                    {allMesaActiveOrders[0]?.items.length > 4 && (
                        <div className="text-[5px] font-bold text-slate-400">...</div>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Order Detail Panel */}
      {selectedMesa && (
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
                        {getMesaLabel(mesas.find(m => m.id === selectedMesa) || { id: selectedMesa, nombre: selectedMesa, estado: 'LIBRE' } as Mesa)}
                      </div>
                      <div>
                        <h2 className="text-lg md:text-2xl font-display font-bold text-brand-500 leading-tight">
                          {mesas.find(m => m.id === selectedMesa)?.nombre || selectedMesa}
                          {mesaOrders.length > 1 && <span className="ml-2">- Pedido #{orderIdx + 1}</span>}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4">
                    {activeOrder.items.map((item) => {
                      const product = products.find(p => p.id === item.productoId);
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
                        className="flex-1 xs:flex-none py-3.5 md:py-4 px-6 md:px-8 bg-brand-600 text-white text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-brand-700 transition-all soft-shadow active:scale-95"
                      >
                        Pagar
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
          mesaName={mesas.find(m => m.id === selectedMesa)?.nombre || ''}
        />
      )}
    </div>
  );
};
