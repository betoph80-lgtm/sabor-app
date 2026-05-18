/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext';
import { Clock, User, Trash2, Plus, Minus, AlertCircle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderModal } from './OrderModal.tsx';
import { OrderTimer } from './OrderTimer.tsx';

export const PedidosView: React.FC = () => {
  const { 
    orders, 
    products, 
    currentMenu, 
    mesas,
    deleteItemFromOrder, 
    updateItemQuantity, 
    addItemsToOrder, 
    updateOrderInfo,
    deleteOrder,
    resetStock,
    requestConfirmation,
    selectedDate,
    isTodaySelected,
    cashControls,
    currentUser
  } = useApp();
  const [view, setView] = React.useState<'ACTIVOS' | 'HISTORIAL'>('ACTIVOS');
  const [editingOrder, setEditingOrder] = React.useState<string | null>(null);

  const isCashClosed = cashControls.find(c => c.fecha === selectedDate)?.estado === 'CERRADA';
  const isMesero = currentUser?.role === 'MESERO';

  const filteredOrders = isMesero 
    ? orders.filter(o => o.usuarioId === currentUser?.id)
    : orders;

  const activeOrders = [...filteredOrders]
    .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  const paidOrders = [...filteredOrders]
    .filter(o => (o.estado === 'PAGADO' || o.estado === 'CREDITO') && o.fecha === selectedDate)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  const currentOrders = view === 'ACTIVOS' ? activeOrders : paidOrders;
  const orderToEdit = filteredOrders.find(o => o.id === editingOrder);

  return (
    <div className="p-2 md:p-10 space-y-4 md:space-y-8 max-w-7xl mx-auto">
      {isCashClosed && (
        <div className="bg-amber-50 border border-amber-200 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-3 md:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Edit2 className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-amber-900 uppercase tracking-tight text-[11px] md:text-sm">Caja Cerrada</h3>
            <p className="text-amber-700 text-[9px] md:text-[10px] font-medium leading-relaxed">No se pueden realizar modificaciones porque la caja está cerrada.</p>
          </div>
        </div>
      )}
      {editingOrder && orderToEdit && (
        <OrderModal
          onClose={() => setEditingOrder(null)}
          onAdd={(items, newClienteName) => {
            if (items.length > 0) {
              addItemsToOrder(editingOrder, items);
            }
            if (newClienteName !== orderToEdit.cliente) {
              updateOrderInfo(editingOrder, { cliente: newClienteName });
            }
            setEditingOrder(null);
          }}
          products={products}
          currentMenu={currentMenu.filter(m => m.fecha === selectedDate)}
          mesaId={orderToEdit.mesaId}
          mesaName={mesas.find(m => m.id === orderToEdit.mesaId)?.nombre || orderToEdit.mesaId}
          initialClienteName={orderToEdit.cliente}
          title="Editar Pedido"
        />
      )}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8 px-1 md:px-2">
        <div className="space-y-1 text-center lg:text-left">
          <h2 className="text-2xl md:text-4xl font-display font-bold text-slate-900 tracking-tight leading-none">
            {view === 'ACTIVOS' ? 'Servicio Activo' : 'Ventas de Hoy'}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 md:gap-4 mt-1">
            <div className="px-3 py-1 bg-slate-100 rounded-full">
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                {view === 'ACTIVOS' ? `${activeOrders.length} Mesas` : `${paidOrders.length} Cerradas`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-100/80 p-1 md:p-1.5 rounded-xl md:rounded-[24px] w-full lg:w-auto soft-shadow-sm border border-slate-200/50 backdrop-blur-sm self-center lg:self-auto">
          <button
            onClick={() => setView('ACTIVOS')}
            className={`flex-1 lg:px-10 py-3 md:py-5 rounded-lg md:rounded-[22px] text-[10px] md:text-[12px] font-bold uppercase tracking-widest transition-all duration-300 ${
              view === 'ACTIVOS' ? 'bg-white text-brand-600 soft-shadow scale-[1.02]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setView('HISTORIAL')}
            className={`flex-1 lg:px-10 py-3 md:py-5 rounded-lg md:rounded-[22px] text-[10px] md:text-[12px] font-bold uppercase tracking-widest transition-all duration-300 ${
              view === 'HISTORIAL' ? 'bg-white text-brand-600 soft-shadow scale-[1.02]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {currentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[450px] text-slate-300 gap-6 bg-white rounded-[48px] border border-slate-100 soft-shadow">
          <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center soft-shadow-sm border border-white">
            <AlertCircle className="w-12 h-12 opacity-20" />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-slate-400 uppercase tracking-[0.2em] text-sm">
              {view === 'ACTIVOS' ? 'No se registran pedidos activos' : 'El historial de hoy está vacío'}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-2 italic px-8">Inicie una nueva mesa desde la vista de salón para comenzar.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {currentOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] border border-slate-100 p-5 soft-shadow space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm border-2 border-white soft-shadow-sm shrink-0 ${
                      view === 'HISTORIAL' ? 'bg-slate-200 text-slate-500' : 'bg-brand-600 text-white'
                    }`}>
                      {order.mesaId === '13' ? 'PL' : (mesas.find(m => m.id === order.mesaId)?.nombre.replace(/mesa\s+/i, '') || order.mesaId)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[13px] leading-tight">
                        {order.mesaId === '13' ? 'Para Llevar' : (mesas.find(m => m.id === order.mesaId)?.nombre || `Mesa ${order.mesaId}`)}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">#{order.id.split('-').pop()} • {order.usuarioNombre || 'Desconocido'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-display font-bold ${view === 'HISTORIAL' ? 'text-emerald-500' : 'text-slate-900'}`}>
                      S/ {order.total.toFixed(2)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">{order.hora}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <User className="w-2.5 h-2.5 text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-600 truncate">
                      {order.cliente || 'Consumidor Final'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {order.items.map((item, idx) => {
                      const p = products.find(prod => prod.id === item.productoId);
                      const isServed = item.estado === 'SERVIDO' || view === 'HISTORIAL';
                      return (
                        <div 
                          key={`${order.id}-${item.id}-${idx}`}
                          className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${
                            isServed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-500 border-slate-100'
                          }`}
                        >
                          <span className="text-brand-500">{item.cantidad}x</span>
                          <span className="max-w-[60px] truncate">{p?.nombre}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isTodaySelected && (
                  <div className="flex gap-2 pt-0.5">
                    {view === 'ACTIVOS' && (
                      <button
                        onClick={() => {
                          if (isCashClosed) return;
                          setEditingOrder(order.id);
                        }}
                        disabled={isCashClosed}
                        className={`flex-1 py-2.5 bg-brand-50 text-brand-600 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                          isCashClosed ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isCashClosed) return;
                        requestConfirmation(
                          'Anular Registro',
                          `¿Eliminar pedido ${order.id.split('-').pop()}?`,
                          () => deleteOrder(order.id)
                        );
                      }}
                      disabled={isCashClosed}
                      className={`flex-1 py-2.5 ${view === 'HISTORIAL' ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-500'} rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                        isCashClosed ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Trash2 className="w-3 h-3" /> Borrar
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-[40px] border border-slate-100 overflow-hidden soft-shadow">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">ID & Ubicación</th>
                    <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Cliente & Tiempo</th>
                    <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Pedido</th>
                    <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Total</th>
                    <th className="px-8 py-6 text-center text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/30 transition-all duration-300 group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center font-display font-bold text-lg border-4 border-white soft-shadow-sm transition-transform group-hover:scale-105 ${
                            view === 'HISTORIAL' ? 'bg-slate-200 text-slate-500' : 'bg-brand-600 text-white'
                          }`}>
                            {order.mesaId === '13' ? 'PL' : (mesas.find(m => m.id === order.mesaId)?.nombre.replace(/mesa\s+/i, '') || order.mesaId)}
                          </div>
                          <div>
                            <p className="font-display font-bold text-slate-900 text-base leading-tight group-hover:text-brand-700 transition-colors">
                              {order.mesaId === '13' ? 'Para Llevar' : (mesas.find(m => m.id === order.mesaId)?.nombre || `Mesa N° ${order.mesaId}`)}
                            </p>
                            <span className="text-[10px] text-brand-600 font-bold uppercase tracking-widest mt-1.5 inline-block bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
                              PEDIDO-{order.id.split('-').pop()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-700 tracking-tight truncate max-w-[160px]">
                              {order.cliente || 'Consumidor Final'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-400 tabular-nums leading-none">
                                Registrado a las {order.hora}
                              </span>
                              <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest mt-1">
                                Por: {order.usuarioNombre || 'Desconocido'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2.5 max-w-[320px]">
                          {order.items.map((item, idx) => {
                            const p = products.find(prod => prod.id === item.productoId);
                            const isServed = item.estado === 'SERVIDO' || view === 'HISTORIAL';
                            return (
                              <div 
                                key={`${order.id}-${item.id}-${idx}`}
                                className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-[12px] flex items-center gap-2 border transition-all duration-300 ${
                                  isServed 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 soft-shadow-sm/50' 
                                    : 'bg-white text-slate-500 border-slate-100 soft-shadow-sm/50'
                                }`}
                              >
                                <span className="font-display font-bold tabular-nums text-brand-600">{item.cantidad}x</span>
                                <span className="truncate max-w-[100px] tracking-tight">{p?.nombre}</span>
                                {isServed ? (
                                  <div className="w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px] soft-shadow-sm">✓</div>
                                ) : (
                                  item.timestampPedido && (
                                    <OrderTimer 
                                      timestamp={item.timestampPedido} 
                                      hideIcon
                                      className="flex items-center gap-1 bg-brand-100/50 px-1.5 py-0.5 rounded-lg text-[9px] font-display font-bold text-brand-600 ring-1 ring-brand-200/50"
                                    />
                                  )
                                )}
                              </div>
                            );
                          })}
                          {order.items.length === 0 && <span className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] italic">Sin artículos registrados</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                            {view === 'HISTORIAL' ? 'Importe Total' : 'Estado Cuenta'}
                          </span>
                          <p className={`text-2xl font-display font-bold tracking-tighter ${view === 'HISTORIAL' ? 'text-emerald-500' : 'text-slate-900'}`}>
                            S/ {order.total.toFixed(2)}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {isTodaySelected ? (
                          <div className="flex items-center justify-center gap-3 lg:opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                            {view === 'ACTIVOS' && (
                              <button
                                onClick={() => setEditingOrder(order.id)}
                                className="w-12 h-12 flex items-center justify-center bg-brand-50 hover:bg-brand-600 text-brand-600 hover:text-white rounded-[18px] transition-all soft-shadow-sm active:scale-90"
                                title="Editar Pedido"
                              >
                                <Edit2 className="w-5 h-5 md:w-6 md:h-6" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                requestConfirmation(
                                  'Anular Registro',
                                  `¿Seguro que desea eliminar el pedido ${order.id.split('-').pop()}? Este proceso descontará ventas del total del día.`,
                                  () => deleteOrder(order.id)
                                );
                              }}
                              className={`w-12 h-12 flex items-center justify-center ${view === 'HISTORIAL' ? 'bg-slate-100 hover:bg-slate-600 text-slate-400 hover:text-white' : 'bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white'} rounded-[18px] transition-all soft-shadow-sm active:scale-90`}
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg inline-block">
                            <span className="text-[9px] font-bold text-slate-400 uppercase italic tracking-widest">Solo Lectura</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
