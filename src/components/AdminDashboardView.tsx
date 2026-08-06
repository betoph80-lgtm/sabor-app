import React from 'react';
import { useApp } from '../AppContext.tsx';
import { 
  TrendingUp, ShoppingBag, DollarSign, Users, 
  CheckCircle2, Clock, CreditCard, Wallet, AlertCircle,
  PieChart, Award, ArrowUpRight, Compass
} from 'lucide-react';

export default function AdminDashboardView() {
  const { 
    orders, selectedDate, tables, customers, currentMenu, 
    cashControls, setAdminSubView 
  } = useApp();

  // Filter orders for selected date
  const todayOrders = (orders || []).filter(o => o.fecha === selectedDate);
  const completedOrders = todayOrders.filter(o => o.estado === 'COBRADO' || o.estado === 'ENTREGADO');
  const openOrders = todayOrders.filter(o => o.estado === 'ABIERTO');
  const creditOrders = todayOrders.filter(o => o.estado === 'CREDITO');

  // Payment Breakdown
  const totalEfectivo = todayOrders
    .filter(o => o.metodoPago === 'EFECTIVO' && o.estado === 'COBRADO')
    .reduce((acc, o) => acc + o.total, 0);

  const totalYape = todayOrders
    .filter(o => o.metodoPago === 'YAPE' && o.estado === 'COBRADO')
    .reduce((acc, o) => acc + o.total, 0);

  const totalCreditoVendido = creditOrders.reduce((acc, o) => acc + o.total, 0);

  const totalCustomerPayments = (customers || []).flatMap(c => 
    (c.historial || []).filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
  ).reduce((acc, t) => acc + t.monto, 0);

  const totalRecaudadoCaja = totalEfectivo + totalYape + totalCustomerPayments;
  const totalVentasRegistradas = todayOrders.reduce((acc, o) => acc + o.total, 0);

  const averageTicket = todayOrders.length > 0 ? totalVentasRegistradas / todayOrders.length : 0;

  // Tables status
  const occupiedTables = (tables || []).filter(t => t.estado === 'OCUPADA').length;
  const freeTables = (tables || []).filter(t => t.estado === 'LIBRE').length;
  const totalTables = (tables || []).length;
  const occupancyPercentage = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  // Top Sold Products Today
  const productSalesMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
  
  todayOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const existing = productSalesMap.get(item.nombre) || { nombre: item.nombre, cantidad: 0, total: 0 };
      existing.cantidad += item.cantidad;
      existing.total += item.precioUnitario * item.cantidad;
      productSalesMap.set(item.nombre, existing);
    });
  });

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  const maxProductQty = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.cantidad)) : 1;

  // Cash status
  const cashToday = cashControls.find(c => c.fecha === selectedDate);
  const isCashClosed = cashToday?.estado === 'CERRADO' || cashToday?.estado === 'CERRADA';

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 p-6 md:p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-brand-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Resumen Ejecutivo</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight uppercase">Dashboard del Día</h2>
          <p className="text-xs text-slate-300 font-medium">
            Fecha de Operación: <span className="font-bold text-white">{selectedDate}</span>
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <div className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border ${
            isCashClosed 
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isCashClosed ? 'bg-rose-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
            {isCashClosed ? 'Caja Cerrada' : 'Caja Abierta'}
          </div>

          <button
            onClick={() => setAdminSubView('REPORTES')}
            className="px-4 py-2 bg-white text-slate-900 hover:bg-brand-50 hover:text-brand-700 transition-all rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>Ver Reportes</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Total Recaudado */}
        <div className="bg-white border border-slate-200/80 p-5 md:p-6 rounded-3xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recaudado Caja</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">
            S/ {totalRecaudadoCaja.toFixed(2)}
          </p>
          <div className="mt-2 text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <span className="text-emerald-600 font-bold">Efectivo + Yape + Abonos</span>
          </div>
        </div>

        {/* Total Pedidos */}
        <div className="bg-white border border-slate-200/80 p-5 md:p-6 rounded-3xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pedidos Hoy</span>
            <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">
            {todayOrders.length}
          </p>
          <div className="mt-2 text-[10px] font-bold flex items-center gap-2">
            <span className="text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> {completedOrders.length} Listos
            </span>
            <span className="text-amber-600 flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {openOrders.length} En proceso
            </span>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white border border-slate-200/80 p-5 md:p-6 rounded-3xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ticket Promedio</span>
            <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">
            S/ {averageTicket.toFixed(2)}
          </p>
          <div className="mt-2 text-[10px] text-slate-500 font-semibold">
            Promedio por mesa/pedido
          </div>
        </div>

        {/* Ocupación de Mesas */}
        <div className="bg-white border border-slate-200/80 p-5 md:p-6 rounded-3xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mesas Ocupadas</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">
            {occupiedTables} <span className="text-base text-slate-400 font-normal">/ {totalTables}</span>
          </p>
          <div className="mt-2 text-[10px] font-bold text-slate-600 flex items-center justify-between">
            <span>{occupancyPercentage}% de Capacidad</span>
            <span className="text-emerald-600">{freeTables} Libres</span>
          </div>
        </div>

      </div>

      {/* Middle Section: Payment Methods & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales by Payment Method */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-[28px] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-600" />
              <h3 className="font-display font-black text-slate-900 text-sm uppercase tracking-wider">Desglose de Ingresos</h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hoy</span>
          </div>

          <div className="space-y-4">
            
            {/* Efectivo */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Efectivo Real
                </span>
                <span className="font-display font-black text-slate-900">S/ {totalEfectivo.toFixed(2)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalRecaudadoCaja > 0 ? (totalEfectivo / totalRecaudadoCaja) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Yape */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-600" /> Yape / Digital Real
                </span>
                <span className="font-display font-black text-slate-900">S/ {totalYape.toFixed(2)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-sky-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalRecaudadoCaja > 0 ? (totalYape / totalRecaudadoCaja) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Cobro Créditos / Abonos */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-600" /> Abonos / Cobro Créditos
                </span>
                <span className="font-display font-black text-slate-900">S/ {totalCustomerPayments.toFixed(2)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalRecaudadoCaja > 0 ? (totalCustomerPayments / totalRecaudadoCaja) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Ventas a Crédito (Pendiente) */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-rose-600 bg-rose-50/50 p-3 rounded-2xl">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Ventas a Crédito (Por Cobrar)
              </span>
              <span className="font-display font-black text-rose-700 text-sm">S/ {totalCreditoVendido.toFixed(2)}</span>
            </div>

          </div>
        </div>

        {/* Top 5 Products */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-[28px] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-black text-slate-900 text-sm uppercase tracking-wider">Top Platos de Hoy</h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Por Cantidad</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-2xl">
              No hay ventas registradas en esta fecha.
            </div>
          ) : (
            <div className="space-y-3.5">
              {topProducts.map((p, idx) => (
                <div key={p.nombre} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2 truncate pr-2">
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-800' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-amber-800/10 text-amber-900' : 'bg-slate-100 text-slate-500'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="truncate">{p.nombre}</span>
                    </span>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 mr-2">{p.cantidad} und</span>
                      <span className="text-slate-400 font-medium">S/ {p.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(p.cantidad / maxProductQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setAdminSubView('PANEL')}
          className="p-4 bg-white border border-slate-200 hover:border-brand-300 rounded-2xl flex items-center justify-between text-slate-800 hover:text-brand-700 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-wider">Gestión de Servicio</p>
              <p className="text-[10px] text-slate-400 font-medium">Configurar carta diaria y menú</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={() => setAdminSubView('PRODUCTOS')}
          className="p-4 bg-white border border-slate-200 hover:border-brand-300 rounded-2xl flex items-center justify-between text-slate-800 hover:text-brand-700 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-wider">Catálogo de Productos</p>
              <p className="text-[10px] text-slate-400 font-medium">Editar precios, fotos y platos</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={() => setAdminSubView('REPORTES')}
          className="p-4 bg-white border border-slate-200 hover:border-brand-300 rounded-2xl flex items-center justify-between text-slate-800 hover:text-brand-700 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-wider">Reportes Detallados</p>
              <p className="text-[10px] text-slate-400 font-medium">Descargar e imprimir auditoría</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

    </div>
  );
}
