/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext.tsx';
import { useTheme } from '../ThemeContext.tsx';
import { Flower2, ChefHat, Wallet, User as UserIcon, LayoutDashboard, Database, ListTodo, Users as UsersIcon, Calendar, LogOut, Utensils, Tag, Tags, Compass, Settings, FileText, ChevronDown, ChevronRight, ChevronLeft, PanelLeftClose, PanelLeftOpen, Scale, Bell, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WaiterNotificationToast } from './WaiterNotificationToast.tsx';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminExpanded, setIsAdminExpanded] = React.useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const { 
    activeView, setActiveView, adminSubView, setAdminSubView, orders, currentMenu, products, 
    customers, currentCash, selectedDate, setSelectedDate, logout, 
    currentUser, identity, dbConnectedStatus, dbConnectionErrorMessage, 
    recheckDbConnection 
  } = useApp();
  
  const { theme, isDark, toggleTheme } = useTheme();
  
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
    { id: 'ADMIN', label: 'Admin', icon: UserIcon, roles: ['ADMIN', 'CAJA'] },
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

  const totalEfectivoVentas = allPaymentsToday
    .filter(p => p.metodo === 'EFECTIVO')
    .reduce((acc, p) => acc + p.monto, 0);

  const totalYapeVentas = allPaymentsToday
    .filter(p => p.metodo === 'YAPE' || p.metodo === 'PLIN')
    .reduce((acc, p) => acc + p.monto, 0);
  
  const customerPaymentsTodayRaw = customers.flatMap(c => 
    c.historial.filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
  );

  const totalEfectivoCobros = customerPaymentsTodayRaw
    .filter(t => t.metodoPago === 'EFECTIVO')
    .reduce((acc, t) => acc + t.monto, 0);

  const totalYapeCobros = customerPaymentsTodayRaw
    .filter(t => t.metodoPago === 'YAPE' || t.metodoPago === 'PLIN')
    .reduce((acc, t) => acc + t.monto, 0);

  const baseCaja = currentCash?.montoApertura || 0;
  
  const totalCajaGlobal = totalEfectivoVentas + totalEfectivoCobros + totalYapeVentas + totalYapeCobros + baseCaja;
  const totalCajaEfectivo = totalEfectivoVentas + totalEfectivoCobros + baseCaja;
  const totalYapeGlobal = totalYapeVentas + totalYapeCobros;
  
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
    <div className="flex flex-col h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Waiter Live Notification Banners */}
      <WaiterNotificationToast />

      {/* Header / Navbar */}
      <nav className="min-h-[72px] py-1 md:h-22 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-2 xs:px-4 md:px-10 shrink-0 z-20 sticky top-0 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3 md:gap-4 shrink-0 group cursor-pointer">
          <div className="relative">
            <div className="relative w-11 h-11 xs:w-12 xs:h-12 md:w-14 md:h-14 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 p-1 transition-all duration-500 group-hover:scale-105 select-none">
              <img 
                src={identity?.logoUrl?.trim() ? identity.logoUrl : "/logo.png"} 
                alt={identity?.nombre || "Logo"} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-brand-50');
                }}
              />
            </div>
          </div>
          <div className="flex flex-col text-left justify-center min-w-0">
            <span className="text-xs xs:text-sm md:text-base font-display font-black tracking-wider uppercase text-slate-800 dark:text-white leading-none group-hover:text-brand-500 transition-colors duration-300 truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm">
              {identity?.nombre || "Sabor Abanquino"}
            </span>
            {identity?.eslogan && identity.eslogan.trim() !== '' && identity.eslogan.trim() !== '-' && (
              <span className="text-[7.5px] xs:text-[8px] md:text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400 mt-1 truncate max-w-[120px] xs:max-w-[185px] sm:max-w-xs block leading-none">
                {identity.eslogan}
              </span>
            )}
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 xs:gap-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2 xs:px-3 sm:px-5 py-1.5 xs:py-2.5 rounded-xl shadow-sm hover:border-brand-500 transition-all duration-300 relative group h-[36px] xs:h-[42px] sm:h-[46px]">
           <div className="flex items-center gap-1.5 xs:gap-3">
              <Calendar className="w-3.5 h-3.5 xs:w-4.5 xs:h-4.5 text-brand-500 hidden xs:block" />
              <span className="text-[10px] xs:text-xs sm:text-sm font-sans sm:font-display font-bold text-slate-700 dark:text-slate-200 select-none">
                {selectedDate}
              </span>
              {currentUser?.role === 'ADMIN' && (
                <div className="relative flex items-center justify-center w-5 h-5 xs:w-6 xs:h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Calendar className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
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
                className="px-1.5 xs:px-3 py-0.5 xs:py-1 bg-brand-600 text-white text-[7.5px] xs:text-[9px] rounded-full font-bold uppercase tracking-wider hover:bg-brand-700 transition-all active:scale-95 shadow-sm ml-0.5 xs:ml-1"
              >
                Hoy
              </button>
           )}
        </div>

        <div className="flex gap-2 xs:gap-4 sm:gap-6 items-center ml-auto">
          {/* Quick Stock Indicator Strip */}
          <div className="flex items-center gap-2 xs:gap-3 md:gap-4 md:pr-4 md:border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center max-w-[90px] xxs:max-w-[130px] xs:max-w-[200px] sm:max-w-[320px] md:max-w-xl overflow-x-auto no-scrollbar py-1 scroll-smooth gap-1.5 xs:gap-2">
                {[...soupStock, ...mainStock].map((m) => {
                  const product = products.find(prod => prod.id === m.productoId);
                  const isLow = m.stockActual < 5;
                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col justify-center px-1.5 xs:px-2.5 py-1 rounded-lg xs:rounded-xl border transition-all duration-300 shadow-2xs min-w-[45px] xs:min-w-[75px] md:min-w-[85px] leading-none shrink-0 ${
                        isLow 
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60' 
                          : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                      title={product?.nombre}
                    >
                      <div className={`font-black uppercase text-[5.5px] xs:text-[7.5px] tracking-wide truncate max-w-[40px] xs:max-w-[70px] md:max-w-[80px] ${
                        isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-400'
                      }`}>
                        {product?.nombre || 'Plato'}
                      </div>
                      <div className="flex items-baseline gap-0.5 mt-0.5 xs:mt-1">
                        <span className={`font-display font-black text-[10px] xs:text-sm ${isLow ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-white'}`}>
                          {m.stockActual}
                        </span>
                        <span className="text-slate-400 dark:text-slate-400 font-semibold text-[7.5px] xs:text-[9.5px]">/{m.stockInicial}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            id="btn-global-theme-toggle"
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 p-2 xs:px-3 xs:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 xs:w-4.5 xs:h-4.5 text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-slate-200">Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 xs:w-4.5 xs:h-4.5 text-slate-700" />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-slate-700">Oscuro</span>
              </>
            )}
          </button>
          
          {/* User Profile & Logout */}
          <div className="flex items-center gap-2.5">
            <div className="hidden xl:flex items-center gap-3 pl-2 group">
              <div className="relative">
                <div className="relative w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform duration-300">
                  <ChefHat className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-black tracking-widest leading-none mb-1">{currentUser?.nombre || 'Acceso'}</p>
                <p className="text-xs font-display font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{currentUser?.role}</p>
              </div>
            </div>

            <button 
              onClick={logout}
              className="p-2 xs:p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800/40"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar for Desktop (PC) */}
        <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-[76px] px-2 py-4' : 'w-64 p-4'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-full min-h-0 relative justify-between select-none shadow-sm z-10 transition-all duration-300`}>
          {/* Navigation Items */}
          <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1 pb-12 scroll-smooth">
            {isSidebarCollapsed ? (
              <div className="flex items-center justify-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setIsSidebarCollapsed(false)} 
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-xs"
                  title="Expandir Panel Lateral"
                >
                  <PanelLeftOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-2 px-3">
                <span>Módulos Activos</span>
                <button 
                  onClick={() => setIsSidebarCollapsed(true)} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  title="Minimizar Panel"
                >
                  <PanelLeftClose className="w-4.5 h-4.5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            )}
            
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isNavAdmin = item.id === 'ADMIN';

              const adminSubModules = [
                { id: 'DASHBOARD' as const, label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
                { id: 'APERTURA_CIERRE' as const, label: 'Apertura y Cierre', icon: Wallet, roles: ['ADMIN', 'CAJA'] },
                { id: 'CONTABILIDAD' as const, label: 'Contabilidad SUNAT', icon: Scale, roles: ['ADMIN', 'CAJA'] },
                { id: 'PANEL' as const, label: 'Servicio', icon: Utensils, roles: ['ADMIN'] },
                { id: 'PRODUCTOS' as const, label: 'Productos', icon: Tag, roles: ['ADMIN'] },
                { id: 'CATEGORIAS' as const, label: 'Categorías', icon: Tags, roles: ['ADMIN'] },
                { id: 'USUARIOS' as const, label: 'Personal', icon: UsersIcon, roles: ['ADMIN'] },
                { id: 'MESAS' as const, label: 'Mesas', icon: Compass, roles: ['ADMIN'] },
                { id: 'IDENTIDAD' as const, label: 'Identidad', icon: Settings, roles: ['ADMIN'] },
                { id: 'REPORTES' as const, label: 'Reportes', icon: FileText, roles: ['ADMIN', 'CAJA'] },
              ].filter(sub => !sub.roles || sub.roles.includes(currentUser?.role as any));

              if (isSidebarCollapsed) {
                // Collapsed (Icon-Only Mode)
                return (
                  <React.Fragment key={item.id}>
                    <button
                      onClick={() => {
                        setActiveView(item.id as any);
                        if (isNavAdmin) {
                          setIsAdminExpanded(!isAdminExpanded);
                          if (currentUser?.role === 'CAJA' && adminSubView !== 'APERTURA_CIERRE' && adminSubView !== 'REPORTES') {
                            setAdminSubView('APERTURA_CIERRE');
                          }
                        }
                      }}
                      title={item.label}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-300 font-semibold relative group w-full cursor-pointer ${
                        isActive 
                          ? 'bg-brand-600 text-white shadow-sm' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 transition-transform duration-300 shrink-0 ${isActive ? 'scale-110' : 'text-slate-400 dark:text-slate-400 group-hover:scale-110 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
                      <span className="text-[7.5px] font-black uppercase tracking-tight mt-1 leading-none text-center truncate max-w-full">
                        {item.label}
                      </span>
                    </button>

                    {/* Compact sub-module icons when ADMIN is expanded in collapsed mode */}
                    {isNavAdmin && isAdminExpanded && (
                      <div className="flex flex-col items-center gap-1 my-1 py-1.5 border-y border-slate-200/80 dark:border-slate-800 w-full bg-slate-50/50 dark:bg-slate-850 rounded-xl">
                        {adminSubModules.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = activeView === 'ADMIN' && adminSubView === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setActiveView('ADMIN');
                                setAdminSubView(sub.id);
                              }}
                              title={`Admin: ${sub.label}`}
                              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-brand-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                            >
                              <SubIcon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              // Expanded Mode
              return (
                <React.Fragment key={item.id}>
                  <button
                    onClick={() => {
                      setActiveView(item.id as any);
                      if (isNavAdmin) {
                        setIsAdminExpanded(!isAdminExpanded);
                        if (currentUser?.role === 'CAJA' && adminSubView !== 'APERTURA_CIERRE' && adminSubView !== 'REPORTES') {
                          setAdminSubView('APERTURA_CIERRE');
                        }
                      }
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 font-semibold relative overflow-hidden group w-full cursor-pointer ${
                      isActive 
                        ? 'bg-brand-600 text-white shadow-sm' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 transition-transform duration-300 shrink-0 ${isActive ? 'scale-110' : 'text-slate-400 dark:text-slate-400 group-hover:scale-110 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em]">{item.label}</span>
                    
                    {isNavAdmin && (
                      <span className="ml-auto flex items-center shrink-0">
                        {isAdminExpanded ? (
                          <ChevronDown className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        ) : (
                          <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        )}
                      </span>
                    )}

                    {!isActive && (
                      <span className="absolute inset-0 bg-brand-500/5 dark:bg-brand-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                    )}
                  </button>

                  {/* Nested Sub-Modules when ADMIN is present and expanded */}
                  {isNavAdmin && isAdminExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="ml-3.5 pl-2.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-0.5 py-1 my-0.5"
                    >
                      {adminSubModules.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeView === 'ADMIN' && adminSubView === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setActiveView('ADMIN');
                              setAdminSubView(sub.id);
                            }}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all w-full text-left cursor-pointer ${
                              isSubActive
                                ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-extrabold shadow-xs border border-brand-200/80 dark:border-brand-800/60'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-brand-600 dark:text-brand-400 scale-110' : 'text-slate-400'}`} />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Sidebar Footer Info Card */}
          {isSidebarCollapsed ? (
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-2 rounded-2xl mt-2 flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-8 h-8 bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-400 rounded-xl flex items-center justify-center shrink-0" title={currentUser?.role}>
                <ChefHat className="w-4 h-4" />
              </div>
              <div className="text-center" title={`Caja Total: S/ ${totalCajaGlobal.toFixed(2)}`}>
                <span className="text-[7.5px] font-black text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-800 px-1 py-0.5 rounded block font-mono">
                  S/{Math.round(totalCajaGlobal)}
                </span>
              </div>
              <div className="text-center" title="Pedidos Abiertos">
                <span className="text-[8.5px] font-black text-brand-700 dark:text-brand-300 bg-brand-100/80 dark:bg-brand-900/60 px-1.5 py-0.5 rounded-md block font-mono">
                  {activeOrdersCount}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl space-y-2 mt-2 shrink-0">
              {/* User Session & Status */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-400 rounded-xl flex items-center justify-center shrink-0">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest truncate leading-none mb-0.5">{currentUser?.nombre || 'Sesión'}</p>
                    <p className="text-[11px] font-bold text-brand-700 dark:text-brand-300 uppercase tracking-tight truncate leading-none">{currentUser?.role}</p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-lg text-[7.5px] font-black uppercase tracking-wider ${
                  currentCash?.estado === 'ABIERTA' 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800' 
                    : currentCash?.estado === 'CERRADA'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                  {currentCash?.estado === 'ABIERTA' ? 'Abierta' : currentCash?.estado === 'CERRADA' ? 'Cerrada' : 'Sin Caja'}
                </span>
              </div>
              
              {/* Resumen de Caja */}
              <div className="space-y-1.5 border-t border-slate-200/80 dark:border-slate-800 pt-2">
                {/* Caja Total Highlight */}
                <div className="bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="text-[8px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider block">Caja Total</span>
                    <span className="text-[6.5px] text-slate-400 uppercase block">Efectivo + Yape + Base</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white font-display text-xs">
                    S/ {totalCajaGlobal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Subtotales: Efectivo Real y Total Yape */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700">
                    <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Caja Real</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-[10px] leading-tight block">
                      S/ {totalCajaEfectivo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[6px] text-slate-400 uppercase block truncate">Efectivo + Base</span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700">
                    <span className="text-[7px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Total Yape</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-[10px] leading-tight block">
                      S/ {totalYapeGlobal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[6px] text-slate-400 uppercase block truncate">Yape / Plin</span>
                  </div>
                </div>

                <div className="flex justify-between items-center px-1 pt-0.5 text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium text-[9.5px]">Pedidos Abiertos</span>
                  <span className="font-extrabold text-brand-700 dark:text-brand-300 bg-brand-100/70 dark:bg-brand-900/60 px-1.5 py-0.5 rounded-md text-[9px] font-mono">
                    {activeOrdersCount}
                  </span>
                </div>
              </div>
              
              <div className="text-[8px] text-slate-400 uppercase tracking-wider flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>Sabor Abanquino</span>
                <span>v 2.5.0</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100/70 dark:bg-slate-950 relative transition-colors duration-200">
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

          {/* Mobile Bottom Navigation (Only visible on screens smaller than lg) */}
          <nav className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center px-2 py-2 shrink-0 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-colors duration-200">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative ${
                    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110 drop-shadow-sm' : ''} transition-all`} />
                  <span className={`text-[9px] font-bold uppercase tracking-[0.1em] ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabMobile"
                      className="absolute -top-1 w-10 h-1 bg-brand-600 dark:bg-brand-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-10 bg-slate-900 dark:bg-slate-950 text-slate-400 flex items-center px-6 text-[10px] justify-between shrink-0 font-medium z-50 border-t border-slate-800">
        <div>Personal en turno: <strong className="text-slate-200">{currentUser?.nombre || 'Ninguno'}</strong></div>
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
