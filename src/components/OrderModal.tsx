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
      .map(id => ({ productoId: id, cantidad: quantities[id] }));

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

  const ProductCard = ({ p }: { p: Product }) => {
    const qty = quantities[p.id] || 0;

    return (
      <div
        className={`p-2.5 sm:p-3 rounded-xl sm:rounded-[20px] border-2 transition-all flex flex-col justify-between soft-shadow ${
          qty > 0
            ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-50/50'
            : 'bg-slate-50 border-transparent hover:bg-slate-100/80 hover:border-slate-200'
        }`}
      >
        <div className="flex justify-between items-start gap-1.5">
          <div className="font-display font-bold text-slate-900 text-[11px] sm:text-xs md:text-sm leading-tight uppercase line-clamp-2">{p.nombre}</div>
          <div className="text-[9px] md:text-[10px] text-brand-600 font-bold bg-white px-1.5 py-0.5 rounded-md sm:rounded-lg soft-shadow shrink-0">S/ {p.precio}</div>
        </div>
        
        <div className="flex items-center justify-between mt-1.5 bg-white/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/20 soft-shadow">
          <button
            type="button"
            onClick={() => updateQuantity(p.id, -1)}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-transform shadow-sm hover:text-rose-500"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qty === 0 ? '' : qty}
            onChange={(e) => handleInputChange(p.id, e.target.value)}
            className="font-display font-black text-slate-800 w-10 sm:w-12 text-center text-sm sm:text-base focus:bg-slate-200/50 rounded-lg outline-none border border-transparent transition-all py-0.5 sm:py-1"
            placeholder="0"
          />
          <button
            type="button"
            onClick={() => updateQuantity(p.id, 1)}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform soft-shadow hover:bg-brand-700"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
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
                  <h4 className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-sm shadow-brand-200"></div>
                    Entrada (Menú)
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {soups.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-brand-50 rounded-xl sm:rounded-[20px] border border-brand-100/70 soft-shadow">
                        <div className="flex flex-col">
                          <span className="font-display font-bold text-brand-900 uppercase tracking-tight text-xs sm:text-base leading-none">{p.nombre}</span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-brand-500 uppercase mt-0.5 tracking-widest">Entrada del día</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-white/40 font-semibold text-slate-800">
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, -1)}
                            className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={(quantities[p.id] || 0) === 0 ? '' : (quantities[p.id] || 0)}
                            onChange={(e) => handleInputChange(p.id, e.target.value)}
                            className="font-display font-black text-slate-800 w-10 sm:w-12 text-center text-sm sm:text-xl focus:bg-slate-200/50 rounded-lg outline-none border border-transparent transition-all py-0.5"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, 1)}
                            className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-1.5">
                  <h4 className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                    Segundos del Menú
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {mains.map(p => <div key={p.id}><ProductCard p={p} /></div>)}
                  </div>
                </section>
              </React.Fragment>
            );
          }

          return (
            <section key={cat} className="space-y-1.5">
              <h4 className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                {cat}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {catProducts.map(p => <div key={p.id}><ProductCard p={p} /></div>)}
              </div>
            </section>
          );
        })}

        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md pt-3 -mx-3 px-3 sm:-mx-6 sm:px-6 mt-1 border-t border-slate-50 pb-1 z-20">
          <button
            onClick={handleAdd}
            disabled={!canConfirm}
            className="w-full py-3.5 sm:py-4 bg-slate-900 text-white font-bold uppercase tracking-[0.2em] text-[10px] rounded-xl sm:rounded-[20px] soft-shadow disabled:opacity-20 disabled:grayscale transition-all active:scale-95 hover:bg-slate-800"
          >
            {totalSelected > 0 ? `Confirmar ${totalSelected} Items` : 'Actualizar Información'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
