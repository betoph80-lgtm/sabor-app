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
  initialClienteName?: string;
  title?: string;
}> = ({ onClose, onAdd, products, currentMenu, mesaId, initialClienteName = '', title = 'Nuevo Pedido' }) => {
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

  const menuItems = products.filter(p => 
    p.categoria === 'MENÚ' && currentMenu.some(m => m.productoId === p.id)
  );
  const soups = menuItems.filter(p => p.tipo === 'SOPA');
  const mains = menuItems.filter(p => p.tipo === 'SEGUNDO');
  const extras = products.filter(p => p.categoria === 'EXTRA' && currentMenu.some(m => m.productoId === p.id));
  const beverages = products.filter(p => p.categoria === 'BEBIDA' && currentMenu.some(m => m.productoId === p.id));

  const totalSelected = Object.keys(quantities).reduce((acc, id) => acc + quantities[id], 0);
  const isNameChanged = clienteName.trim() !== initialClienteName.trim();
  const canConfirm = totalSelected > 0 || (isNameChanged && clienteName.trim() !== '');

  const ProductCard = ({ p }: { p: Product }) => {
    const qty = quantities[p.id] || 0;

    return (
      <div
        className={`p-4 rounded-[28px] border-2 transition-all flex flex-col justify-between soft-shadow ${
          qty > 0
            ? 'bg-brand-50 border-brand-500 ring-4 ring-brand-50/50'
            : 'bg-slate-50 border-transparent hover:bg-slate-100/80 hover:border-slate-200'
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="font-display font-bold text-slate-900 text-xs md:text-sm leading-tight uppercase line-clamp-2">{p.nombre}</div>
          <div className="text-[10px] text-brand-600 font-bold bg-white px-2 py-1 rounded-lg soft-shadow shrink-0">S/ {p.precio}</div>
        </div>
        
        <div className="flex items-center justify-between mt-3 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 border border-white/20 soft-shadow">
          <button
            onClick={() => updateQuantity(p.id, -1)}
            className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 active:scale-90 transition-transform shadow-sm hover:text-rose-500"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-brand-900 w-10 text-center text-xl">{qty}</span>
          <button
            onClick={() => updateQuantity(p.id, 1)}
            className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform soft-shadow hover:bg-brand-700"
          >
            <Plus className="w-5 h-5" />
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
        className="bg-white w-full max-w-2xl sm:rounded-[40px] rounded-t-[40px] p-6 pb-10 space-y-6 max-h-[95vh] overflow-auto no-scrollbar soft-shadow"
      >
        <div className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10 -mx-6 px-6 pb-4 border-b border-slate-50">
          <div>
            <h3 className="text-2xl font-display font-bold text-slate-900 tracking-tight leading-none">{title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-brand-600 text-[10px] font-bold uppercase tracking-[0.2em] bg-brand-50 px-2 py-0.5 rounded-full">Espacio N° {mesaId}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-100">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 soft-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-500 shrink-0 soft-shadow">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nombre del comensal</label>
                <input
                  type="text"
                  value={clienteName}
                  onChange={(e) => setClienteName(e.target.value)}
                  placeholder="Identificar pedido..."
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-300 text-base"
                />
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-brand-400 shadow-sm shadow-brand-200"></div>
            Entrada (Incluida en Menú)
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {soups.slice(0, 1).map(p => (
              <div key={p.id} className="flex items-center justify-between p-5 bg-brand-50 rounded-[28px] border border-brand-100 soft-shadow">
                <div className="flex flex-col">
                  <span className="font-display font-bold text-brand-900 uppercase tracking-tight text-lg leading-none">{p.nombre}</span>
                  <span className="text-[10px] font-bold text-brand-500 uppercase mt-2 tracking-widest">Acompañamiento del día</span>
                </div>
                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-2 soft-shadow border border-white/40">
                  <button
                    onClick={() => updateQuantity(p.id, -1)}
                    className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="font-display font-bold text-brand-900 w-10 text-center text-2xl">{quantities[p.id] || 0}</span>
                  <button
                    onClick={() => updateQuantity(p.id, 1)}
                    className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform soft-shadow"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
            Segundos del Menú (S/ 9.00)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mains.map(p => <div key={p.id}><ProductCard p={p} /></div>)}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            Platos Extras
          </h4>
           <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {extras.map(p => <div key={p.id}><ProductCard p={p} /></div>)}
           </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
            Bebidas
          </h4>
           <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {beverages.map(p => <div key={p.id}><ProductCard p={p} /></div>)}
           </div>
        </section>

        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md pt-6 -mx-6 px-6 mt-4 border-t border-slate-50 pb-2">
          <button
            onClick={handleAdd}
            disabled={!canConfirm}
            className="w-full py-5 bg-slate-900 text-white font-bold uppercase tracking-[0.2em] text-[11px] rounded-[24px] soft-shadow disabled:opacity-20 disabled:grayscale transition-all active:scale-95 hover:bg-slate-800"
          >
            {totalSelected > 0 ? `Confirmar ${totalSelected} Items Seleccionados` : 'Actualizar Información'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
