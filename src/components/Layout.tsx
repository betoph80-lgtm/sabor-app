/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext.tsx';
import { Flower2, ChefHat, Wallet, User as UserIcon, LayoutDashboard, Database, ListTodo, Users as UsersIcon, Calendar, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    activeView, setActiveView, orders, currentMenu, products, 
    customers, currentCash, selectedDate, setSelectedDate, logout, 
    currentUser, identity, dbConnectedStatus, dbConnectionErrorMessage, 
    recheckDbConnection 
  } = useApp();
  
  const brandParts = (identity?.nombre || 'Sabor Abanquino').split(' ');
  const firstPart = brandParts.slice(0, -1).join(' ') || brandParts[0] || '';
  const lastPart = brandParts.length > 1 ? brandParts[brandParts.length - 1] : '';
  
  const formatDate = (date: Date) => {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };
  
  const today = formatDate(new Date());

  const navigation = [
    { id: 'MESERO', label: 'Mesas', icon: LayoutDashboard, roles: ['ADMIN', 'MESERO'] },
    { id: 'PEDIDOS', label: 'Pedidos', icon: ListTodo, roles: ['ADMIN', 'MESERO', 'PEDIDOS'] },
    { id: 'COCINA', label: 'Cocina', icon: ChefHat, roles: ['ADMIN', 'COCINA'] },
    { id: 'CAJA', label: 'Caja', icon: Wallet, roles: ['ADMIN', 'CAJA'] },
    { id: 'CUENTAS', label: 'Cuentas', icon: UsersIcon, roles: ['ADMIN'] },
    { id: 'ADMIN', label: 'Admin', icon: UserIcon, roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(currentUser?.role as any));

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
  
  // CAJA TOTAL = (Efectivo Ventas + Efectivo Cobros) + (Yape Ventas + Yape Cobros) + Base
  const allPaymentsToday = orders
    .filter(o => o.fecha === selectedDate)
    .flatMap(o => o.pagos || []);

  const totalSalesEfAndYp = allPaymentsToday
    .filter(p => p.metodo === 'EFECTIVO' || p.metodo === 'YAPE' || p.metodo === 'PLIN')
    .reduce((acc, p) => acc + p.monto, 0);
  
  const customerPaymentsTodayRaw = customers.flatMap(c => 
    c.historial.filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
  );

  const totalCobrosEfAndYp = customerPaymentsTodayRaw
    .filter(t => t.metodoPago === 'EFECTIVO' || t.metodoPago === 'YAPE' || t.metodoPago === 'PLIN')
    .reduce((acc, t) => acc + t.monto, 0);

  const baseCaja = currentCash?.montoApertura || 0;
  
  const cajaTotalGlobal = totalSalesEfAndYp + totalCobrosEfAndYp + baseCaja;
  
  const cajaEfectivoOnly = allPaymentsToday.filter(p => p.metodo === 'EFECTIVO').reduce((acc, p) => acc + p.monto, 0) + 
                           customerPaymentsTodayRaw.filter(t => t.metodoPago === 'EFECTIVO').reduce((acc, t) => acc + t.monto, 0) + 
                           baseCaja;
  
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
      <nav className="min-h-[72px] py-1 md:h-22 bg-white border-b border-violet-100 flex items-center justify-between px-2 xs:px-4 md:px-12 shrink-0 z-20 sticky top-0 shadow-[0_4px_30px_rgba(159,103,255,0.03)]">
        <div className="flex items-center gap-3 md:gap-4 shrink-0 group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 to-indigo-505/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-700 font-sans"></div>
            <div className="relative w-11 h-11 xs:w-12 xs:h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.035)] border border-violet-50 p-1 transition-all duration-500 group-hover:scale-105 group-hover:rotate-1 select-none">
              <img 
                src={identity?.logoUrl?.trim() ? identity.logoUrl : "/logo.png"} 
                alt={identity?.nombre || "Logo"} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-violet-50');
                }}
              />
            </div>
          </div>
          <div className="flex flex-col text-left justify-center min-w-0">
            <span className="text-xs xs:text-sm md:text-base font-display font-black tracking-wider uppercase text-slate-800 leading-none group-hover:text-violet-600 transition-colors duration-300 truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm">
              {identity?.nombre || "Sabor Abanquino"}
            </span>
            {identity?.eslogan && identity.eslogan.trim() !== '' && identity.eslogan.trim() !== '-' && (
              <span className="text-[7.5px] xs:text-[8px] md:text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-1 truncate max-w-[120px] xs:max-w-[185px] sm:max-w-xs block leading-none">
                {identity.eslogan}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 xs:gap-3 bg-white border border-slate-200 px-2 xs:px-3 sm:px-5 py-1.5 xs:py-2.5 rounded-xl shadow-sm hover:border-violet-300 transition-all duration-300 relative group h-[36px] xs:h-[42px] sm:h-[46px]">
           <div className="flex items-center gap-1.5 xs:gap-3">
              <Calendar className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 text-violet-500 hidden xs:block" />
              <span className="text-[10px] xs:text-xs sm:text-sm font-sans sm:font-display font-bold text-slate-700 select-none">
                {selectedDate}
              </span>
              {currentUser?.role === 'ADMIN' && (
                <div className="relative flex items-center justify-center w-5 h-5 xs:w-6 xs:h-6 rounded-md hover:bg-slate-100 transition-colors">
                  <Calendar className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                  <input 
                    type="date" 
                    value={toInputDate(selectedDate)}
                    onChange={handleDateChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}
           </div>
           {selectedDate !== today && currentUser?.role === 'ADMIN' && (
              <button 
                onClick={() => setSelectedDate(today)}
                className="px-1.5 xs:px-3 py-0.5 xs:py-1 bg-violet-600 text-white text-[7.5px] xs:text-[9px] rounded-full font-bold uppercase tracking-wider hover:bg-violet-700 transition-all active:scale-95 shadow-sm ml-0.5 xs:ml-1"
              >
                Hoy
              </button>
           )}
        </div>

        <div className="flex gap-2 xs:gap-4 sm:gap-10 items-center ml-auto">
          <div className="flex items-center gap-2 xs:gap-4 md:gap-8 md:pr-12 md:border-r border-violet-100">
            {/* Mobile logout button */}
             <button 
              onClick={logout}
              className="xl:hidden p-2 xs:p-3 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
            >
              <LogOut className="w-4.5 h-4.5 xs:w-5 h-5" />
            </button>
            <div className="flex items-center max-w-[100px] xxs:max-w-[140px] xs:max-w-[240px] sm:max-w-[360px] md:max-w-2xl overflow-x-auto no-scrollbar py-1 scroll-smooth gap-1.5 xs:gap-2">
                {[...soupStock, ...mainStock].map((m, index) => {
                  const product = products.find(prod => prod.id === m.productoId);
                  const isLow = m.stockActual < 5;
                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col justify-center px-1.5 xs:px-2.5 py-1 rounded-lg xs:rounded-xl border transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)] min-w-[45px] xs:min-w-[75px] md:min-w-[90px] leading-none shrink-0 ${
                        isLow 
                          ? 'bg-gradient-to-br from-rose-50 to-white border-rose-200/60 ring-2 ring-rose-500/10' 
                          : 'bg-gradient-to-br from-slate-50/70 to-white border-slate-200/50 hover:from-white hover:border-slate-300'
                      }`}
                      title={product?.nombre}
                    >
                      <div className={`font-black uppercase text-[5.5px] xs:text-[7.5px] tracking-wide truncate max-w-[40px] xs:max-w-[70px] md:max-w-[85px] ${
                        isLow ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        {product?.nombre || 'Plato'}
                      </div>
                      <div className="flex items-baseline gap-0.5 mt-0.5 xs:mt-1">
                        <span className={`font-display font-black text-[10px] xs:text-sm ${isLow ? 'text-rose-700' : 'text-slate-800'}`}>
                          {m.stockActual}
                        </span>
                        <span className="text-slate-400 font-semibold text-[7.5px] xs:text-[9.5px]">/{m.stockInicial}</span>
                      </div>
                    </div>
                  );
                })}
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
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1.5">{currentUser?.nombre || 'Acceso'}</p>
              <p className="text-base font-display font-bold text-slate-900 uppercase tracking-tight">{currentUser?.role}</p>
            </div>
            <button 
              onClick={logout}
              className="p-3 ml-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
          <div className="flex-1 overflow-auto no-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
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
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
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
          
          <div className="hidden lg:flex flex-row justify-center gap-2.5 bg-white/70 backdrop-blur-xl py-2.5 px-6 rounded-full border border-violet-100 shadow-[0_16px_40px_-10px_rgba(106,56,212,0.12)] max-w-fit mx-auto mb-6 mt-1 scale-100 hover:scale-[1.01] transition-all duration-300">
             {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id as any)}
                    className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full transition-all duration-300 font-medium relative overflow-hidden group ${
                      isActive 
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200/80' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{item.label}</span>
                    {!isActive && (
                      <span className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                    )}
                  </button>
                );
             })}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-10 bg-slate-800 text-slate-400 flex items-center px-6 text-[10px] justify-between shrink-0 font-medium z-50">
        <div>Personal en turno: <strong className="text-slate-300">{currentUser?.nombre || 'Ninguno'}</strong></div>
        <div className="flex gap-4 items-center">
          <span 
            className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors"
            title={dbConnectedStatus === 'error' ? `Error: ${dbConnectionErrorMessage}` : 'Conexión activa con Firebase'}
            onClick={() => {
              if (dbConnectedStatus === 'error') {
                recheckDbConnection();
              }
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              dbConnectedStatus === 'conectado' ? 'bg-emerald-500 animate-pulse' :
              dbConnectedStatus === 'conectando' ? 'bg-amber-500 animate-bounce' :
              'bg-rose-500'
            }`}></div>
            Firebase: <strong className={`font-bold transition-colors uppercase tracking-tighter ${
              dbConnectedStatus === 'conectado' ? 'text-emerald-400' :
              dbConnectedStatus === 'conectando' ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {dbConnectedStatus === 'conectado' ? 'Conectado' :
               dbConnectedStatus === 'conectando' ? 'Conectando...' :
               'Error de Conexión'}
            </strong>
            {dbConnectedStatus === 'error' && (
              <span className="text-[8px] bg-rose-900/40 text-rose-300 px-1.5 py-0.5 rounded ml-1 hover:bg-rose-800 transition-colors">
                Reintentar
              </span>
            )}
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono">V 2.5.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
