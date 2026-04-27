/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext.tsx';
import { Flower2, ChefHat, Wallet, User as UserIcon, LayoutDashboard, Database, ListTodo, Users as UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, setRole, orders, currentMenu, products } = useApp();

  const navigation = [
    { id: 'MESERO', label: 'Mesas', icon: LayoutDashboard },
    { id: 'PEDIDOS', label: 'Pedidos', icon: ListTodo },
    { id: 'COCINA', label: 'Cocina', icon: ChefHat },
    { id: 'CAJA', label: 'Caja', icon: Wallet },
    { id: 'CUENTAS', label: 'Cuentas', icon: UsersIcon },
    { id: 'ADMIN', label: 'Admin', icon: UserIcon },
  ];

  // Calculate stats for sidebar
  const activeOrdersCount = orders.filter(o => o.estado === 'ABIERTO').length;
  const totalRevenue = orders.filter(o => o.estado === 'PAGADO').reduce((acc, o) => acc + o.total, 0);
  
  // Calculate stock summaries
  const soupStock = currentMenu.filter(m => products.find(p => p.id === m.productoId)?.tipo === 'SOPA');
  const mainStock = currentMenu.filter(m => products.find(p => p.id === m.productoId)?.tipo === 'SEGUNDO');
  const extraStock = currentMenu.filter(m => products.find(p => p.id === m.productoId)?.categoria === 'EXTRA');
  const drinkStock = currentMenu.filter(m => products.find(p => p.id === m.productoId)?.categoria === 'BEBIDA');
  
  const totalSoupStock = soupStock.reduce((acc, m) => acc + m.stockActual, 0);
  const totalSoupInitial = soupStock.reduce((acc, m) => acc + m.stockInicial, 0);
  const totalMainStock = mainStock.reduce((acc, m) => acc + m.stockActual, 0);
  const totalMainInitial = mainStock.reduce((acc, m) => acc + m.stockInicial, 0);
  const totalExtraStock = extraStock.reduce((acc, m) => acc + m.stockActual, 0);
  const totalExtraInitial = extraStock.reduce((acc, m) => acc + m.stockInicial, 0);
  const totalDrinkStock = drinkStock.reduce((acc, m) => acc + m.stockActual, 0);

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
      {/* Header / Navbar */}
      <nav className="h-16 md:h-20 bg-violet-600 text-white flex items-center justify-between px-4 md:px-8 shadow-md shrink-0 z-20">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center font-bold text-violet-600 overflow-hidden border-2 border-violet-200 rotate-3 shadow-lg">
            <Flower2 className="w-6 h-6 md:w-8 md:h-8 text-violet-500" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-black tracking-tighter hidden sm:block uppercase italic leading-none">Sabor Abanquino</h1>
            <p className="text-[7px] md:text-[8px] font-black text-violet-100 tracking-[0.3em] uppercase hidden sm:block">Gastronomía & Tradición</p>
          </div>
          <h1 className="text-xl font-black tracking-tighter block sm:hidden uppercase italic">SA</h1>
        </div>

        <div className="flex gap-2 sm:gap-6 items-center overflow-x-auto no-scrollbar ml-4">
          <div className="text-right shrink-0">
            <p className="text-[7px] md:text-[9px] text-violet-100 uppercase font-black tracking-widest leading-none mb-0.5 md:mb-1">Sopa</p>
            <p className="text-xs md:text-sm leading-tight font-mono whitespace-nowrap">{totalSoupStock} <span className="text-violet-200">/</span> {totalSoupInitial}</p>
          </div>
          <div className="text-right border-l border-violet-400/50 pl-2 md:pl-4 shrink-0">
            <p className="text-[7px] md:text-[9px] text-violet-100 uppercase font-black tracking-widest leading-none mb-0.5 md:mb-1">Segund.</p>
            <p className="text-xs md:text-sm leading-tight font-mono whitespace-nowrap">{totalMainStock} <span className="text-violet-200">/</span> {totalMainInitial}</p>
          </div>
          <div className="text-right border-l border-violet-400/50 pl-2 md:pl-4 shrink-0">
            <p className="text-[7px] md:text-[9px] text-violet-100 uppercase font-black tracking-widest leading-none mb-0.5 md:mb-1">Extra</p>
            <p className="text-xs md:text-sm leading-tight font-mono whitespace-nowrap">{totalExtraStock} <span className="text-violet-200">/</span> {totalExtraInitial}</p>
          </div>
          <div className="hidden xs:block text-right border-l border-violet-400/50 pl-2 md:pl-4 shrink-0">
            <p className="text-[7px] md:text-[9px] text-violet-100 uppercase font-black tracking-widest leading-none mb-0.5 md:mb-1">Bebida</p>
            <p className="text-xs md:text-sm leading-tight font-mono whitespace-nowrap">{totalDrinkStock}</p>
          </div>
          <div className="hidden lg:flex flex-col items-end border-l border-violet-400 pl-6">
            <p className="text-[10px] text-violet-100 uppercase font-bold tracking-widest leading-none mb-1">Rol Actual</p>
            <p className="text-xs font-mono text-emerald-400 uppercase">{role}</p>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Aside (Simplified for mobile, full on desktop) */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 p-6 flex-col gap-8 shrink-0">
          <section>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Resumen de Sala</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-violet-50 rounded-xl border border-violet-100">
                <span className="font-semibold text-sm text-violet-900">Pedidos Activos</span>
                <span className="bg-violet-500 text-white px-2 py-0.5 rounded text-xs font-bold">{String(activeOrdersCount).padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-60">
                <span className="font-semibold text-sm text-slate-600 font-medium">Mesas en Espera</span>
                <span className="bg-slate-400 text-white px-2 py-0.5 rounded text-xs font-bold">00</span>
              </div>
            </div>
          </section>

          <section className="mt-auto">
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm shadow-emerald-50">
              <p className="text-[10px] text-emerald-600 font-bold uppercase mb-2 tracking-wider">Caja Estimada</p>
              <p className="text-3xl font-bold text-emerald-800 leading-none">S/ {totalRevenue.toFixed(2)}</p>
              <p className="text-[10px] text-emerald-600 mt-2 font-medium">Actualizado hace un momento</p>
            </div>
          </section>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
          <div className="flex-1 overflow-auto no-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="lg:hidden bg-white border-t border-slate-200 flex justify-around items-center px-2 py-1 shrink-0 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = role === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRole(item.id)}
                  className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative ${
                    isActive ? 'text-violet-500' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -top-1 w-10 h-1 bg-violet-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>
          
          {/* Desktop Footer (Navigation included here too or separate rail?) */}
          {/* The design uses icons on the left for navigation in some dashboards, 
              but the Professional Polish layout has a footer. 
              Let's keep the nav button logic but stylized. */}
          <div className="hidden lg:flex flex-row justify-around border-t border-slate-200 bg-white p-2">
             {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = role === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setRole(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      isActive ? 'bg-violet-50 text-violet-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                  </button>
                );
             })}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-10 bg-slate-800 text-slate-400 flex items-center px-6 text-[10px] justify-between shrink-0 font-medium">
        <div>Personal en turno: <strong className="text-slate-300">Admin / Cocina Principal</strong></div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            Estatus: <strong className="text-slate-300 uppercase tracking-tighter">Conectado</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono">V 2.5.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
