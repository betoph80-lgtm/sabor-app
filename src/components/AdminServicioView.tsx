import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Utensils, CheckCircle2 } from 'lucide-react';

interface AdminServicioViewProps {
  setShowReport: (show: boolean) => void;
}

export default function AdminServicioView({ setShowReport: _setShowReport }: AdminServicioViewProps) {
  const {
    currentMenu, products, toggleProductInMenu, updateMenuItemStock,
    selectedDate, categories
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('MENÚ');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Menu Selection Command Container */}
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-brand-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pizarra de Disponibilidad diaria</span>
            <h3 className="text-base font-display font-black text-slate-900 uppercase tracking-wider hidden sm:block">Almuerzos en Venta</h3>
          </div>
        </div>

        {/* Categories sliding filter pill line */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-tight rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat ? 'bg-white text-brand-600 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product toggle scrolling board */}
        <div className="bg-slate-50/50 rounded-[32px] p-5 border border-slate-200/35 min-h-[400px] max-h-[650px] overflow-y-auto no-scrollbar space-y-3">
          {products.filter(p => p.categoria === activeCategory).length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] space-y-2 text-slate-400">
              <Utensils className="w-9 h-9 text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-450">Sin platos en catálogo</p>
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-tight">Regístralos primero en la pestaña "Productos"</span>
            </div>
          ) : (
            products.filter(p => p.categoria === activeCategory).map(product => {
              const dailyMenu = currentMenu.filter(m => m.fecha === selectedDate);
              const isInMenu = dailyMenu.some(m => m.productoId === product.id);
              const menuItem = dailyMenu.find(m => m.productoId === product.id);

              return (
                <div key={product.id} className="space-y-2">
                  <button
                    onClick={() => toggleProductInMenu(product.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 relative text-left outline-none cursor-pointer ${
                      isInMenu 
                        ? 'bg-gradient-to-br from-brand-50/80 to-white border-brand-400 shadow-[0_4px_16px_rgba(109,40,217,0.06)]' 
                        : 'bg-white border-slate-150 hover:border-slate-350 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                          product.categoria === 'MENÚ' ? 'bg-brand-100 text-brand-700' :
                          product.categoria === 'EXTRA' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {product.categoria[0]}
                      </div>
                      <div className="min-w-0">
                          <p className={`font-black text-xs md:text-sm leading-tight truncate ${isInMenu ? 'text-brand-950' : 'text-slate-800'}`}>
                            {product.nombre}
                          </p>
                          <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">S/. {product.precio.toFixed(2)} sugerido</p>
                      </div>
                    </div>
                    {isInMenu ? (
                      <CheckCircle2 className="w-5.5 h-5.5 text-brand-600 shrink-0" />
                    ) : (
                      <div className="w-5.5 h-5.5 rounded-full border-2 border-slate-150 shrink-0" />
                    )}
                  </button>

                  {/* Stock and custom pricing configure forms inside sliding boxes */}
                  {isInMenu && (
                    <div className="mx-2 bg-white/70 border border-brand-100 rounded-2xl p-3.5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-1.5 duration-300">
                      
                      <div className="flex items-center gap-2.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none shrink-0">Roscas / Stock Inicial</span>
                        <div className="flex-1">
                          <input 
                            type="number"
                            min={0}
                            value={menuItem?.stockInicial ?? 25}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const currentPrice = menuItem?.precioPersonalizado;
                              if (product.categoria === 'BEBIDA') {
                                  updateMenuItemStock(product.id, val, val, currentPrice);
                              } else {
                                  updateMenuItemStock(product.id, val, undefined, currentPrice);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 outline-none text-center focus:border-brand-400 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none shrink-0">Precio Personalizado (S/.)</span>
                        <div className="flex-1">
                          <input 
                            type="number"
                            step="0.10"
                            min={0}
                            value={menuItem?.precioPersonalizado !== undefined ? menuItem.precioPersonalizado : ''}
                            placeholder={product.precio.toFixed(2)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const priceVal = raw === '' ? undefined : parseFloat(raw);
                              const currentStock = menuItem?.stockInicial ?? 25;
                              const currentStockActual = menuItem?.stockActual ?? 25;
                              updateMenuItemStock(product.id, currentStock, currentStockActual, priceVal);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 outline-none text-center focus:border-brand-400 transition-colors"
                          />
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
