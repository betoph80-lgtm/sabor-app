import React, { useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { Utensils, Plus, Edit3, Trash2, X, Tag, Settings } from 'lucide-react';

export default function AdminProductosView() {
  const {
    products, addProduct, updateProduct, deleteProduct,
    categories, addCategory, deleteCategory
  } = useApp();

  const [newProduct, setNewProduct] = useState({ nombre: '', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 });
  const [activeCategory, setActiveCategory] = useState<string>('MENÚ');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.nombre.trim()) {
      addProduct(newProduct);
      setNewProduct({ nombre: '', categoria: activeCategory, tipo: 'SEGUNDO', precio: activeCategory === 'MENÚ' ? 9 : newProduct.precio });
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editForm) {
      updateProduct(editingId, editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const getCategoryTheme = (catName: string) => {
    switch (catName) {
      case 'MENÚ':
        return { text: 'text-violet-750', bg: 'bg-violet-100 border-violet-200/50', chip: 'bg-violet-50 text-violet-600' };
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
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Creator Form Column */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.015)] border border-slate-100 h-fit space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-left">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-600 block mb-1">Catálogo Maestro</span>
              <h3 className="text-lg md:text-xl font-display font-black text-slate-800 tracking-tight leading-none">
                {editingId ? 'Modificar Plato' : 'Alta de Alimento'}
              </h3>
            </div>
            <button 
              onClick={() => {
                setShowCategoryManager(!showCategoryManager);
                // cancel inline edit if category manager is opened
                setEditingId(null);
              }}
              className="px-3 py-1.5 bg-slate-55 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider border border-indigo-150 transition-all flex items-center gap-1"
            >
              <Settings className="w-3 h-3" /> Categorías
            </button>
          </div>

          {showCategoryManager ? (
            <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-150/40 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-500 pl-0.5">Editor de Categorías</span>
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. POSTRE, HELADOS..."
                  required
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-violet-500"
                />
                <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white px-4 rounded-xl text-[9px] font-black uppercase tracking-wider">Añadir</button>
              </form>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center gap-1.5 bg-white border border-violet-200/50 px-3 py-1.5 rounded-full text-[9px] font-black text-violet-750 uppercase tracking-wide">
                    {cat}
                    {!['MENÚ', 'EXTRA', 'BEBIDA'].includes(cat) && (
                      <button onClick={() => deleteCategory(cat)} className="text-violet-300 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : editingId && editForm ? (
            <form onSubmit={handleUpdate} className="space-y-4 animate-in zoom-in-95 leading-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 pl-0.5">Modo Edición Activo</span>
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre</label>
                  <input 
                    type="text" 
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Categoría</label>
                    <select 
                      value={editForm.categoria}
                      onChange={(e) => setEditForm({...editForm, categoria: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                {editForm.categoria === 'MENÚ' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Clasificación de Menú</label>
                    <select 
                      value={editForm.tipo}
                      onChange={(e) => setEditForm({...editForm, tipo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    >
                      <option value="SOPA">SOPA / ENTRADA</option>
                      <option value="SEGUNDO">SEGUNDO / PLATO DE FONDO</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl py-3 font-black uppercase text-[9px] tracking-wider transition-all"
                  >
                    Retroceder
                  </button>
                  <button 
                    type="submit" 
                    className="flex-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3 font-black uppercase text-[9px] tracking-wider transition-all"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Nombre Completo del Producto</label>
                  <input 
                    type="text" 
                    value={newProduct.nombre}
                    onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})}
                    placeholder="Ej. Seco de Cabrito, Ceviche de Trucha..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:border-violet-500 outline-none transition-all"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {newProduct.categoria === 'MENÚ' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">Tipo de Plato (Menú)</label>
                    <select 
                      value={newProduct.tipo}
                      onChange={(e) => setNewProduct({...newProduct, tipo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="SOPA">SOPA / ENTRADA</option>
                      <option value="SEGUNDO">SEGUNDO / PLATO DE FONDO</option>
                    </select>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-md shadow-violet-100 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Guardar en Catálogo
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Product Roster Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
             {categories.map(cat => (
               <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setNewProduct(prev => ({ ...prev, categoria: cat, precio: cat === 'MENÚ' ? 9 : prev.precio }));
                  // Cancel active edit of other categories if category filter transitions
                  setEditingId(null);
                }}
                className={`flex-1 py-2 px-4 text-[9.5px] font-black uppercase tracking-tight rounded-xl transition-all whitespace-nowrap ${
                  activeCategory === cat ? 'bg-white text-violet-600 shadow-sm font-extrabold' : 'text-slate-400 hover:text-slate-600'
                }`}
               >
                 {cat}
               </button>
             ))}
          </div>

          <div className="bg-slate-50 rounded-[32px] p-5 md:p-6 border border-slate-200/40 min-h-[350px] max-h-[500px] overflow-y-auto no-scrollbar space-y-3">
             {products.filter(p => p.categoria === activeCategory).length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-400 space-y-2">
                 <Utensils className="w-8 h-8 text-slate-350" />
                 <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sin almuerzos en esta categoría</p>
                 <span className="text-[8.5px] font-medium text-slate-450 leading-tight">Usa el panel de la izquierda para sumar platos.</span>
               </div>
             ) : (
               products.filter(p => p.categoria === activeCategory).map(p => {
                 const theme = getCategoryTheme(p.categoria);
                 
                 return (
                   <div 
                     key={p.id} 
                     className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-150/40 shadow-[0_2px_10px_rgba(0,0,0,0.015)] group hover:border-violet-200 hover:shadow-sm transition-all duration-300"
                   >
                     <div className="flex-1 min-w-0 text-left">
                        <p className="font-bold text-slate-800 text-xs md:text-sm truncate">{p.nombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className={`text-[7.5px] font-black tracking-wider uppercase border rounded-md px-1.5 py-0.5 leading-none font-sans ${theme.bg} ${theme.text}`}>
                             {p.categoria === 'MENÚ' ? p.tipo : p.categoria}
                           </span>
                           <p className="text-[10px] font-black text-slate-500 font-mono">S/. {p.precio.toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="flex gap-1 shrink-0 pl-2">
                        <button 
                          onClick={() => startEdit(p)}
                          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-slate-50 rounded-lg transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => deleteProduct(p.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                     </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>

      </div>

    </div>
  );
}
