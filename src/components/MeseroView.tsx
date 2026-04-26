/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Plus, Minus, Check, Clock, User, X, ChevronRight, Soup, Utensils as Meal } from 'lucide-react';
import { motion } from 'motion/react';
import { OrderItem, ItemStatus } from '../types';
import { OrderModal } from './OrderModal.tsx';

export const MeseroView: React.FC = () => {
  const { mesas, orders, createOrder, products, currentMenu, updateItemStatus, addItemsToOrder } = useApp();
  const [selectedMesa, setSelectedMesa] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const mesaOrders = orders.filter(o => o.mesaId === selectedMesa && o.estado === 'ABIERTO');

  return (
    <div className="p-3 md:p-8 space-y-6 md:space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Panel de Sala</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none bg-white border border-slate-300 px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">
            Filtrar Mesas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
        {mesas.map((mesa) => {
          const isOccupied = mesa.estado === 'OCUPADA';
          const mesaActiveOrders = orders.filter(o => o.mesaId === mesa.id && o.estado === 'ABIERTO');

          return (
            <button
              key={mesa.id}
              onClick={() => {
                setSelectedMesa(mesa.id);
                if (!isOccupied || mesa.id === '13') {
                  setShowOrderModal(true);
                }
              }}
              className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all group ${
                isOccupied
                  ? mesa.id === '13' 
                    ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-100 -translate-y-1' 
                    : 'bg-red-600 border-red-700 text-white shadow-lg shadow-red-200 -translate-y-1'
                  : 'bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-100'
              }`}
            >
              <div className={`text-[10px] font-black px-2 py-0.5 rounded-full mb-1 uppercase tracking-tighter ${
                isOccupied 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/20 text-white'
              }`}>
                {mesa.id === '13' ? 'LLEVAR' : `MESA ${mesa.id}`}
              </div>
              <span className="text-2xl font-black">
                {mesa.id === '13' ? 'PL' : mesa.id}
              </span>
              
              {isOccupied && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                   {mesaActiveOrders[0]?.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`w-1.5 h-1.5 rounded-full ${item.estado === 'SERVIDO' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} 
                      />
                   ))}
                   {mesaActiveOrders.length > 1 && (
                      <div className="text-[8px] font-bold text-orange-600 bg-orange-50 px-1 rounded ml-1">
                        +{mesaActiveOrders.length - 1}
                      </div>
                   )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Order Detail Panel */}
      {selectedMesa && mesaOrders.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
               {mesaOrders.length} {mesaOrders.length === 1 ? 'Pedido Activo' : 'Pedidos Activos'}
             </h3>
             <button onClick={() => setSelectedMesa(null)} className="p-2 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full">
               <X className="w-5 h-5" />
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {mesaOrders.map((activeOrder, orderIdx) => (
              <motion.div 
                key={activeOrder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] md:rounded-3xl p-5 md:p-8 shadow-2xl shadow-slate-200 border border-orange-50 space-y-5 md:space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-600 text-white rounded-2xl flex items-center justify-center text-xl md:text-2xl font-bold shadow-xl shadow-orange-200">
                      {selectedMesa}
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                        {selectedMesa === '13' ? 'Para Llevar' : `Mesa ${selectedMesa}`} 
                        {mesaOrders.length > 1 && ` #${orderIdx + 1}`}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-400 text-[10px] md:text-sm font-medium">
                        <div className="flex items-center gap-1">
                          <User className="w-3 md:w-3.5 h-3 md:h-3.5" />
                          <span>{activeOrder.cliente}</span>
                        </div>
                        <span className="hidden xs:inline text-slate-300">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" />
                          <span className="font-mono">{activeOrder.hora}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                  {activeOrder.items.map((item) => {
                    const product = products.find(p => p.id === item.productoId);
                    const isServed = item.estado === 'SERVIDO';

                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border transition-all ${
                          isServed 
                            ? 'bg-emerald-50 border-emerald-100' 
                            : 'bg-white border-amber-200 border-2 border-dashed'
                        }`}
                      >
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                          <div className={`shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${
                            isServed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white shadow-lg shadow-amber-100 animate-pulse'
                          }`}>
                            {product?.tipo === 'SOPA' ? <Soup className="w-4 h-4 md:w-5 md:h-5" /> : <Meal className="w-4 h-4 md:w-5 md:h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                               <p className="font-bold text-slate-800 leading-tight text-sm md:text-base truncate">{product?.nombre}</p>
                               {item.cantidad > 1 && (
                                  <span className="shrink-0 bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[8px] md:text-[10px] font-black">
                                     x{item.cantidad}
                                  </span>
                               )}
                            </div>
                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${
                              isServed ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {isServed ? 'SERVIDO' : 'EN COCINA'}
                            </span>
                          </div>
                        </div>

                        {!isServed ? (
                          <button
                            onClick={() => updateItemStatus(activeOrder.id, item.id, 'SERVIDO')}
                            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-md transition-all active:scale-95"
                          >
                            Servir
                          </button>
                        ) : (
                          <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-5 md:pt-6 border-t border-slate-100 flex flex-col xs:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col items-center xs:items-start">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Monto Total</span>
                    <p className="text-2xl md:text-3xl font-black text-orange-900 leading-none">S/ {activeOrder.total.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2 w-full xs:w-auto">
                    <button
                      onClick={() => {
                        setSelectedMesa(selectedMesa);
                        setShowOrderModal(true);
                      }}
                      className="flex-1 xs:flex-none py-3.5 px-6 bg-slate-900 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir
                    </button>
                    <button
                      className="flex-1 xs:flex-none py-3.5 px-6 bg-orange-600 text-white text-xs font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-100"
                    >
                      Cobrar Ticket
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showOrderModal && (
        <OrderModal
          onClose={() => setShowOrderModal(false)}
          onAdd={(items, clienteName) => {
             if (selectedMesa) {
                const existingOrder = orders.find(o => o.mesaId === selectedMesa && o.estado === 'ABIERTO');
                if (existingOrder && selectedMesa !== '13') { // Para llevar always creates new ones normally, but here we append to active
                   addItemsToOrder(existingOrder.id, items);
                } else {
                   createOrder(selectedMesa, clienteName || 'Cliente', items);
                }
                setShowOrderModal(false);
             }
          }}
          products={products}
          currentMenu={currentMenu}
          mesaId={selectedMesa || ''}
        />
      )}
    </div>
  );
};
