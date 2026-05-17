/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './AppContext.tsx';
import Layout from './components/Layout.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { MeseroView } from './components/MeseroView.tsx';
import { PedidosView } from './components/PedidosView.tsx';
import { CocinaView, CajaView } from './components/CocinaCajaViews.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import LoginView from './components/LoginView.tsx';
import { Database, Plus, Users, Utensils, CheckCircle2, Circle, Edit3, Trash2, X, TrendingUp, BarChart3, Download, LogOut } from 'lucide-react';
import { exportToExcel } from './utils/exportUtils.ts';

const AdminPanel = () => {
  const { 
    resetStock, currentMenu, products, addProduct, updateProduct, 
    deleteProduct, mesas, addMesa, deleteMesa, toggleProductInMenu, 
    requestConfirmation, isTodaySelected, orders, selectedDate,
    updateMenuItemStock, customers, categories, addCategory, deleteCategory,
    seedDatabase, logout, currentUser, appUsers, addAppUser, updateAppUser, deleteAppUser
  } = useApp();
  const [adminView, setAdminView] = useState<'PANEL' | 'PRODUCTOS' | 'USUARIOS' | 'MESAS' | 'CLIENTES' | 'DATABASE'>('PANEL');
  const [showReport, setShowReport] = useState(false);
  const [newMesaName, setNewMesaName] = useState('');
  const [newProduct, setNewProduct] = useState({ nombre: '', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 });
  const [newUser, setNewUser] = useState({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
  const [activeCategory, setActiveCategory] = useState<string>('MENÚ');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const handleAddMesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMesaName.trim()) {
      // Use numeric ID or random
      const id = Math.random().toString(36).substr(2, 5);
      addMesa(id, newMesaName.trim());
      setNewMesaName('');
    }
  };

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

  const SchemaTable = ({ title, description, fields }: { title: string, description: string, fields: { name: string, type: string, desc: string }[] }) => (
    <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-4">
        <h4 className="text-sm font-black text-violet-600 uppercase tracking-widest">{title}</h4>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{description}</p>
      </div>
      <div className="space-y-2">
        {fields.map(f => (
          <div key={f.name} className="flex flex-col p-3 bg-violet-50/30 rounded-2xl border border-violet-100/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-black text-slate-700 font-mono">{f.name}</span>
              <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-lg">{f.type}</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight font-medium">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
    <div className="w-full max-w-6xl space-y-8 pb-20">
       <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar mx-auto max-w-fit sticky top-4 z-40">
          {(['PANEL', 'PRODUCTOS', 'USUARIOS', 'MESAS', 'DATABASE'] as const).map(view => (
            <button 
              key={view}
              onClick={() => setAdminView(view as any)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                adminView === view 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {view === 'PANEL' ? 'Jornada' : view === 'DATABASE' ? 'Estructura DB' : view === 'USUARIOS' ? 'Personal' : view}
            </button>
          ))}
       </div>
       {adminView === 'DATABASE' && (
         <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-violet-600 p-8 md:p-10 rounded-[48px] text-white shadow-xl relative overflow-hidden">
               <Database className="absolute top-0 right-0 w-64 h-64 text-white/5 -translate-y-12 translate-x-12" />
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="space-y-2">
                   <h2 className="text-2xl font-display font-bold">Arquitectura de Datos</h2>
                   <p className="text-violet-100 text-sm max-w-2xl font-medium leading-relaxed">
                     Esquema técnico de las tablas principales que gestionan la lógica del negocio.
                     Diseñado para integridad relacional y alta disponibilidad.
                   </p>
                 </div>
                 <button 
                   onClick={() => requestConfirmation(
                     'Inicializar Tablas', 
                     'Esto restaurará las mesas y productos base si están vacíos. ¿Continuar?', 
                     seedDatabase
                   )}
                   className="bg-white text-violet-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-violet-50 transition-all flex items-center gap-2"
                 >
                   <Database className="w-4 h-4" />
                   Inicializar Sistema
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <SchemaTable 
                title="Table: Products"
                description="Catálogo maestro de alimentos y bebidas."
                fields={[
                  { name: 'id', type: 'string', desc: 'UUID único del producto.' },
                  { name: 'nombre', type: 'string', desc: 'Nombre descriptivo (Ej: Lomo Saltado).' },
                  { name: 'precio', type: 'number', desc: 'Monto base de venta.' },
                  { name: 'categoria', type: 'enum', desc: 'Segmento: MENÚ, EXTRA, BEBIDA.' },
                  { name: 'tipo', type: 'enum', desc: 'Sub-tipo para Menú: SOPA, SEGUNDO.' }
                ]}
              />
              <SchemaTable 
                title="Table: Orders"
                description="Registro transaccional de ventas y comandas."
                fields={[
                  { name: 'id', type: 'string', desc: 'ID correlativo (Ej: PEDIDO-001).' },
                  { name: 'mesaId', type: 'string', desc: 'Referencia a Mesa o 13 (Para Llevar).' },
                  { name: 'cliente', type: 'string', desc: 'Nombre del titular de la cuenta.' },
                  { name: 'items', type: 'array', desc: 'Colección de productos y cantidades.' },
                  { name: 'total', type: 'number', desc: 'Cálculo final de la orden.' },
                  { name: 'estado', type: 'enum', desc: 'ABIERTO, PAGADO, CREDITO.' },
                  { name: 'fecha', type: 'string', desc: 'Timestamp de creación (DD/MM/YYYY).' }
                ]}
              />
              <SchemaTable 
                title="Table: DailyInventory"
                description="Control de existencias por jornada laboral."
                fields={[
                  { name: 'productoId', type: 'string', desc: 'FK que apunta a la tabla Products.' },
                  { name: 'fecha', type: 'string', desc: 'Fecha de la sesión de trabajo.' },
                  { name: 'stockInicial', type: 'number', desc: 'Asignación manual al inicio del día.' },
                  { name: 'stockActual', type: 'number', desc: 'Balance calculado en tiempo real.' }
                ]}
              />
              <SchemaTable 
                title="Table: Customers"
                description="Directorio de deudores y historial de pagos."
                fields={[
                  { name: 'id', type: 'string', desc: 'ID único del cliente.' },
                  { name: 'nombre', type: 'string', desc: 'Nombre para facturación/crédito.' },
                  { name: 'deuda', type: 'number', desc: 'Saldo neto a favor del restaurante.' },
                  { name: 'historial', type: 'array', desc: 'Línea de tiempo de consumos y abonos.' }
                ]}
              />
            </div>
         </div>
       )}

       {adminView === 'PRODUCTOS' && (
         <section className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Utensils className="w-6 h-6 text-violet-600" />
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">Maestro de Platos</h3>
            </div>
          </div>

          <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-xl border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
            {/* Add Dish Form */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nuevo Plato / Bebida</p>
                <button 
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="text-[10px] font-bold text-violet-600 uppercase hover:underline"
                >
                  {showCategoryManager ? 'Cerrar Categorías' : 'Gestionar Categorías'}
                </button>
              </div>

              {showCategoryManager ? (
                <div className="bg-violet-50/50 p-4 rounded-3xl border border-violet-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <form onSubmit={handleAddCategory} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nueva categoría..."
                      className="flex-1 bg-white border-2 border-violet-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                    />
                    <button type="submit" className="bg-violet-600 text-white px-4 rounded-xl text-[10px] font-black uppercase">Add</button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center gap-1 bg-white border border-violet-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-violet-700">
                        {cat}
                        {!['MENÚ', 'EXTRA', 'BEBIDA'].includes(cat) && (
                          <button onClick={() => deleteCategory(cat)} className="text-violet-300 hover:text-rose-500"><X className="w-3 h-3" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="grid gap-3">
                    <input 
                      type="text" 
                      value={newProduct.nombre}
                      onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})}
                      placeholder="Nombre del plato..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-violet-500 outline-none transition-all"
                    />
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                       <select 
                        value={newProduct.categoria}
                        onChange={(e) => setNewProduct({...newProduct, categoria: e.target.value})}
                        className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                       >
                         {categories.map(cat => (
                           <option key={cat} value={cat}>{cat === 'MENÚ' ? 'Menú (9.00)' : cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
                         ))}
                       </select>
                       <input 
                        type="number" 
                        value={newProduct.precio}
                        onChange={(e) => setNewProduct({...newProduct, precio: parseFloat(e.target.value)})}
                        placeholder="Precio..."
                        className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                       />
                    </div>
                    {newProduct.categoria === 'MENÚ' && (
                       <select 
                        value={newProduct.tipo}
                        onChange={(e) => setNewProduct({...newProduct, tipo: e.target.value as any})}
                        className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                       >
                         <option value="SEGUNDO">Segundo</option>
                         <option value="SOPA">Sopa / Entrada</option>
                       </select>
                    )}
                    <button 
                      type="submit"
                      className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Registrar Plato
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* List Table */}
            <div className="space-y-4">
              <div className="flex gap-2 mb-2 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
                 {categories.map(cat => (
                   <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setNewProduct(prev => ({ ...prev, categoria: cat, precio: cat === 'MENÚ' ? 9 : prev.precio }));
                    }}
                    className={`flex-1 py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                      activeCategory === cat ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
              
              {editingId && editForm ? (
                <form onSubmit={handleUpdate} className="bg-violet-50 p-4 rounded-2xl border-2 border-violet-200 space-y-3 animate-in fade-in slide-in-from-top-1">
                   <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Editando Producto</p>
                      <button onClick={() => setEditingId(null)} className="text-violet-400 hover:text-violet-600"><X className="w-4 h-4" /></button>
                   </div>
                   <input 
                    type="text" 
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                    className="w-full bg-white border border-violet-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                   />
                   <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="number" 
                        value={editForm.precio}
                        onChange={(e) => setEditForm({...editForm, precio: parseFloat(e.target.value)})}
                        className="w-full bg-white border border-violet-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                      <button type="submit" className="bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Guardar</button>
                   </div>
                </form>
              ) : (
                <div className="max-h-[300px] overflow-auto pr-2 no-scrollbar space-y-2">
                   {products.filter(p => p.categoria === activeCategory).map(p => (
                     <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                       <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">{p.nombre}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-xs font-black text-violet-500">S/ {p.precio.toFixed(2)}</p>
                             {p.tipo && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">[{p.tipo}]</p>}
                          </div>
                       </div>
                       <div className="flex gap-1">
                              <button 
                                onClick={() => startEdit(p)}
                                className="p-2 text-slate-300 hover:text-violet-600 hover:bg-white rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => deleteProduct(p.id)}
                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                       </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
         </section>
       )}

       {adminView === 'USUARIOS' && (
         <section className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 px-2">
            <Users className="w-6 h-6 text-violet-600" />
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">Gestión de Personal</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 h-fit space-y-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Nuevo Acceso</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newUser.nombre && newUser.usuario && newUser.pin.length === 4) {
                  addAppUser(newUser);
                  setNewUser({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
                }
              }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre para mostrar</label>
                  <input 
                    type="text" 
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({...newUser, nombre: e.target.value})}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Usuario (Login)</label>
                  <input 
                    type="text" 
                    value={newUser.usuario || ''}
                    onChange={(e) => setNewUser({...newUser, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    placeholder="ej: juan.p"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Rol en el Sistema</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                  >
                    <option value="MESERO">MESERO</option>
                    <option value="COCINA">COCINA</option>
                    <option value="CAJA">CAJA</option>
                    <option value="ADMIN">ADMINISTRADOR</option>
                    <option value="PEDIDOS">PEDIDOS</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">PIN (4 dígs)</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={newUser.pin}
                    onChange={(e) => setNewUser({...newUser, pin: e.target.value.replace(/\D/g, '')})}
                    placeholder="****"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
                <button type="submit" className="w-full bg-violet-600 text-white rounded-2xl py-4 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-violet-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Registrar Usuario
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-4">
              {appUsers.map(user => (
                <div key={user.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${user.role === 'ADMIN' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{user.nombre} <span className="text-slate-400 font-medium ml-2">@{user.usuario || 'sin_usuario'}</span></h4>
                      <div className="flex gap-2 items-center mt-0.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${
                          user.role === 'ADMIN' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>{user.role}</span>
                        <span className="text-[10px] font-mono text-slate-300">PIN: ****</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const newPin = prompt(`Ingrese nuevo PIN para ${user.usuario || user.nombre} (4 dígitos)`, user.pin);
                        if (newPin && newPin.length === 4) {
                          updateAppUser(user.id, { pin: newPin });
                        }
                      }}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-violet-600 rounded-xl transition-all"
                      title="Cambiar PIN"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteAppUser(user.id)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
         </section>
       )}

       {adminView === 'MESAS' && (
         <section className="space-y-6 animate-in fade-in duration-500">
           <div className="flex items-center gap-2 px-2">
             <Users className="w-6 h-6 text-violet-600" />
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">Gestión de Mesas</h3>
           </div>

           <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-xl border border-slate-100 max-w-2xl">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-4">Nueva Mesa</p>
             <form onSubmit={handleAddMesa} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <input 
                 type="text" 
                 value={newMesaName}
                 onChange={(e) => setNewMesaName(e.target.value)}
                 placeholder="Ej: Mesa Terraza, Mesa 15..."
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-violet-500 outline-none transition-all shadow-sm"
               />
               <button 
                 type="submit"
                 className="py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Agregar Mesa
               </button>
             </form>

             <div className="mt-8 space-y-3">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Listado de Mesas</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {mesas.map(mesa => {
                   const isOccupied = orders.some(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
                   return (
                     <div key={mesa.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-violet-400' : 'bg-emerald-400'}`}></div>
                          <span className="font-bold text-slate-700 text-xs">{mesa.nombre}</span>
                       </div>
                       <button 
                         onClick={() => deleteMesa(mesa.id)}
                         className="p-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   );
                 })}
               </div>
             </div>
           </div>
         </section>
       )}

       {adminView === 'PANEL' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 animate-in fade-in duration-500">
          {/* 2. Menu Selection */}
          <div className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <Utensils className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Menú del Día</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-widest leading-relaxed">
                Selecciona los platos que estarán disponibles hoy.
              </p>
              <div className="grid gap-2 max-h-[500px] overflow-auto pr-2 no-scrollbar">
                {products.map(product => {
                  const dailyMenu = currentMenu.filter(m => m.fecha === selectedDate);
                  const isInMenu = dailyMenu.some(m => m.productoId === product.id);
                  const menuItem = dailyMenu.find(m => m.productoId === product.id);

                  return (
                    <div key={product.id} className="space-y-2">
                         <button
                        onClick={() => toggleProductInMenu(product.id)}
                        className={`w-full flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 transition-all group ${
                          isInMenu 
                            ? 'bg-violet-50 border-violet-500 shadow-md translate-x-1' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="text-left flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                              product.categoria === 'MENÚ' ? 'bg-violet-100 text-violet-600' :
                              product.categoria === 'EXTRA' ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-600'
                           }`}>
                             {product.categoria[0]}
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 text-sm group-hover:text-violet-600 transition-colors truncate max-w-[120px] sm:max-w-none">{product.nombre}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                 {product.tipo || product.categoria} • S/ {product.precio.toFixed(2)}
                              </p>
                           </div>
                        </div>
                        {isInMenu ? (
                          <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-violet-600" />
                        ) : (
                          <Circle className="w-5 h-5 md:w-6 md:h-6 text-slate-100" />
                        )}
                      </button>

                      {isInMenu && (
                        <div className="mx-2 md:mx-4 space-y-2 bg-white p-3 rounded-2xl border border-violet-100 shadow-sm animate-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-4">
                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                              {product.categoria === 'BEBIDA' ? 'Stock' : 'Stock Inicial'}
                            </span>
                            <div className="flex-1 flex items-center gap-2">
                               <input 
                                 type="number"
                                 value={menuItem?.stockInicial}
                                 onChange={(e) => {
                                   const val = parseInt(e.target.value) || 0;
                                   if (product.categoria === 'BEBIDA') {
                                      updateMenuItemStock(product.id, val, val);
                                   } else {
                                      updateMenuItemStock(product.id, val);
                                   }
                                 }}
                                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-violet-400 transition-all text-center"
                               />
                               <span className="text-[9px] md:text-[10px] font-bold text-slate-400 underline decoration-violet-200 uppercase">Unidades</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          </div>

          {/* 3. Table and System Management */}
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Mesas</h3>
              </div>
              
              <form onSubmit={handleAddMesa} className="flex gap-2">
                <input 
                  type="text" 
                  value={newMesaName}
                  onChange={(e) => setNewMesaName(e.target.value)}
                  placeholder="Nombre..."
                  className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:border-violet-500 outline-none transition-all shadow-sm"
                />
                <button 
                  type="submit"
                  className="bg-violet-600 text-white p-3.5 rounded-2xl shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </form>

              <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-2 gap-2 max-h-[250px] overflow-auto pr-2 no-scrollbar">
                {mesas.map(mesa => {
                  const isOccupied = orders.some(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
                  return (
                    <div key={mesa.id} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
                      <span className="font-bold text-slate-700 text-[11px] truncate mr-1">{mesa.nombre}</span>
                      <div className={`shrink-0 w-2 h-2 rounded-full ${isOccupied ? 'bg-violet-400' : 'bg-emerald-400'}`}></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Control de Jornada</h3>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                    <button 
                      onClick={() => exportToExcel(orders.filter(o => o.fecha === selectedDate), customers, products, selectedDate)}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar Excel
                    </button>
                    <button 
                      onClick={() => setShowReport(true)}
                      className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Ver Reporte de Ventas
                    </button>
                  </div>
              </div>
              
              <div className="bg-rose-50 p-6 md:p-8 rounded-[40px] border border-rose-100 flex flex-col gap-6 shadow-sm">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-1">Cierre de Día</p>
                  <p className="text-[11px] text-rose-400 font-medium italic leading-tight">Precaución: Esto borrará los pedidos de la fecha {selectedDate} y reiniciará el stock del menú. Los productos, mesas y clientes registrados se mantienen.</p>
                </div>
                
                <button 
                  onClick={() => {
                    requestConfirmation(
                      `Reiniciar Jornada (${selectedDate})`,
                      `Se descargará un ARCHIVO EXCEL de respaldo y luego se REINICIARÁ LA JORNADA de la fecha ${selectedDate}. ¿Deseas continuar?`,
                      () => {
                        exportToExcel(orders.filter(o => o.fecha === selectedDate), customers, products, selectedDate);
                        resetStock();
                      }
                    );
                  }}
                  className="w-full py-6 bg-rose-600 text-white rounded-[30px] font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center text-center"
                >
                  EXPORTAR Y REINICIAR JORNADA
                </button>
              </div>
            </div>
          </div>
         </div>
       )}
    </div>

     <AnimatePresence>
       {showReport && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             onClick={() => setShowReport(false)}
             className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
           />
           <motion.div 
             initial={{ opacity: 0, scale: 0.9, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.9, y: 20 }}
             className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
           >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Reporte de Ventas</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedDate}</p>
                  </div>
                </div>
                <button onClick={() => setShowReport(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
                {(() => {
                  const salesToday = orders.filter(o => o.fecha === selectedDate);
                  
                  const efectivo = salesToday.filter(o => o.metodoPago === 'EFECTIVO').reduce((acc, o) => acc + o.total, 0);
                  const yape = salesToday.filter(o => o.metodoPago === 'YAPE').reduce((acc, o) => acc + o.total, 0);
                  const creditoVendido = salesToday.filter(o => o.estado === 'CREDITO').reduce((acc, o) => acc + o.total, 0);
                  
                  const customerPaymentsToday = customers.flatMap(c => 
                     c.historial.filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
                  ).reduce((acc, t) => acc + t.monto, 0);

                  const totalFinal = efectivo + yape + customerPaymentsToday;

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Efectivo Total</p>
                           <p className="text-2xl font-black text-emerald-900 leading-none">S/ {efectivo.toFixed(2)}</p>
                         </div>
                         <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Yape Total</p>
                           <p className="text-2xl font-black text-blue-900 leading-none">S/ {yape.toFixed(2)}</p>
                         </div>
                         <div className="bg-violet-50 p-6 rounded-3xl border border-violet-100">
                           <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Cobros Clientes</p>
                           <p className="text-2xl font-black text-violet-900 leading-none">S/ {customerPaymentsToday.toFixed(2)}</p>
                         </div>
                         <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                           <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Ventas a Crédito</p>
                           <p className="text-2xl font-black text-rose-900 leading-none">S/ {creditoVendido.toFixed(2)}</p>
                           <p className="text-[8px] text-rose-400 font-bold uppercase mt-1">* Por cobrar todavía</p>
                         </div>
                      </div>

                      <div className="bg-slate-900 p-8 rounded-[32px] text-center shadow-xl">
                         <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Total Recaudado Real (Caja)</p>
                         <div className="flex items-baseline justify-center gap-1">
                           <span className="text-violet-400 font-bold text-xl">S/</span>
                           <span className="text-5xl font-black text-white tracking-tighter">
                             {totalFinal.toFixed(2)}
                           </span>
                         </div>
                         <p className="text-[9px] text-slate-500 font-bold uppercase mt-4">
                           Suma de Efectivo + Yape + Cobros del Día
                         </p>
                      </div>

                      <div className="space-y-3">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resumen de Comandas</h4>
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex justify-between text-xs">
                               <span className="text-slate-500 font-bold">Total Pedidos:</span>
                               <span className="font-black text-slate-800">{salesToday.length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                               <span className="text-slate-500 font-bold">Pedidos Pagados:</span>
                               <span className="font-black text-emerald-600">{salesToday.filter(o => o.estado === 'PAGADO').length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                               <span className="text-slate-500 font-bold">Pedidos a Cuenta:</span>
                               <span className="font-black text-violet-600">{salesToday.filter(o => o.estado === 'CREDITO').length}</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
            
            <div className="p-8 pt-0">
               <button 
                onClick={() => setShowReport(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
               >
                 Cerrar Reporte
               </button>
            </div>
          </motion.div>
        </div>
       )}
     </AnimatePresence>
    </>
  );
};

const AppContent = () => {
  const { role, currentUser } = useApp();

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <Layout>
      {role === 'MESERO' && <MeseroView />}
      {role === 'PEDIDOS' && <PedidosView />}
      {role === 'COCINA' && <CocinaView />}
      {role === 'CAJA' && <CajaView />}
      {role === 'CUENTAS' && <CustomersView />}
      {role === 'ADMIN' && (
        <div className="flex flex-col items-center justify-start p-4 md:p-8 space-y-8 min-h-full">
          <div className="text-center space-y-2">
            <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center shadow-xl shadow-slate-200 border-2 border-slate-100 mx-auto overflow-hidden p-2">
               <img 
                 src="/logo.png" 
                 alt="Logo Sabor Abanquino" 
                 className="w-full h-full object-contain"
                 onError={(e) => {
                   e.currentTarget.src = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/database.svg';
                 }}
               />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión del Día</h2>
            <p className="text-slate-400 text-sm font-medium">Control de inventario y cierre de caja.</p>
          </div>
          
          <AdminPanel />
        </div>
      )}
    </Layout>
  );
};


export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

