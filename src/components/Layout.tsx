/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext.tsx';
import { Flower2, ChefHat, Wallet, User as UserIcon, LayoutDashboard, Database, ListTodo, Users as UsersIcon, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, setRole, orders, currentMenu, products, selectedDate, setSelectedDate } = useApp();
  
  const formatDate = (date: Date) => {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };
  
  const today = formatDate(new Date());

  const navigation = [
    { id: 'MESERO', label: 'Mesas', icon: LayoutDashboard },
    { id: 'PEDIDOS', label: 'Pedidos', icon: ListTodo },
    { id: 'COCINA', label: 'Cocina', icon: ChefHat },
    { id: 'CAJA', label: 'Caja', icon: Wallet },
    { id: 'CUENTAS', label: 'Cuentas', icon: UsersIcon },
    { id: 'ADMIN', label: 'Admin', icon: UserIcon },
  ];

  // Logic to handle date change from <input type="date">
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value; // yyyy-mm-dd
    if (rawValue) {
      const [y, m, d] = rawValue.split('-');
      const formattedDate = `${parseInt(d)}/${parseInt(m)}/${y}`;
      setSelectedDate(formattedDate);
    }
  };

  // Convert "d/m/yyyy" to "yyyy-mm-dd" for the input value
  const toInputDate = (dateStr: string) => {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  // Calculate stats for sidebar
  const activeOrdersCount = orders.filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate).length;
  const totalRevenue = orders.filter(o => o.estado === 'PAGADO' && o.fecha === selectedDate).reduce((acc, o) => acc + o.total, 0);
  
  // Calculate stock summaries
  const dailyMenu = currentMenu.filter(m => m.fecha === selectedDate);
  const soupStock = dailyMenu.filter(m => products.find(p => p.id === m.productoId)?.tipo === 'SOPA');
  const mainStock = dailyMenu.filter(m => products.find(p => p.id === m.productoId)?.tipo === 'SEGUNDO');
  const extraStock = dailyMenu.filter(m => products.find(p => p.id === m.productoId)?.categoria === 'EXTRA');
  const drinkStock = dailyMenu.filter(m => products.find(p => p.id === m.productoId)?.categoria === 'BEBIDA');
  
  const totalSoupStock = soupStock.reduce((acc, m) => acc + m.stockActual, 0);
  const totalSoupInitial = soupStock.reduce((acc, m) => acc + m.stockInicial, 0);
  const totalMainStock = mainStock.reduce((acc, m) => acc + m.stockActual, 0);
  const totalMainInitial = mainStock.reduce((acc, m) => acc + m.stockInicial, 0);
  const totalExtraStock = extraStock.reduce((acc, m) => acc + m.stockActual, 0);
  const totalExtraInitial = extraStock.reduce((acc, m) => acc + m.stockInicial, 0);
  const totalDrinkStock = drinkStock.reduce((acc, m) => acc + m.stockActual, 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Header / Navbar */}
      <nav className="h-[72px] md:h-28 bg-white border-b border-violet-100 flex items-center justify-between px-4 md:px-12 shrink-0 z-20 sticky top-0 shadow-[0_4px_30px_rgba(159,103,255,0.03)]">
        <div className="flex items-center gap-4 md:gap-10 shrink-0 group cursor-pointer">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-tr from-violet-500/20 to-brand-500/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
            <div className="relative w-12 h-12 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-[28px] flex items-center justify-center overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-violet-50 p-1.5 md:p-2.5 transition-all duration-500 group-hover:scale-105 group-hover:rotate-1">
              <img 
                src="/logo.png" 
                alt="Sabor Abanquino" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-violet-50');
                }}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight hidden sm:block uppercase italic leading-none text-slate-900 group-hover:text-violet-600 transition-colors duration-300">
              Sabor <span className="text-violet-600">Abanquino</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="w-8 h-px bg-violet-200 hidden sm:block"></span>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase hidden sm:block">Gastronomía & Tradición</p>
            </div>
          </div>
          <h1 className="text-xl font-display font-bold tracking-tighter block sm:hidden uppercase italic text-violet-600">SA</h1>
        </div>

        <div className="hidden lg:flex items-center gap-6 bg-violet-50/30 px-8 py-4 rounded-[32px] border border-violet-100/50">
           <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-violet-500" />
              <input 
                type="date" 
                value={toInputDate(selectedDate)}
                onChange={handleDateChange}
                className="bg-transparent text-sm font-display font-bold text-slate-700 outline-none cursor-pointer hover:text-violet-600 transition-colors"
              />
           </div>
           {selectedDate !== today && (
              <button 
                onClick={() => setSelectedDate(today)}
                className="px-5 py-2 bg-violet-600 text-white text-[10px] rounded-full font-bold uppercase tracking-widest hover:bg-violet-700 transition-all active:scale-95 shadow-lg shadow-violet-100"
              >
                Hoy
              </button>
           )}
        </div>

        <div className="flex gap-4 sm:gap-10 items-center ml-auto">
          <div className="flex items-center gap-4 md:gap-8 md:pr-12 md:border-r border-violet-100">
            <div className="text-right shrink-0 group">
              <p className="text-[8px] md:text-[9px] text-slate-400 uppercase font-black tracking-[0.2em] leading-none mb-1.5 md:mb-2.5 px-1">Sopa</p>
              <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm group-hover:border-violet-200 group-hover:scale-105 transition-all duration-300">
                <p className="text-sm md:text-base leading-tight font-display font-bold text-slate-900 whitespace-nowrap">
                   {totalSoupStock} <span className="text-violet-400">/</span> <span className="text-slate-400">{totalSoupInitial}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 group">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em] leading-none mb-2.5 px-1">Segundo</p>
              <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm group-hover:border-violet-200 group-hover:scale-105 transition-all duration-300">
                <p className="text-sm md:text-base leading-tight font-display font-bold text-slate-900 whitespace-nowrap">
                  {totalMainStock} <span className="text-violet-400">/</span> <span className="text-slate-400">{totalMainInitial}</span>
                </p>
              </div>
            </div>
