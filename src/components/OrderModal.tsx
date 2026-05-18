/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Minus, X, User } from 'lucide-react';
import { motion } from 'motion/react';
import { OrderItem, Product, MenuItem } from '../types';

export const OrderModal: React.FC<{
  onClose: () => void;
  onAdd: (items: Partial<OrderItem>[], clienteName: string) => void;
  products: Product[];
  currentMenu: MenuItem[];
  mesaId: string;
  mesaName: string;
  initialClienteName?: string;
  title?: string;
}> = ({ onClose, onAdd, products, currentMenu, mesaId, mesaName, initialClienteName = '', title = 'Nuevo Pedido' }) => {
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [clienteName, setClienteName] = useState(initialClienteName);

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      return {
        ...prev,
        [id]: Math.max(0, current + delta)
      };
    });
  };

  const handleAdd = () => {
    const items = Object.keys(quantities)
      .filter(id => quantities[id] > 0)
      .map(id => ({ productoId: id, cantidad: quantities[id] }));
    onAdd(items, clienteName);
  };

  const categories = Array.from(new Set(products.map(p => p.categoria))) as string[];
  
  // Custom sorting to keep MENU first, then others
  const sortedCategories = categories.sort((a, b) => {
    if (a === 'MENÚ') return -1;
    if (b === 'MENÚ') return 1;
    return a.localeCompare(b);
  });

  const totalSelected = Object.keys(quantities).reduce((acc, id) => acc + quantities[id], 0);
  const isNameChanged = clienteName.trim() !== initialClienteName.trim();
  const canConfirm = totalSelected > 0 || (isNameChanged && clienteName.trim() !== '');

  const ProductCard = ({ p }: { p: Product }) => {
    const qty = quantities[p.id] || 0;

    return (
      <div
        className={`p-3 rounded-[20px] border-2 transition-all flex flex-col justify-between soft-shadow ${
          qty > 0
            ? 'bg-brand-50 border-brand-500 ring-4 ring-brand-50/50'
            : 'bg-slate-50 border-transparent hover:bg-slate-100/80 hover:border-slate-200'
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="font-display font-bold text-slate-900 text-xs md:text-sm leading-tight uppercase line-clamp-2">{p.nombre}</div>
          <div className="text-[10px] text-brand-600 font-bold bg-white px-1.5 py-0.5 rounded-lg soft-shadow shrink-0">S/ {p.precio}</div>
        </div>
        
        <div className="flex items-center justify-between mt-2 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/20 soft-shadow">
          <button
            onClick={() => updateQuantity(p.id, -1)}
            className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-transform shadow-sm hover:text-rose-500"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="font-display font-bold text-brand-900 w-8 text-center text-base">{qty}</span>
          <button
            onClick={() => updateQuantity(p.id, 1)}
            className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform soft-shadow hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-2xl sm:rounded-[40px] rounded-t-[40px] p-4 sm:p-6 pb-8 space-y-4 max-h-[95vh] overflow-auto no-scrollbar soft-shadow"
      >
        <div className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 pb-3 border-b border-slate-50">
          <div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-slate-900 tracking-tight leading-none">{title}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-brand-600 text-[9px] font-bold uppercase tracking-[0.2em] bg-brand-50 px-2 py-0.5 rounded-full">{mesaName}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-100">
            <X className="w-5 h-5 sm:w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-50 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-100 soft-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-500 shrink-0 soft-shadow">
                <User className="w-5 h-5 sm:w-6 h-6" />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Nombre del comensal</label>
                <input
                  type="text"
                  value={clienteName}
                  onChange={(e) => setClienteName(e.target.value)}
                  placeholder="Identificar pedido..."
                  className="w-full bg-white border border-slate-100 rounded-xl sm:rounded-2xl py-3 px-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-300 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {sortedCategories.map(cat => {
          const catProducts = products.filter(p => 
            p.categoria === cat && currentMenu.some(m => m.productoId === p.id)
          );

          if (catProducts.length === 0) return null;

          if (cat === 'MENÚ') {
            const soups = catProducts.filter(p => p.tipo === 'SOPA');
            const mains = catProducts.filter(p => p.tipo === 'SEGUNDO');

            return (
              <React.Fragment key={cat}>
                <section className="space-y-3">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-400 shadow-sm shadow-brand-200"></div>
                    Entrada (Menú)
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {soups.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-brand-50 rounded-[20px] border border-brand-100 soft-shadow">
                        <div className="flex flex-col">
                          <span className="font-display font-bold text-brand-900 uppercase tracking-tight text-base leading-none">{p.nombre}</span>
                          <span className="text-[9px] font-bold text-brand-500 uppercase mt-1 tracking-widest">Entrada del día</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1 soft-shadow border border-white/40">
                          <button
                            onClick={() => updateQuantity(p.id, -1)}
                            className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-display font-bold text-brand-900 w-8 text-center text-xl">{quantities[p.id] || 0}</span>
                          <button
                            onClick={() => updateQuantity(p.id, 1)}
                            className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform soft-shadow"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                    Segundos del Menú
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mains.map(p => <div key={p.id}><ProductCard p={p} /></div>)}
                  </div>
                </section>
              </React.Fragment>
            );
          }

          return (
            <section key={cat} className="space-y-2">
              <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                {cat}
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {catProducts.map(p => <div key={p.id}><ProductCard p={p} /></div>)}
              </div>
            </section>
          );
        })}

        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 mt-2 border-t border-slate-50 pb-2 z-20">
          <button
            onClick={handleAdd}
            disabled={!canConfirm}
            className="w-full py-4 bg-slate-900 text-white font-bold uppercase tracking-[0.2em] text-[10px] rounded-[20px] soft-shadow disabled:opacity-20 disabled:grayscale transition-all active:scale-95 hover:bg-slate-800"
          >
            {totalSelected > 0 ? `Confirmar ${totalSelected} Items Seleccionados` : 'Actualizar Información'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
