/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './AppContext.tsx';
import { Role, AppUser } from './types.ts';
import Layout from './components/Layout.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { MeseroView } from './components/MeseroView.tsx';
import { PedidosView } from './components/PedidosView.tsx';
import { CocinaView, CajaView } from './components/CocinaCajaViews.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import LoginView from './components/LoginView.tsx';
import { Database, Plus, Users, Utensils, CheckCircle2, Circle, Edit3, Trash2, X, TrendingUp, BarChart3, Download, LogOut, Check, Settings, Image, Tag } from 'lucide-react';
import { exportToExcel } from './utils/exportUtils.ts';

const AdminPanel = () => {
  const { 
    resetStock, currentMenu, products, addProduct, updateProduct, 
    deleteProduct, mesas, addMesa, updateMesa, deleteMesa, toggleProductInMenu, 
    requestConfirmation, isTodaySelected, orders, selectedDate,
    updateMenuItemStock, customers, categories, addCategory, deleteCategory,
    seedDatabase, logout, currentUser, appUsers, addAppUser, updateAppUser, deleteAppUser,
    identity, updateIdentity, dbConnectedStatus, dbConnectionErrorMessage, recheckDbConnection
  } = useApp();
  const [adminView, setAdminView] = useState<'PANEL' | 'PRODUCTOS' | 'USUARIOS' | 'MESAS' | 'CLIENTES' | 'IDENTIDAD' | 'DATABASE'>('PANEL');
  const [showReport, setShowReport] = useState(false);
  const [newMesaName, setNewMesaName] = useState('');
  const [newMesaSillas, setNewMesaSillas] = useState('4');
  const [editingMesaId, setEditingMesaId] = useState<string | null>(null);
  const [tempMesaSillas, setTempMesaSillas] = useState<string>('');
  const [newProduct, setNewProduct] = useState({ nombre: '', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 });
  const [newUser, setNewUser] = useState({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
  const [activeCategory, setActiveCategory] = useState<string>('MENÚ');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editUserForm, setEditUserForm] = useState<any>(null);

  const [identidadForm, setIdentidadForm] = useState({
    nombre: '',
    nombreCorto: '',
    eslogan: '',
    logoUrl: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (identity) {
      setIdentidadForm({
        nombre: identity.nombre || '',
        nombreCorto: identity.nombreCorto || '',
        eslogan: identity.eslogan || '',
        logoUrl: identity.logoUrl || ''
      });
    }
  }, [identity]);

  const handleAddMesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMesaName.trim()) {
      const id = Math.random().toString(36).substr(2, 5);
      addMesa(id, newMesaName.trim(), parseInt(newMesaSillas) || 0);
      setNewMesaName('');
      setNewMesaSillas('4');
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

  const startEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditUserForm({ ...user });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId && editUserForm) {
      updateAppUser(editingUserId, editUserForm);
      setEditingUserId(null);
      setEditUserForm(null);
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
    <div className="w-full max-w-6xl space-y-4 md:space-y-8 pb-10 md:pb-20">
       <div className="flex bg-white/80 backdrop-blur-md p-1 md:p-1.5 rounded-xl md:rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar mx-auto max-w-fit md:sticky md:top-4 z-40">
          {(['PANEL', 'PRODUCTOS', 'USUARIOS', 'MESAS', 'IDENTIDAD', 'DATABASE'] as const).map(view => (
            <button 
              key={view}
              onClick={() => setAdminView(view as any)}
              className={`px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                adminView === view 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {view === 'PANEL' ? 'Servicio' : view === 'DATABASE' ? 'DB' : view === 'USUARIOS' ? 'Personal' : view === 'IDENTIDAD' ? 'Identidad' : view}
            </button>
          ))}
       </div>
       {adminView === 'DATABASE' && (
         <div className="space-y-4 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             {/* Firebase Connection Diagnostic Panel */}
             <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100/80 mb-6 md:mb-8 text-slate-800">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                     dbConnectedStatus === 'conectado' ? 'bg-emerald-50 text-emerald-600' :
                     dbConnectedStatus === 'conectando' ? 'bg-amber-50 text-amber-600' :
                     'bg-rose-50 text-rose-600'
                   }`}>
                     <Database className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none mb-1">Diagnóstico de Firebase</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Estado de la conexión y configuración de la nube</p>
                   </div>
                 </div>
                 
                 <button
                   onClick={recheckDbConnection}
                   disabled={dbConnectedStatus === 'conectando'}
                   className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                     dbConnectedStatus === 'conectando'
                       ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                       : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                   }`}
                 >
                   {dbConnectedStatus === 'conectando' ? 'Verificando...' : 'Probar Conexión'}
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                 <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Proyecto ID</p>
                   <p className="text-xs font-bold text-slate-700 font-mono">agile-extension-262716</p>
                 </div>
                 <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Base de Datos Firestore</p>
                   <p className="text-violet-600 text-[11px] font-bold font-mono truncate" title="ai-studio-da6577ff-ae85-4cef-8d41-c13a2b89245b">
                     ai-studio-da6577ff_db
                   </p>
                 </div>
                 <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                   <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Servidor Cloud</p>
                     <p className="text-xs font-bold text-slate-700 uppercase">Enterprise Edition</p>
                   </div>
                   <div className="flex gap-1.5 items-center bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                     <span className={`w-2.5 h-2.5 rounded-full ${
                       dbConnectedStatus === 'conectado' ? 'bg-emerald-500 animate-pulse' :
                       dbConnectedStatus === 'conectando' ? 'bg-amber-500 animate-bounce' :
                       'bg-rose-500'
                     }`}></span>
                     <span className="text-[10px] font-black uppercase text-slate-700">
                       {dbConnectedStatus === 'conectado' ? 'Activo' :
                        dbConnectedStatus === 'conectando' ? 'Buscando' :
                        'Caído'}
                     </span>
                   </div>
                 </div>
               </div>

               {dbConnectedStatus === 'error' && (
                 <div className="mt-5 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3 text-rose-700 items-start">
                   <div className="text-xs font-black uppercase tracking-widest bg-rose-100 px-2.5 py-1 rounded-lg">Error</div>
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-bold font-mono tracking-tight leading-relaxed select-all">
                       {dbConnectionErrorMessage || 'No se pudo establecer conexión con Firebase Firestore. Verifique la conexión a internet.'}
                     </p>
                   </div>
                 </div>
               )}
             </div>

            <div className="bg-violet-600 p-6 md:p-10 rounded-3xl md:rounded-[48px] text-white shadow-xl relative overflow-hidden">
               <Database className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 text-white/5 -translate-y-6 md:-translate-y-12 translate-x-6 md:translate-x-12" />
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                 <div className="space-y-1 md:space-y-2">
                   <h2 className="text-xl md:text-2xl font-display font-bold">Datos & Estructura</h2>
                   <p className="text-violet-100 text-[11px] md:text-sm max-w-2xl font-medium leading-tight md:leading-relaxed">
                     Control técnico de tablas. Solo usar para mantenimiento.
                   </p>
                 </div>
                 <button 
                   onClick={() => requestConfirmation(
                     'Inicializar Tablas', 
                     'Esto restaurará las mesas y productos base si están vacíos. ¿Continuar?', 
                     seedDatabase
                   )}
                   className="bg-white text-violet-600 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
                 >
                   <Database className="w-3.5 h-3.5 md:w-4 md:h-4" />
                   Reiniciar Tablas
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
         <section className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 md:w-6 md:h-6 text-violet-600" />
              <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-wider">Productos</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl md:rounded-[40px] p-4 md:p-8 shadow-xl border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
            {/* Add Dish Form */}
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alta de Producto</p>
                <button 
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="text-[9px] md:text-[10px] font-bold text-violet-600 uppercase hover:underline"
                >
                  Categorías
                </button>
              </div>

              {showCategoryManager ? (
                <div className="bg-violet-50/50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-violet-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <form onSubmit={handleAddCategory} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nombre..."
                      className="flex-1 bg-white border border-violet-100 rounded-xl px-3 py-2 text-[11px] font-bold outline-none"
                    />
                    <button type="submit" className="bg-violet-600 text-white px-3 md:px-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase">Ok</button>
                  </form>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center gap-1 bg-white border border-violet-200 px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-bold text-violet-700">
                        {cat}
                        {!['MENÚ', 'EXTRA', 'BEBIDA'].includes(cat) && (
                          <button onClick={() => deleteCategory(cat)} className="text-violet-300 hover:text-rose-500"><X className="w-3 h-3" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddProduct} className="space-y-3">
                  <div className="grid gap-2.5 md:gap-3">
                    <input 
                      type="text" 
                      value={newProduct.nombre}
                      onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})}
                      placeholder="Nombre del producto..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl px-4 py-3 text-xs md:text-sm font-bold focus:border-violet-500 outline-none transition-all"
                    />
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                       <select 
                        value={newProduct.categoria}
                        onChange={(e) => setNewProduct({...newProduct, categoria: e.target.value})}
                        className="bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl px-4 py-3 text-xs md:text-sm font-bold outline-none"
                       >
                         {categories.map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                         ))}
                       </select>
                       <input 
                        type="number" 
                        value={newProduct.precio}
                        onChange={(e) => setNewProduct({...newProduct, precio: parseFloat(e.target.value)})}
                        placeholder="Precio..."
                        className="bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl px-4 py-3 text-xs md:text-sm font-bold outline-none"
                       />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-3 md:py-4 bg-violet-600 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg shadow-violet-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> Guardar Producto
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* List Table */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex gap-1.5 md:gap-2 mb-1 md:p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
                 {categories.map(cat => (
                   <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setNewProduct(prev => ({ ...prev, categoria: cat, precio: cat === 'MENÚ' ? 9 : prev.precio }));
                    }}
                    className={`flex-1 py-2 px-3 md:px-4 text-[9px] md:text-[10px] font-black uppercase tracking-tight rounded-lg md:rounded-xl transition-all whitespace-nowrap ${
                      activeCategory === cat ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'
                    }`}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
              
              <div className="max-h-[250px] md:max-h-[300px] overflow-auto pr-1 no-scrollbar space-y-2">
                 {products.filter(p => p.categoria === activeCategory).map(p => (
                   <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                     <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-[11px] md:text-xs truncate">{p.nombre}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-[11px] md:text-xs font-black text-violet-500">S/ {p.precio.toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="flex gap-0.5 md:gap-1">
                            <button 
                              onClick={() => startEdit(p)}
                              className="p-1.5 md:p-2 text-slate-300 hover:text-violet-600 rounded-lg transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteProduct(p.id)}
                              className="p-1.5 md:p-2 text-slate-300 hover:text-rose-600 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
         </section>
        )}
        {adminView === 'USUARIOS' && (
         <section className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 px-1">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-violet-600" />
            <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-wider">Acceso Personal</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Form */}
            <div className="bg-white rounded-3xl md:rounded-[40px] p-6 md:p-8 shadow-xl border border-slate-100 h-fit space-y-4 md:space-y-6">
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                {editingUserId ? 'Editar Usuario' : 'Alta de Usuario'}
              </p>
              <form onSubmit={editingUserId ? handleUpdateUser : (e) => {
                e.preventDefault();
                if (newUser.nombre && newUser.usuario && newUser.pin.length === 4) {
                  addAppUser(newUser);
                  setNewUser({ nombre: '', usuario: '', role: 'MESERO' as Role, pin: '' });
                }
              }} className="space-y-3 md:space-y-4">
                <input 
                  type="text" 
                  value={editingUserId ? editUserForm.nombre : newUser.nombre}
                  onChange={(e) => editingUserId 
                    ? setEditUserForm({...editUserForm, nombre: e.target.value})
                    : setNewUser({...newUser, nombre: e.target.value})
                  }
                  placeholder="Nombre..."
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input 
                  type="text" 
                  value={editingUserId ? editUserForm.usuario : newUser.usuario}
                  onChange={(e) => editingUserId
                    ? setEditUserForm({...editUserForm, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})
                    : setNewUser({...newUser, usuario: e.target.value.toLowerCase().replace(/\s/g, '')})
                  }
                  placeholder="Login (ej: juan.p)"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500"
                />
                <select 
                  value={editingUserId ? editUserForm.role : newUser.role}
                  onChange={(e) => editingUserId
                    ? setEditUserForm({...editUserForm, role: e.target.value as Role})
                    : setNewUser({...newUser, role: e.target.value as Role})
                  }
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="MESERO">MESERO</option>
                  <option value="COCINA">COCINA</option>
                  <option value="CAJA">CAJA</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <input 
                  type="password" 
                  maxLength={4}
                  value={editingUserId ? editUserForm.pin : newUser.pin}
                  onChange={(e) => editingUserId
                    ? setEditUserForm({...editUserForm, pin: e.target.value.replace(/\D/g, '')})
                    : setNewUser({...newUser, pin: e.target.value.replace(/\D/g, '')})
                  }
                  placeholder="PIN 4 Dígitos"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3.5 text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500"
                />
                <div className="flex gap-2">
                  {editingUserId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingUserId(null);
                        setEditUserForm(null);
                      }}
                      className="flex-1 bg-slate-100 text-slate-500 rounded-xl md:rounded-2xl py-3.5 md:py-4 font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="flex-[2] bg-violet-600 text-white rounded-xl md:rounded-2xl py-3.5 md:py-4 font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-lg shadow-violet-100 hover:scale-[1.02] transition-all">
                    {editingUserId ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-2 md:space-y-4">
              {appUsers.map(user => (
                <div key={user.id} className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-6 shadow-sm border border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-5">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${user.role === 'ADMIN' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Users className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                      <h4 className="text-[13px] md:text-sm font-bold text-slate-800">{user.nombre}</h4>
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase">{user.role}</span>
                        <span className="text-[10px] font-medium text-slate-300">@{user.usuario}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => startEditUser(user)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-violet-600 rounded-xl transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteAppUser(user.id)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
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
         <section className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
           <div className="flex items-center gap-2 px-1">
             <Users className="w-5 h-5 md:w-6 md:h-6 text-violet-600" />
             <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-wider">Mesas</h3>
           </div>

           <div className="bg-white rounded-3xl md:rounded-[40px] p-5 md:p-8 shadow-xl border border-slate-100 max-w-2xl space-y-6">
             <form onSubmit={handleAddMesa} className="flex gap-2">
               <input 
                 type="text" 
                 value={newMesaName}
                 onChange={(e) => setNewMesaName(e.target.value)}
                 placeholder="Ej: Mesa Terraza..."
                 className="flex-[3] bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs md:text-sm font-bold outline-none"
               />
               <div className="flex-[1] relative">
                 <input 
                   type="number" 
                   value={newMesaSillas}
                   onChange={(e) => setNewMesaSillas(e.target.value)}
                   placeholder="Sillas"
                   className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs md:text-sm font-bold outline-none text-center"
                 />
                 <span className="absolute -top-2 left-2 bg-white px-1 text-[7px] font-black text-slate-400 uppercase">Sillas</span>
               </div>
               <button 
                 type="submit"
                 className="px-4 bg-violet-600 text-white rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-lg shadow-violet-100 transition-all"
               >
                 Añadir
               </button>
             </form>

             <div className="space-y-2">
               <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 leading-none">Listado</p>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                 {[...mesas].sort((a, b) => {
                   if (a.id === '13') return 1;
                   if (b.id === '13') return -1;
                   const numA = parseInt(a.nombre.replace(/\D/g, '')) || 0;
                   const numB = parseInt(b.nombre.replace(/\D/g, '')) || 0;
                   return numA - numB;
                 }).map(mesa => (
                   <div key={mesa.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                     <span className="font-bold text-slate-700 text-[11px] truncate md:text-xs">
                       {mesa.id === '13' ? 'Para Llevar' : mesa.nombre}
                     </span>
                     <button 
                       onClick={() => deleteMesa(mesa.id)}
                       className="p-1 text-slate-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         </section>
        )}

        {adminView === 'PANEL' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 animate-in fade-in duration-500">
          {/* 2. Menu Selection */}
          <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-2 px-1">
                <Utensils className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Menú Disponible</h3>
              </div>
              <div className="grid gap-2 max-h-[400px] md:max-h-[500px] overflow-auto pr-1 no-scrollbar">
                {categories.map(cat => {
                  const catProducts = products.filter(p => p.categoria === cat);
                  if (catProducts.length === 0) return null;
                  
                  return (
                    <div key={cat} className="space-y-2 mb-4">
                      <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10">
                        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest pl-1 border-l-2 border-violet-500 ml-1">{cat}</p>
                      </div>
                      <div className="grid gap-2">
                        {catProducts.map(product => {
                          const dailyMenu = currentMenu.filter(m => m.fecha === selectedDate);
                          const isInMenu = dailyMenu.some(m => m.productoId === product.id);
                          const menuItem = dailyMenu.find(m => m.productoId === product.id);

                          return (
                            <div key={product.id} className="space-y-1.5">
                              <button
                                onClick={() => toggleProductInMenu(product.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                  isInMenu 
                                    ? 'bg-violet-50 border-violet-500 shadow-sm' 
                                    : 'bg-white border-slate-100 hover:border-slate-200'
                                }`}
                              >
                                <div className="text-left flex items-center gap-3">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black ${
                                      product.categoria === 'MENÚ' ? 'bg-violet-100 text-violet-600' :
                                      product.categoria === 'EXTRA' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {product.categoria[0]}
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 text-[13px] group-hover:text-violet-600 transition-colors leading-tight truncate max-w-[150px]">{product.nombre}</p>
                                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">S/ {product.precio.toFixed(2)}</p>
                                  </div>
                                </div>
                                {isInMenu && <CheckCircle2 className="w-5 h-5 text-violet-600" />}
                              </button>

                              {isInMenu && (
                                <div className="mx-2 bg-slate-50/60 p-2.5 rounded-xl border border-violet-100 shadow-sm flex flex-col sm:flex-row gap-3">
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">Stock</span>
                                    <input 
                                      type="number"
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
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none text-center focus:border-violet-400"
                                    />
                                  </div>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">Precio s/.</span>
                                    <input 
                                      type="number"
                                      step="0.10"
                                      value={menuItem?.precioPersonalizado !== undefined ? menuItem.precioPersonalizado : ''}
                                      placeholder={product.precio.toFixed(2)}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const priceVal = raw === '' ? undefined : parseFloat(raw);
                                        const currentStock = menuItem?.stockInicial ?? 25;
                                        const currentStockActual = menuItem?.stockActual ?? 25;
                                        updateMenuItemStock(product.id, currentStock, currentStockActual, priceVal);
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none text-center focus:border-violet-400"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>

          {/* 3. Table and System Management */}
          <div className="space-y-8 md:space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Control Mesas</h3>
              </div>
              
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 max-h-[200px] overflow-auto pr-1 no-scrollbar">
                {mesas.map(mesa => {
                  const activeOrder = orders.find(o => o.mesaId === mesa.id && o.estado === 'ABIERTO' && o.fecha === selectedDate);
                  const isOccupied = !!activeOrder;
                  const isEditing = editingMesaId === mesa.id;
                  
                  return (
                    <div key={mesa.id} className="group relative bg-white border border-slate-100 p-2.5 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-200 transition-all">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input 
                            type="number"
                            className="flex-1 min-w-0 bg-slate-50 border border-brand-200 rounded-lg px-2 py-1 text-[10px] font-black outline-none focus:bg-white"
                            value={tempMesaSillas}
                            onChange={(e) => setTempMesaSillas(e.target.value)}
                            onBlur={() => {
                              // Small delay to allow button click
                              setTimeout(() => setEditingMesaId(null), 200);
                            }}
                            autoFocus
                          />
                          <button 
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent onBlur before click
                              updateMesa(mesa.id, { sillas: parseInt(tempMesaSillas) || 0 });
                              setEditingMesaId(null);
                            }}
                            className="shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm"
                          >
                            <Check className="w-3 h-3" />
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
                            <span className="font-bold text-slate-700 text-[10px] truncate leading-tight">
                              {mesa.id === '13' ? 'Para Llevar' : mesa.nombre}
                            </span>
                            {isOccupied && activeOrder ? (
                               <div className="flex flex-col">
                                 <span className="text-[7px] font-black text-violet-400 uppercase tracking-tighter">
                                   {activeOrder.usuarioNombre?.split(' ')[0]} - #{activeOrder.id.split('-')[1]}
                                 </span>
                               </div>
                            ) : (
                              mesa.id !== '13' && (
                                <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter hover:text-emerald-500 transition-colors">
                                  Cap: {mesa.sillas || 0} <span className="opacity-50 font-medium">✎</span>
                                </span>
                              )
                            )}
                          </div>
                          <div className={`shrink-0 w-2 h-2 rounded-full ${isOccupied ? 'bg-violet-400' : 'bg-emerald-400'}`}></div>
                          
                          {mesa.id !== '13' && (
                            <button 
                              onClick={() => deleteMesa(mesa.id)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-100 text-rose-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-rose-50 hover:text-rose-600 z-10"
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

            <div className="space-y-4">
              <div className="flex flex-col gap-3 px-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-violet-400" />
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">Caja & Reportes</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => exportToExcel(orders.filter(o => o.fecha === selectedDate), customers, products, selectedDate)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                    >
                      <Download className="w-3.5 h-3.5" /> Exportar Excel
                    </button>
                    <button 
                      onClick={() => setShowReport(true)}
                      className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-100"
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Ver Reporte
                    </button>
                  </div>
              </div>
              
              <div className="bg-rose-50 p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-rose-100 flex flex-col gap-4 shadow-sm">
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600 mb-1">Cierre de Jornada</p>
                  <p className="text-[10px] text-rose-400 font-medium italic leading-tight">Backup automático antes del reset.</p>
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
                  className="w-full py-4.5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] md:text-xs shadow-xl shadow-rose-200"
                >
                  REINICIAR JORNADA
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
  const { activeView, currentUser } = useApp();

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <Layout>
      {activeView === 'MESERO' && <MeseroView />}
      {activeView === 'PEDIDOS' && <PedidosView />}
      {activeView === 'COCINA' && <CocinaView />}
      {activeView === 'CAJA' && <CajaView />}
      {activeView === 'CUENTAS' && <CustomersView />}
      {activeView === 'ADMIN' && (
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

