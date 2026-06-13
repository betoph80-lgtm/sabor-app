import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { exportToExcel } from '../utils/exportUtils.ts';
import { Utensils, Users, Database, Download, CheckCircle2, TrendingUp, X, Check, Clock } from 'lucide-react';

interface AdminServicioViewProps {
  setShowReport: (show: boolean) => void;
}

export default function AdminServicioView({ setShowReport }: AdminServicioViewProps) {
  const {
    currentMenu, products, toggleProductInMenu, updateMenuItemStock,
    mesas, updateMesa, deleteMesa, orders, selectedDate, customers,
    categories, resetStock, requestConfirmation
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('MENÚ');
  const [editingMesaId, setEditingMesaId] = useState<string | null>(null);
  const [tempMesaSillas, setTempMesaSillas] = useState<string>('');

  // Settle calculations
  const occupiedTables = mesas.filter(mesa => {
    return orders.some(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
  });
  const totalTablesCount = mesas.filter(m => m.id !== '13').length;
  const occupiedCount = occupiedTables.filter(m => m.id !== '13').length;
  const freeCount = totalTablesCount - occupiedCount;
  const deliveryOrdersCount = orders.filter(o => o.mesaId === '13' && o.estado === 'ABIERTO' && o.fecha === selectedDate).length;
  const occupancyPercentage = totalTablesCount > 0 ? Math.round((occupiedCount / totalTablesCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* LEFT: Menu Selection Command Column */}
      <div className="md:col-span-7 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-violet-600 animate-pulse" />
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
              className={`flex-1 py-2 px-3.5 text-[9.5px] font-black uppercase tracking-tight rounded-xl transition-all whitespace-nowrap ${
                activeCategory === cat ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product toggle scrolling board */}
        <div className="bg-slate-50/50 rounded-[32px] p-5 border border-slate-200/35 min-h-[400px] max-h-[600px] overflow-y-auto no-scrollbar space-y-3">
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
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 relative text-left outline-none ${
                      isInMenu 
                        ? 'bg-gradient-to-br from-violet-50/80 to-white border-violet-400 shadow-[0_4px_16px_rgba(139,92,246,0.06)]' 
                        : 'bg-white border-slate-150 hover:border-slate-350 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                          product.categoria === 'MENÚ' ? 'bg-violet-100 text-violet-700' :
                          product.categoria === 'EXTRA' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {product.categoria[0]}
                      </div>
                      <div className="min-w-0">
                          <p className={`font-black text-xs md:text-sm leading-tight truncate ${isInMenu ? 'text-violet-950' : 'text-slate-800'}`}>
                            {product.nombre}
                          </p>
                          <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">S/. {product.precio.toFixed(2)} sugerido</p>
                      </div>
                    </div>
                    {isInMenu ? (
                      <CheckCircle2 className="w-5.5 h-5.5 text-violet-600 shrink-0" />
                    ) : (
                      <div className="w-5.5 h-5.5 rounded-full border-2 border-slate-150 shrink-0" />
                    )}
                  </button>

                  {/* Stock and custom pricing configure forms inside sliding boxes */}
                  {isInMenu && (
                    <div className="mx-2 bg-white/70 border border-violet-100 rounded-2xl p-3.5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-1.5 duration-300">
                      
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
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 outline-none text-center focus:border-violet-400 transition-colors"
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
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 outline-none text-center focus:border-violet-400 transition-colors"
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

      {/* RIGHT: Table occupancy and Financial control column */}
      <div className="md:col-span-5 space-y-6 md:space-y-8">
        
        {/* Occupancy telemetry header board */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 px-1">
            <Users className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Monitoreo de Planta</span>
            <h3 className="text-base font-display font-black text-slate-900 uppercase tracking-wider hidden sm:block">Control de Mesas</h3>
          </div>

          {/* Progress bar ratio of occupancy */}
          <div className="bg-white rounded-2xl p-4 border border-slate-150/50 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span className="text-slate-550">Uso de Capacidad</span>
              <span className="text-violet-600">{occupancyPercentage}% Ocupado</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-violet-500 to-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
            <div className="flex gap-4 pt-1.5 justify-between">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Disponibles: {freeCount}</span>
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Ocupadas: {occupiedCount}</span>
              </div>
              {deliveryOrdersCount > 0 && (
                <div className="flex gap-1.5 items-center animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span className="text-[8.5px] font-black text-indigo-500 uppercase tracking-widest">Para Llevar: {deliveryOrdersCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Miniature floor board list */}
          <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto no-scrollbar scroll-smooth pr-0.5">
            {mesas.map(mesa => {
              const activeOrder = orders.find(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
              const isOccupied = !!activeOrder;
              const isEditing = editingMesaId === mesa.id;
              
              return (
                <div key={mesa.id} className="group relative bg-white border border-slate-150/50 p-3 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-slate-350 transition-all leading-none min-h-[50px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input 
                        type="number"
                        className="flex-grow min-w-0 bg-slate-50 border border-violet-300 rounded-lg px-1.5 py-1 text-[9.5px] font-black text-center outline-none focus:bg-white"
                        value={tempMesaSillas}
                        onChange={(e) => setTempMesaSillas(e.target.value)}
                        onBlur={() => {
                          setTimeout(() => setEditingMesaId(null), 200);
                        }}
                        autoFocus
                      />
                      <button 
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent onBlur from executing first
                          updateMesa(mesa.id, { sillas: parseInt(tempMesaSillas) || 0 });
                          setEditingMesaId(null);
                        }}
                        className="shrink-0 w-5.5 h-5.5 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="flex flex-col min-w-0 cursor-pointer"
                        onClick={() => {
                          if (mesa.id !== '13') {
                            setEditingMesaId(mesa.id);
                            setTempMesaSillas((mesa.sillas || 0).toString());
                          }
                        }}
                      >
                        <span className="font-black text-slate-800 text-[10px] truncate">
                          {mesa.id === '13' ? 'Para Llevar' : mesa.nombre}
                        </span>
                        {isOccupied && activeOrder ? (
                           <span className="text-[7.5px] font-bold text-violet-500 uppercase tracking-tight mt-0.5 truncate max-w-[65px]" title={activeOrder.usuarioNombre}>
                             {activeOrder.usuarioNombre?.split(' ')[0]}
                           </span>
                        ) : (
                          mesa.id !== '13' && (
                            <span className="text-[7.5px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                              Cap: {mesa.sillas || 0} <span className="opacity-40">✎</span>
                            </span>
                          )
                        )}
                      </div>
                      <div className={`shrink-0 w-2 h-2 rounded-full shadow-sm ${isOccupied ? 'bg-violet-500 shadow-violet-200' : 'bg-emerald-500 shadow-emerald-200'}`}></div>
                      
                      {mesa.id !== '13' && (
                        <button 
                          onClick={() => deleteMesa(mesa.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-200 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-rose-50"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Executive closing finance column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Database className="w-5 h-5 text-violet-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Finanzas & Contabilidad</span>
            <h3 className="text-base font-display font-black text-slate-900 uppercase tracking-wider hidden sm:block">Herramientas Caja</h3>
          </div>
          
          {/* Day Restart warning banner but absolute class */}
          <div className="bg-rose-50/70 p-6 rounded-[28px] border border-rose-100/60 flex flex-col gap-4 shadow-[0_2px_12px_rgba(244,63,94,0.02)]">
            <div className="text-center">
              <span className="relative flex h-2 w-2 mx-auto mb-2 justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-bounce"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <p className="text-[9.5px] font-black uppercase tracking-[0.25em] text-rose-600 mb-1 leading-none">Cierre de Jornada Diaria</p>
              <p className="text-[10.5px] text-rose-550 font-bold uppercase tracking-tight mt-1 leading-tight">Procedimiento corporativo para resetear existencias e inventario.</p>
            </div>
            
            <button 
              onClick={() => {
                requestConfirmation(
                  `Reiniciar Jornada (${selectedDate})`,
                  `Se descargará un ARCHIVO EXCEL de respaldo contable automático de hoy y luego se REINICIARÁ EL INVENTARIO de la fecha ${selectedDate}. ¿Deseas proceder?`,
                  () => {
                    exportToExcel(orders.filter(o => o.fecha === selectedDate), customers, products, selectedDate);
                    resetStock();
                  }
                );
              }}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 hover:translate-y-[-1px] text-white rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] md:text-sm shadow-md shadow-rose-200 border-b-2 border-rose-800 transition-all active:scale-98"
            >
              CERRAR & GUARDAR JORNADA
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
