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
  const [notes, setNotes] = useState<{[key: string]: string}>({});
  const [clienteName, setClienteName] = useState(initialClienteName);

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const nextVal = current + delta;
      if (delta > 0) {
        const menuI = currentMenu.find(m => m.productoId === id);
        if (menuI && menuI.stockActual < nextVal) {
          alert(`¡ATENCIÓN! No hay stock suficiente para este producto. Stock disponible: ${menuI.stockActual}`);
          return prev;
        }
      }
      return {
        ...prev,
        [id]: Math.max(0, nextVal)
      };
    });
  };

  const handleInputChange = (id: string, value: string) => {
    if (value === '') {
      setQuantities(prev => ({ ...prev, [id]: 0 }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;

    const menuI = currentMenu.find(m => m.productoId === id);
    if (menuI && menuI.stockActual < parsed) {
      alert(`¡ATENCIÓN! No hay stock suficiente para este producto. Stock disponible: ${menuI.stockActual}`);
      setQuantities(prev => ({ ...prev, [id]: menuI.stockActual }));
      return;
    }
    setQuantities(prev => ({ ...prev, [id]: parsed }));
  };

  const handleAdd = () => {
    const items = Object.keys(quantities)
      .filter(id => quantities[id] > 0)
      .map(id => ({ 
        productoId: id, 
        cantidad: quantities[id], 
        notas: notes[id] || '' 
      }));

    // Real-time stock verification inside modal
    const insufficientStock: string[] = [];
    for (const item of items) {
      const menuI = currentMenu.find(m => m.productoId === item.productoId);
      const product = products.find(p => p.id === item.productoId);
      if (menuI && menuI.stockActual < item.cantidad) {
        insufficientStock.push(`- ${product?.nombre || 'Producto'}: Solicitado ${item.cantidad}, Disponible: ${menuI.stockActual}`);
      }
    }

    if (insufficientStock.length > 0) {
      alert(`¡ATENCIÓN! No hay stock suficiente para confirmar este pedido:\n\n${insufficientStock.join('\n')}\n\nPor favor, ajuste las cantidades.`);
      return;
    }

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

  const renderProductRow = (p: Product, showNote: boolean = false) => {
    const qty = quantities[p.id] || 0;
    const menuI = currentMenu.find(m => m.productoId === p.id);
    const hasCustomPrice = menuI && menuI.precioPersonalizado !== undefined;
    const displayedPrice = hasCustomPrice ? menuI.precioPersonalizado! : p.precio;

    return (
      <div
        className={`flex items-center gap-3 py-2 px-3 rounded-2xl border-2 transition-all duration-300 ${
          qty > 0
            ? 'bg-violet-50/70 border-brand-500 ring-4 ring-brand-50/80 shadow-md shadow-brand-50/20'
            : 'bg-slate-50/60 border-slate-100/50 hover:bg-slate-100/50 hover:border-slate-200/60'
        }`}
      >
        <div className="flex-1 min-w-0 pr-1">
          <div className={`font-display font-bold text-xs uppercase tracking-tight truncate transition-colors duration-200 ${
            qty > 0 ? 'text-violet-900' : 'text-slate-800'
          }`}>
            {p.nombre}
            {hasCustomPrice && <span className="text-violet-600 ml-1 text-[9px] font-black" title="Precio adaptado hoy">★</span>}
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
            S/ {displayedPrice.toFixed(2)}
          </div>
        </div>

        <div className="flex items-center bg-white rounded-xl p-0.5 shrink-0 border border-slate-200/70 shadow-sm transition-all duration-300 hover:border-brand-300">
          <button
            type="button"
            onClick={() => updateQuantity(p.id, -1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-transform bg-transparent"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qty === 0 ? '' : qty}
            onChange={(e) => handleInputChange(p.id, e.target.value)}
            className="font-display font-black text-slate-800 w-8 text-center text-sm outline-none bg-transparent"
            placeholder="0"
          />
          <button
            type="button"
            onClick={() => updateQuantity(p.id, 1)}
            className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm hover:bg-brand-700"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showNote && (
          <div className="w-[120px] xs:w-[155px] sm:w-[200px] shrink-0">
            <input
              type="text"
              value={notes[p.id] || ''}
              disabled={qty === 0}
              onChange={(e) => {
                const val = e.target.value;
                setNotes(prev => ({ ...prev, [p.id]: val }));
              }}
              placeholder={qty > 0 ? "Sin ají, extra..." : "Activar primero"}
              className={`w-full border rounded-xl px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold outline-none transition-all duration-305 ${
                qty > 0 
                  ? 'bg-white text-slate-800 border-slate-200 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10' 
                  : 'bg-slate-100/50 text-slate-400 border-slate-100 cursor-not-allowed opacity-40 placeholder:text-slate-350'
              }`}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-2xl sm:rounded-[32px] rounded-t-[28px] p-3 sm:p-6 pb-6 space-y-3 sm:space-y-4 max-h-[92vh] sm:max-h-[95vh] overflow-auto no-scrollbar soft-shadow"
      >
        <div className="flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-20 -mx-3 px-3 sm:-mx-6 sm:px-6 pb-2.5 border-b border-slate-50">
          <div>
            <h3 className="text-base sm:text-2xl font-display font-bold text-slate-900 tracking-tight leading-none">{title}</h3>
            <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
              <span className="text-brand-600 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] bg-brand-50 px-2 py-0.5 rounded-full">{mesaName}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2.5 bg-slate-50 rounded-lg sm:rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-100">
            <X className="w-4 h-4 sm:w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="bg-slate-50 p-2.5 sm:p-4 rounded-xl sm:rounded-[24px] border border-slate-100/60">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="w-8 h-8 sm:w-11 sm:h-11 bg-white rounded-lg sm:rounded-2xl flex items-center justify-center text-brand-500 shrink-0 soft-shadow">
                <User className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
              </div>
              <div className="flex-1">
                <label className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Nombre del comensal</label>
                <input
                  type="text"
                  value={clienteName}
                  onChange={(e) => setClienteName(e.target.value)}
                  placeholder="Identificar pedido..."
                  className="w-full bg-white border border-slate-100 rounded-lg sm:rounded-xl py-2 px-3 font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-300 text-xs sm:text-sm"
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
                <section className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400"></div>
                    Entrada (Menú)
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {soups.map(p => (
                      <div key={p.id}>
                        {renderProductRow(p, false)}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 pb-0.5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                      Segundos del Menú
                    </h4>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest w-[120px] xs:w-[155px] sm:w-[200px] text-center shrink-0">
                      NOTA
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {mains.map(p => <div key={p.id}>{renderProductRow(p, true)}</div>)}
                  </div>
                </section>
              </React.Fragment>
            );
          }

          return (
            <section key={cat} className="space-y-1.5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                {cat}
              </h4>
              <div className="flex flex-col gap-1.5">
                {catProducts.map(p => <div key={p.id}>{renderProductRow(p, false)}</div>)}
              </div>
            </section>
          );
        })}

        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md pt-3 -mx-3 px-3 sm:-mx-6 sm:px-6 mt-1 border-t border-slate-50 pb-1 z-20 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 sm:py-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold uppercase tracking-[0.2em] text-[10px] rounded-xl sm:rounded-[20px] transition-all active:scale-95 text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canConfirm}
            className="flex-1.5 flex-[2] py-3.5 sm:py-4 bg-slate-900 text-white font-bold uppercase tracking-[0.2em] text-[10px] rounded-xl sm:rounded-[20px] soft-shadow disabled:opacity-20 disabled:grayscale transition-all active:scale-95 hover:bg-slate-800 text-center"
          >
            {totalSelected > 0 ? `Confirmar Pedido (${totalSelected})` : 'Confirmar Pedido'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
