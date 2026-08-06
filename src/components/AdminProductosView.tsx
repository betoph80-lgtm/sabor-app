import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Utensils, Plus, Edit3, Trash2, X, Settings } from 'lucide-react';

export default function AdminProductosView() {
  const {
    products, addProduct, updateProduct, deleteProduct,
    categories, setAdminSubView
  } = useApp();

  const [newProduct, setNewProduct] = useState({ nombre: '', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 });
  const [activeCategory, setActiveCategory] = useState<string>('MENÚ');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreateModal = () => {
    setEditingId(null);
    setEditForm(null);
    setNewProduct({ nombre: '', categoria: activeCategory, tipo: 'SEGUNDO', precio: activeCategory === 'MENÚ' ? 9 : 0 });
    setIsModalOpen(true);
  };

  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({ ...product });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setEditForm(null);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.nombre.trim()) {
      addProduct(newProduct);
      setNewProduct({ nombre: '', categoria: activeCategory, tipo: 'SEGUNDO', precio: activeCategory === 'MENÚ' ? 9 : newProduct.precio });
      closeModal();
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editForm) {
      updateProduct(editingId, editForm);
      closeModal();
    }
  };

  const getCategoryTheme = (catName: string) => {
    switch (catName) {
      case 'MENÚ':
        return { text: 'text-brand-750 font-extrabold', bg: 'bg-brand-100 border-brand-200/50', chip: 'bg-brand-50 text-brand-600' };
      case 'EXTRA':
        return { text: 'text-rose-750', bg: 'bg-rose-100 border-rose-200/50', chip: 'bg-rose-50 text-rose-600' };
      case 'BEBIDA':
        return { text: 'text-amber-700', bg: 'bg-amber-100 border-amber-200/50', chip: 'bg-amber-50 text-amber-600' };
      default:
        return { text: 'text-slate-700', bg: 'bg-slate-100 border-slate-200/50', chip: 'bg-slate-50 text-slate-600' };
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header bar with controls */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-brand-600 block mb-1">Catálogo Maestro</span>
          <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none">
            Gestión de Productos ({products.length})
          </h3>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setAdminSubView('CATEGORIAS')}
            className="flex-1 sm:flex-initial px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-indigo-150 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" /> Categorías
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial px-5 py-3 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Category Tabs & Product List Grid */}
      <div className="space-y-4">
        <div className="flex gap-1.5 p-1 bg-slate-100/80 backdrop-blur-xs rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
              }}
              className={`flex-1 py-2.5 px-5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat ? 'bg-white text-brand-600 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat} ({products.filter(p => p.categoria === cat).length})
            </button>
          ))}
        </div>

        <div className="bg-slate-50 rounded-[32px] p-5 md:p-6 border border-slate-200/40 min-h-[350px]">
          {products.filter(p => p.categoria === activeCategory).length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] text-slate-400 space-y-3">
              <Utensils className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Sin ítems en la categoría {activeCategory}</p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                + Registrar en {activeCategory}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {products.filter(p => p.categoria === activeCategory).map(p => {
                const theme = getCategoryTheme(p.categoria);
                
                return (
                  <div 
                    key={p.id} 
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-150/80 shadow-[0_2px_10px_rgba(0,0,0,0.015)] group hover:border-brand-300 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-slate-800 text-xs md:text-sm truncate">{p.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black tracking-wider uppercase border rounded-md px-2 py-0.5 leading-none font-sans ${theme.bg} ${theme.text}`}>
                          {p.categoria === 'MENÚ' ? p.tipo : p.categoria}
                        </span>
                        <p className="text-[11px] font-black text-slate-700 font-mono">S/. {p.precio.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 pl-2">
                      <button 
                        onClick={() => startEdit(p)}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all cursor-pointer"
                        title="Editar Producto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar Producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING MODAL FORM FOR NEW / EDIT PRODUCT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-brand-600 block mb-1">Catálogo Maestro</span>
              <h3 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none">
                {editingId ? 'Modificar Producto' : 'Alta de Alimento'}
              </h3>
            </div>

            {editingId && editForm ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre</label>
                  <input 
                    type="text" 
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Categoría</label>
                    <select 
                      value={editForm.categoria}
                      onChange={(e) => setEditForm({...editForm, categoria: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Precio (S/.)</label>
                    <input 
                      type="number" 
                      step="0.10"
                      value={editForm.precio}
                      onChange={(e) => setEditForm({...editForm, precio: parseFloat(e.target.value) || 0})}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold outline-none"
                    />
                  </div>
                </div>

                {editForm.categoria === 'MENÚ' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Clasificación de Menú</label>
                    <select 
                      value={editForm.tipo}
                      onChange={(e) => setEditForm({...editForm, tipo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold outline-none"
                    >
                      <option value="SOPA">SOPA / ENTRADA</option>
                      <option value="SEGUNDO">SEGUNDO / PLATO DE FONDO</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3.5 font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-black uppercase text-[10px] tracking-wider transition-all shadow-md shadow-brand-200 cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre Completo del Producto</label>
                  <input 
                    type="text" 
                    value={newProduct.nombre}
                    onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})}
                    placeholder="Ej. Seco de Cabrito, Ceviche de Trucha..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-brand-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Categoría</label>
                    <select 
                      value={newProduct.categoria}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setNewProduct({...newProduct, categoria: cat, precio: cat === 'MENÚ' ? 9 : newProduct.precio});
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Precio Unitario (S/.)</label>
                    <input 
                      type="number" 
                      step="0.10"
                      value={newProduct.precio}
                      onChange={(e) => setNewProduct({...newProduct, precio: parseFloat(e.target.value) || 0})}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {newProduct.categoria === 'MENÚ' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Tipo de Plato (Menú)</label>
                    <select 
                      value={newProduct.tipo}
                      onChange={(e) => setNewProduct({...newProduct, tipo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 outline-none"
                    >
                      <option value="SOPA">SOPA / ENTRADA</option>
                      <option value="SEGUNDO">SEGUNDO / PLATO DE FONDO</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3.5 font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-black uppercase tracking-widest text-[10px] shadow-md shadow-brand-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
