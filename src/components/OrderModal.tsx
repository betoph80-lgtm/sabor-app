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
        className={`p-2.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
          qty > 0
            ? 'bg-violet-50 border-violet-500 ring-4 ring-violet-50/50'
            : 'bg-slate-50 border-transparent hover:bg-slate-100'
        }`}
      >
        <div className="flex justify-between items-start gap-1">
          <div className="font-black text-slate-800 text-[11px] leading-tight uppercase line-clamp-2">{p.nombre}</div>
          <div className="text-[9px] text-violet-600 font-bold bg-white px-1.5 py-0.5 rounded shadow-sm shrink-0">S/ {p.precio}</div>
        </div>
        
        <div className="flex items-center justify-between mt-1.5 bg-white/50 rounded-xl p-0.5 border border-slate-100">
          <button
            onClick={() => updateQuantity(p.id, -1)}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-transform shadow-sm"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="font-black text-violet-900 w-6 text-center text-base">{qty}</span>
          <button
            onClick={() => updateQuantity(p.id, 1)}
            className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center active:scale-95 transition-transform shadow-md shadow-violet-100"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="bg-white w-full max-w-2xl sm:rounded-[30px] rounded-t-[30px] p-3 pb-8 space-y-4 max-h-[95vh] overflow-auto no-scrollbar shadow-2xl"
      >
        <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-1">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{title}</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Mesa {mesaId}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center text-violet-500 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Nombre del Cliente</label>
              <input
                type="text"
                value={clienteName}
                onChange={(e) => setClienteName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 font-bold text-slate-800 outline-none focus:border-violet-500 transition-all placeholder:text-slate-300 text-sm"
              />
            </div>
          </div>
        </div>

        <section className="space-y-2">
          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
            Sopa del Día (Incluida en Menú)
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {soups.slice(0, 1).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-violet-50 rounded-2xl border border-violet-200 shadow-sm">
                <div className="flex flex-col">
                  <span className="font-black text-violet-800 uppercase tracking-tight text-sm leading-none">{p.nombre}</span>
                  <span className="text-[8px] font-bold text-violet-600 uppercase mt-1">Sin costo adicional con el Menú</span>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-xl p-0.5 shadow-sm">
                  <button
                    onClick={() => updateQuantity(p.id, -1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-violet-900 w-6 text-center text-base">{quantities[p.id] || 0}</span>
                  <button
                    onClick={() => updateQuantity(p.id, 1)}
                    className="w-8 h-8 rounded-lg bg-violet-500 text-white flex items-center justify-center active:scale-95 transition-transform shadow-md shadow-violet-100"
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

        <div className="sticky bottom-0 bg-white pt-2 border-t border-slate-100">
          <button
            onClick={handleAdd}
            disabled={!canConfirm}
            className="w-full py-4 bg-violet-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-violet-100 disabled:opacity-30 disabled:shadow-none hover:bg-violet-700 transition-all active:scale-95"
          >
            {totalSelected > 0 ? `Confirmar ${totalSelected} Items` : 'Confirmar Cambios'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