</div>
          
          <div className="hidden xl:flex items-center gap-5 pl-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 soft-shadow-sm group-hover:scale-105 transition-transform duration-300">
                <ChefHat className="w-8 h-8" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1.5">Acceso</p>
              <p className="text-base font-display font-bold text-slate-900 uppercase tracking-tight">{role}</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Aside (Simplified for mobile, full on desktop) */}
        <aside className="hidden lg:flex w-72 bg-white border-r border-violet-50 p-8 flex-col gap-10 shrink-0">
          <section>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase mb-5 tracking-[0.2em]">Visión General</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-violet-50/50 rounded-[24px] border border-violet-100/30 shadow-sm">
                <span className="font-semibold text-sm text-violet-900">Comandas en Curso</span>
                <span className="bg-violet-600 text-white px-3 py-1 rounded-full text-xs font-bold leading-none">{String(activeOrdersCount).padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-[24px] border border-slate-100 opacity-60">
                <span className="font-semibold text-sm text-slate-600">Mesas Libres</span>
                <span className="bg-slate-300 text-white px-3 py-1 rounded-full text-xs font-bold leading-none">00</span>
              </div>
            </div>
          </section>

          <section className="mt-auto">
            <div className="bg-violet-50/50 p-6 rounded-[32px] border border-violet-100/50 shadow-sm">
              <p className="text-[10px] text-violet-600 font-bold uppercase mb-2 tracking-widest">Caja Total</p>
              <p className="text-4xl font-display font-bold text-violet-800 tracking-tight leading-none">S/ {totalRevenue.toFixed(2)}</p>
              <p className="text-[10px] text-violet-400 mt-3 font-medium opacity-80">Cierre sincronizado</p>
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
          <nav className="lg:hidden bg-white border-t border-slate-200 flex justify-around items-center px-2 py-2 shrink-0 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = role === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRole(item.id)}
                  className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative ${
                    isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110 drop-shadow-sm' : ''} transition-all`} />
                  <span className={`text-[9px] font-bold uppercase tracking-[0.1em] ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabMobile"
                      className="absolute -top-1 w-10 h-1 bg-brand-600 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>
          
          <div className="hidden lg:flex flex-row justify-center gap-2 border-t border-violet-100 bg-white/80 backdrop-blur-md p-3">
             {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = role === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setRole(item.id)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-[18px] transition-all duration-300 ${
                      isActive ? 'bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'scale-110' : ''}`} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{item.label}</span>
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
