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
import { 
  BarChart3, X, Utensils, Tag, Tags, Users, Compass, Settings, LayoutDashboard, FileText, Wallet 
} from 'lucide-react';

// Modular Admin Tab Components
import AdminDashboardView from './components/AdminDashboardView.tsx';
import AdminServicioView from './components/AdminServicioView.tsx';
import AdminProductosView from './components/AdminProductosView.tsx';
import AdminCategoriasView from './components/AdminCategoriasView.tsx';
import AdminUsuariosView from './components/AdminUsuariosView.tsx';
import AdminMesasView from './components/AdminMesasView.tsx';
import AdminIdentidadView from './components/AdminIdentidadView.tsx';
import AdminReportesView from './components/AdminReportesView.tsx';
import AdminAperturaCierreView from './components/AdminAperturaCierreView.tsx';

const AdminPanel = () => {
  const { selectedDate, orders, customers, products, adminSubView, setAdminSubView } = useApp();
  const [showReport, setShowReport] = useState(false);

  // Tab configuration with matching icons and premium labels
  const tabs = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'APERTURA_CIERRE', label: 'Apertura y Cierre', icon: Wallet },
    { id: 'PANEL', label: 'Servicio', icon: Utensils },
    { id: 'PRODUCTOS', label: 'Productos', icon: Tag },
    { id: 'CATEGORIAS', label: 'Categorías', icon: Tags },
    { id: 'USUARIOS', label: 'Personal', icon: Users },
    { id: 'MESAS', label: 'Mesas', icon: Compass },
    { id: 'IDENTIDAD', label: 'Identidad', icon: Settings },
    { id: 'REPORTES', label: 'Reportes', icon: FileText },
  ] as const;

  return (
    <>
      <div className="w-full max-w-7xl space-y-6 md:space-y-8 pb-10 md:pb-25">
        
        {/* Navigation Admin Bar (Mobile only, on desktop sidebar sub-menu is used) */}
        <div className="lg:hidden flex bg-slate-50/90 border border-slate-200/40 backdrop-blur-md p-1 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.015)] overflow-x-auto no-scrollbar mx-auto max-w-fit sticky top-4 z-40">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = adminSubView === id;
            return (
              <button 
                key={id}
                onClick={() => setAdminSubView(id)}
                className={`px-4 md:px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'scale-110' : 'opacity-80'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Admin Sub-Views Router */}
        <div className="mt-8">
          {adminSubView === 'DASHBOARD' && <AdminDashboardView />}
          {adminSubView === 'APERTURA_CIERRE' && <AdminAperturaCierreView />}
          {adminSubView === 'PANEL' && <AdminServicioView setShowReport={setShowReport} />}
          {adminSubView === 'PRODUCTOS' && <AdminProductosView />}
          {adminSubView === 'CATEGORIAS' && <AdminCategoriasView />}
          {adminSubView === 'USUARIOS' && <AdminUsuariosView />}
          {adminSubView === 'MESAS' && <AdminMesasView />}
          {adminSubView === 'IDENTIDAD' && <AdminIdentidadView />}
          {adminSubView === 'REPORTES' && <AdminReportesView />}
        </div>
      </div>

      {/* Financial Sales Report Modal Container */}
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
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-lg rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-display font-black text-slate-800 uppercase tracking-tight">Reporte de Ventas</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{selectedDate}</p>
                  </div>
                </div>
                <button onClick={() => setShowReport(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Modal Calculations Body */}
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto no-scrollbar">
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
                      <div className="grid grid-cols-2 gap-3.5">
                         <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl text-left">
                           <p className="text-[8.5px] font-black text-emerald-600 uppercase tracking-wider mb-1">Efectivo Real</p>
                           <p className="text-xl font-display font-black text-emerald-900 leading-none">S/ {efectivo.toFixed(2)}</p>
                         </div>
                         <div className="bg-sky-50/50 border border-sky-100 p-5 rounded-2xl text-left">
                           <p className="text-[8.5px] font-black text-sky-600 uppercase tracking-wider mb-1">Yape Real</p>
                           <p className="text-xl font-display font-black text-sky-900 leading-none">S/ {yape.toFixed(2)}</p>
                         </div>
                         <div className="bg-brand-50/50 border border-brand-100 p-5 rounded-2xl text-left">
                           <p className="text-[8.5px] font-black text-brand-600 uppercase tracking-wider mb-1">Cobros Créditos</p>
                           <p className="text-xl font-display font-black text-brand-900 leading-none">S/ {customerPaymentsToday.toFixed(2)}</p>
                         </div>
                         <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl text-left">
                           <p className="text-[8.5px] font-black text-rose-600 uppercase tracking-wider mb-1">Ventas p. Cobrar</p>
                           <p className="text-xl font-display font-black text-rose-900 leading-none">S/ {creditoVendido.toFixed(2)}</p>
                           <p className="text-[7.5px] text-rose-450 font-bold uppercase mt-1 leading-none">* Pendiente de cobro</p>
                         </div>
                      </div>

                      {/* Recaudado Total */}
                      <div className="bg-slate-950 p-6 md:p-8 rounded-3xl text-center shadow-lg relative overflow-hidden">
                         <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.25em] mb-2.5">Total Recaudado en Caja</p>
                         <div className="flex items-baseline justify-center gap-1">
                           <span className="text-slate-400 font-bold text-lg">S/</span>
                           <span className="text-4xl md:text-5xl font-display font-black text-white tracking-tight">
                             {totalFinal.toFixed(2)}
                           </span>
                         </div>
                         <p className="text-[8.5px] text-slate-500 font-bold uppercase mt-4.5">
                           Suma Real de Efectivo + Yape + Cobros de Abonos de Hoy.
                         </p>
                      </div>

                      {/* Resumen transaccional */}
                      <div className="space-y-3">
                         <h4 className="text-[9px] font-black text-slate-450 uppercase tracking-widest pl-1 text-left">Composiciòn de Comandas</h4>
                         <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2.5">
                            <div className="flex justify-between text-xs">
                               <span className="text-slate-500 font-black uppercase tracking-tight text-[10px]">Total de Órdenes creadas:</span>
                               <span className="font-sans font-black text-slate-800">{salesToday.length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                               <span className="text-slate-500 font-black uppercase tracking-tight text-[10px]">Órdenes Canceladas:</span>
                               <span className="font-sans font-black text-emerald-600">{salesToday.filter(o => o.estado === 'PAGADO').length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                               <span className="text-slate-500 font-black uppercase tracking-tight text-[10px]">Órdenes en Cuenta Corriente:</span>
                               <span className="font-sans font-black text-brand-600">{salesToday.filter(o => o.estado === 'CREDITO').length}</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              {/* Modal Footer Close */}
              <div className="p-6 md:p-8 pt-0">
                 <button 
                  onClick={() => setShowReport(false)}
                  className="w-full py-4 bg-slate-900 border-b-2 border-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-[10.5px] hover:bg-slate-850 active:scale-98 transition-all shadow-md shadow-slate-100"
                 >
                   Cerrar Reporte Financiero
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
  const { activeView, currentUser, identity } = useApp();

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
        <div className="flex flex-col items-center justify-start p-4 md:p-8 space-y-8 min-h-full w-full">
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
