import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Tags, Plus, Trash2, Layers, Package, AlertCircle, X } from 'lucide-react';

export default function AdminCategoriasView() {
  const { categories, addCategory, deleteCategory, products } = useApp();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsModalOpen(false);
    }
  };

  const isDefaultCategory = (cat: string) => ['MENÚ', 'EXTRA', 'BEBIDA'].includes(cat.toUpperCase());

  const getProductCount = (catName: string) => {
    return products.filter(p => p.categoria.toUpperCase() === catName.toUpperCase()).length;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header bar */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-brand-600 block mb-1">
            Catálogo Maestro
          </span>
          <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none">
            Gestión de Categorías ({categories.length})
          </h3>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto px-5 py-3 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nueva Categoría
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-slate-50 rounded-[32px] p-5 md:p-6 border border-slate-200/40 min-h-[300px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const count = getProductCount(cat);
            const isDefault = isDefaultCategory(cat);

            return (
              <div
                key={cat}
                className="bg-white border border-slate-150/80 p-5 rounded-2xl shadow-xs flex items-center justify-between group hover:border-brand-300 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 text-sm uppercase tracking-wide">
                        {cat}
                      </span>
                      {isDefault && (
                        <span className="text-[8px] font-black bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Base
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                      <Package className="w-3 h-3 text-slate-400" />
                      {count} {count === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                </div>

                {!isDefault && (
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar Categoría"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING MODAL FORM FOR NEW CATEGORY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-brand-600 block mb-1">
                Catálogo Maestro
              </span>
              <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none">
                Crear Nueva Categoría
              </h3>
              <p className="text-[11px] font-medium text-slate-400 mt-1.5">
                Añade familias de productos para organizar la carta y el menú diario.
              </p>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. POSTRES, ENTRADAS, LICORES..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-brand-500 outline-none transition-all"
                />
              </div>

              <div className="bg-amber-50/70 border border-amber-150/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-800 text-[10.5px] leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Categorías Protegidas:</strong> Las categorías base (MENÚ, EXTRA, BEBIDA) son esenciales para el sistema.
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3.5 font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-black uppercase text-[10px] tracking-widest shadow-md shadow-brand-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
