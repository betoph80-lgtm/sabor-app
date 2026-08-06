import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext.tsx';
import { 
  FileText, Download, Printer, Search, Calendar, 
  DollarSign, CreditCard, Wallet, Users, CheckCircle2, 
  XCircle, Clock, Filter, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { Order } from '../types.ts';

export default function AdminReportesView() {
  const { orders, selectedDate, setSelectedDate, customers, categories } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('TODOS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');

  // Filter orders by date, status, payment method, category & search term
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(order => {
      // Date filter
      if (order.fecha !== selectedDate) return false;

      // Status filter
      if (selectedStatus !== 'TODOS' && order.estado !== selectedStatus) return false;

      // Payment Method filter
      if (selectedPaymentMethod !== 'TODOS' && order.metodoPago !== selectedPaymentMethod) return false;

      // Category filter (if any item matches)
      if (selectedCategory !== 'TODOS') {
        const hasCategory = (order.items || []).some(i => i.categoria === selectedCategory);
        if (!hasCategory) return false;
      }

      // Search term (Order ID, Client, Mesa)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(term);
        const matchesClient = (order.cliente || '').toLowerCase().includes(term);
        const matchesMesa = (order.mesaId || '').toLowerCase().includes(term);
        const matchesItems = (order.items || []).some(i => (i.nombre || '').toLowerCase().includes(term));
        if (!matchesId && !matchesClient && !matchesMesa && !matchesItems) return false;
      }

      return true;
    });
  }, [orders, selectedDate, selectedStatus, selectedPaymentMethod, selectedCategory, searchTerm]);

  // Daily Totals calculation based on all orders for selectedDate
  const allTodayOrders = useMemo(() => (orders || []).filter(o => o.fecha === selectedDate), [orders, selectedDate]);

  const totalEfectivo = useMemo(() => {
    return allTodayOrders
      .filter(o => o.metodoPago === 'EFECTIVO' && o.estado === 'COBRADO')
      .reduce((acc, o) => acc + o.total, 0);
  }, [allTodayOrders]);

  const totalYape = useMemo(() => {
    return allTodayOrders
      .filter(o => o.metodoPago === 'YAPE' && o.estado === 'COBRADO')
      .reduce((acc, o) => acc + o.total, 0);
  }, [allTodayOrders]);

  const totalCreditoVendido = useMemo(() => {
    return allTodayOrders
      .filter(o => o.estado === 'CREDITO')
      .reduce((acc, o) => acc + o.total, 0);
  }, [allTodayOrders]);

  const customerPaymentsToday = useMemo(() => {
    return (customers || []).flatMap(c => 
      (c.historial || []).filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
    ).reduce((acc, t) => acc + t.monto, 0);
  }, [customers, selectedDate]);

  const totalRecaudadoCaja = totalEfectivo + totalYape + customerPaymentsToday;
  const totalVentasCompletadas = allTodayOrders
    .filter(o => o.estado === 'COBRADO' || o.estado === 'ENTREGADO')
    .reduce((acc, o) => acc + o.total, 0);

  // Print handle
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-[28px] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">Reportes y Auditoría de Ventas</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Consolidado de caja, pedidos e historial financiero
            </p>
          </div>
        </div>

        {/* Date and Print Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 uppercase focus:outline-none w-24"
              placeholder="D/M/YYYY"
            />
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-brand-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards for Selected Date */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-5">
        
        <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-3xl text-left">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> Efectivo en Caja
          </p>
          <p className="text-2xl font-display font-black text-emerald-950">S/ {totalEfectivo.toFixed(2)}</p>
        </div>

        <div className="bg-sky-50/60 border border-sky-100 p-5 rounded-3xl text-left">
          <p className="text-[9px] font-black text-sky-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> Yape / Digital
          </p>
          <p className="text-2xl font-display font-black text-sky-950">S/ {totalYape.toFixed(2)}</p>
        </div>

        <div className="bg-purple-50/60 border border-purple-100 p-5 rounded-3xl text-left">
          <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Cobro Abonos
          </p>
          <p className="text-2xl font-display font-black text-purple-950">S/ {customerPaymentsToday.toFixed(2)}</p>
        </div>

        <div className="bg-slate-900 text-white p-5 rounded-3xl text-left shadow-md">
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Recaudado Real
          </p>
          <p className="text-2xl font-display font-black text-white">S/ {totalRecaudadoCaja.toFixed(2)}</p>
        </div>

      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200/80 p-4 md:p-5 rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">Filtros de Búsqueda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por N° Pedido, cliente, mesa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Estado Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ABIERTO">Abiertos</option>
            <option value="COBRADO">Cobrados</option>
            <option value="ENTREGADO">Entregados</option>
            <option value="CREDITO">A Crédito</option>
            <option value="CANCELADO">Cancelados</option>
          </select>

          {/* Metodo Pago Selector */}
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="TODOS">Todos los Métodos de Pago</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="YAPE">Yape / Plin</option>
            <option value="CREDITO">Crédito</option>
          </select>

          {/* Categoria Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="TODOS">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] overflow-hidden shadow-xs">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
            Detalle de Pedidos
            <span className="bg-brand-50 text-brand-700 text-[10px] px-2.5 py-0.5 rounded-full font-black">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase">
            Suma Mostrada: S/ {filteredOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No se encontraron pedidos con los filtros aplicados</p>
            <p className="text-[11px] text-slate-400">Intente cambiar el rango de fecha o los términos de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[9.5px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3.5 px-4 md:px-6">N° Pedido</th>
                  <th className="py-3.5 px-4">Hora</th>
                  <th className="py-3.5 px-4">Mesa / Cliente</th>
                  <th className="py-3.5 px-4">Platos / Ítems</th>
                  <th className="py-3.5 px-4">Método Pago</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 md:px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((order) => {
                  const itemsSummary = order.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 md:px-6 font-display font-black text-slate-900 whitespace-nowrap">
                        {order.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {order.hora || '12:00'}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-800 leading-tight">
                          {order.mesaId === '13' ? 'Para Llevar' : `Mesa ${order.mesaId}`}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                          {order.cliente || 'Cliente'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-600 text-[11px] font-medium truncate" title={itemsSummary}>
                          {itemsSummary}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl ${
                          order.metodoPago === 'EFECTIVO' ? 'bg-emerald-50 text-emerald-700' :
                          order.metodoPago === 'YAPE' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {order.metodoPago || 'EFECTIVO'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl flex items-center gap-1 w-fit ${
                          order.estado === 'COBRADO' ? 'bg-emerald-100 text-emerald-800' :
                          order.estado === 'ENTREGADO' ? 'bg-blue-100 text-blue-800' :
                          order.estado === 'CREDITO' ? 'bg-rose-100 text-rose-800' :
                          order.estado === 'CANCELADO' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.estado === 'COBRADO' && <CheckCircle2 className="w-3 h-3" />}
                          {order.estado === 'ABIERTO' && <Clock className="w-3 h-3" />}
                          {order.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 md:px-6 text-right font-display font-black text-slate-900 text-sm whitespace-nowrap">
                        S/ {order.total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
