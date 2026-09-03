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
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">Pizarra de Disponibilidad diaria</span>
            <h3 className="text-base font-display font-black text-slate-900 dark:text-white uppercase tracking-wider hidden sm:block">Almuerzos en Venta</h3>
          </div>
        </div>

        {/* Categories sliding filter pill line */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-tight rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product toggle scrolling board */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-[32px] p-5 border border-slate-200/35 dark:border-slate-800 min-h-[400px] max-h-[650px] overflow-y-auto no-scrollbar space-y-3">
          {products.filter(p => p.categoria === activeCategory).length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] space-y-2 text-slate-400 dark:text-slate-500">
              <Utensils className="w-9 h-9 text-slate-300 dark:text-slate-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sin platos en catálogo</p>
              <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Regístralos primero en la pestaña "Productos"</span>
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
                        ? 'bg-gradient-to-br from-brand-50/80 to-white dark:from-brand-950/40 dark:to-slate-900 border-brand-400 dark:border-brand-600 shadow-[0_4px_16px_rgba(109,40,217,0.06)]' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {product.imagen ? (
                          <img 
                            src={product.imagen} 
                            alt={product.nombre} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-[11px] font-black ${
                              product.categoria === 'MENÚ' ? 'bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300' :
                              product.categoria === 'EXTRA' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {product.categoria[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                          <p className={`font-black text-xs md:text-sm leading-tight truncate ${isInMenu ? 'text-brand-950 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {product.nombre}
                          </p>
                          <p className="text-[8.5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">S/. {product.precio.toFixed(2)} sugerido</p>
                      </div>
                    </div>
                    {isInMenu ? (
                      <CheckCircle2 className="w-5.5 h-5.5 text-brand-600 dark:text-brand-400 shrink-0" />
                    ) : (
                      <div className="w-5.5 h-5.5 rounded-full border-2 border-slate-200 dark:border-slate-700 shrink-0" />
                    )}
                  </button>

                  {/* Stock and custom pricing configure forms inside sliding boxes */}
                  {isInMenu && (
                    <div className="mx-2 bg-white/90 dark:bg-slate-900/90 border border-brand-100 dark:border-brand-900/50 rounded-2xl p-3.5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-1.5 duration-300">
                      
                      <div className="flex items-center gap-2.5">
                        <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none shrink-0">Roscas / Stock Inicial</span>
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
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white rounded-lg px-2 py-1.5 text-xs font-black text-slate-800 dark:text-white outline-none text-center focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500/20 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none shrink-0">Precio Personalizado (S/.)</span>
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
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:text-slate-900 dark:focus:text-white rounded-lg px-2 py-1.5 text-xs font-black text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none text-center focus:border-brand-500 dark:focus:border-brand-400 focus:ring-1 focus:ring-brand-500/20 transition-colors"
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
