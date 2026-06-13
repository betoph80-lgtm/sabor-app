import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Plus, X, Sofa, Compass } from 'lucide-react';

export default function AdminMesasView() {
  const { mesas, addMesa, deleteMesa } = useApp();
  const [newMesaName, setNewMesaName] = useState('');
  const [newMesaSillas, setNewMesaSillas] = useState('4');

  const handleAddMesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMesaName.trim()) {
      const id = Math.random().toString(36).substr(2, 5);
      addMesa(id, newMesaName.trim(), parseInt(newMesaSillas) || 0);
      setNewMesaName('');
      setNewMesaSillas('4');
    }
  };

  // Safe sorting to prevent bugs
  const sortedMesas = [...mesas].sort((a, b) => {
    if (a.id === '13') return 1;
    if (b.id === '13') return -1;
    const numA = parseInt(a.nombre.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.nombre.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.01)] border border-slate-100 h-fit space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-600 block mb-1">Capacidad Logística</span>
            <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none animate-fade-in">Alta de Mesa</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1.5 leading-tight">Configura nuevas mesas físicas o unidades de reparto.</p>
          </div>

          <form onSubmit={handleAddMesa} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Identificador / Nombre</label>
              <input 
                type="text" 
                value={newMesaName}
                onChange={(e) => setNewMesaName(e.target.value)}
                placeholder="Ej: Mesa 12, Terraza B..."
                required
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Número de Sillas / Capacidad</label>
              <input 
                type="number" 
                min={0}
                max={20}
                value={newMesaSillas}
                onChange={(e) => setNewMesaSillas(e.target.value)}
                placeholder="Ej. 4"
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-md shadow-violet-100 active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar Mesa
            </button>
          </form>
        </div>

        {/* Floor Plan Visualizer column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-violet-600" />
              <h3 className="text-base font-display font-black text-slate-800 uppercase tracking-wider">Mapa del Salón de Comensales</h3>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-3 py-1 bg-violet-50 text-violet-700 border border-violet-100/40 rounded-full">
              {mesas.filter(m => m.id !== '13').length} Mesas registradas
            </span>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-6 md:p-8 border border-slate-200/40 min-h-[400px] flex flex-col justify-between">
            
            {/* Visual floor map grid showing actual chairs dynamically */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {sortedMesas.map(mesa => {
                const chairCount = mesa.sillas || 0;
                
                // Construct a little physical map dot layout
                const chairsRow = Array.from({ length: Math.min(chairCount, 8) });

                return (
                  <div 
                    key={mesa.id} 
                    className={`group relative rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between min-h-[110px] ${
                      mesa.id === '13'
                        ? 'bg-gradient-to-br from-indigo-50/60 to-white border-indigo-200 text-indigo-900 shadow-[0_4px_16px_rgba(99,102,241,0.04)] hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-violet-300 text-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-display font-black text-sm uppercase tracking-tight">
                        {mesa.id === '13' ? 'PARA LLEVAR' : mesa.nombre}
                      </span>
                      
                      {mesa.id !== '13' && (
                        <button 
                          onClick={() => deleteMesa(mesa.id)}
                          className="w-6 h-6 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                          title="Eliminar mesa"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Chair visualizer dots representation */}
                    {mesa.id !== '13' ? (
                      <div className="space-y-2 pt-2">
                        <div className="flex flex-wrap gap-1">
                          {chairsRow.map((_, i) => (
                            <span 
                              key={i} 
                              className="w-2 h-2 rounded-full bg-violet-400 border border-violet-500/10 shadow-[0_1px_3px_rgba(139,92,246,0.2)] animate-pulse" 
                              style={{ animationDelay: `${i * 150}ms` }}
                            />
                          ))}
                          {chairCount > 8 && (
                            <span className="text-[7.5px] font-black text-violet-600 leading-none pl-0.5">
                              +{chairCount - 8}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                          Capacidad: {chairCount} Sillas
                        </span>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <span className="text-[8.5px] font-black text-indigo-500 uppercase tracking-widest block">
                          REPARTO EXTERNO
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                          Unidad Virtual de Empaque
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sub-legend */}
            <div className="mt-8 pt-4 border-t border-slate-200/40 flex items-center gap-2 text-slate-400">
              <Sofa className="w-4 h-4 text-slate-400" />
              <p className="text-[9.5px] font-bold uppercase tracking-wide leading-none">
                La visualización de mesa replica la distribución operativa de sillas de forma proporcional en tiempo real.
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
