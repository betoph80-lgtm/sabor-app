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
    deleteItemFromOrder, 
    updateItemQuantity, 
    addItemsToOrder, 
    updateOrderInfo,
    deleteOrder,
    resetStock,
    requestConfirmation,
    selectedDate,
    isTodaySelected
  } = useApp();
  const [view, setView] = React.useState<'ACTIVOS' | 'HISTORIAL'>('ACTIVOS');
  const [editingOrder, setEditingOrder] = React.useState<string | null>(null);

  const activeOrders = [...orders]
    .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  const paidOrders = [...orders]
    .filter(o => (o.estado === 'PAGADO' || o.estado === 'CREDITO') && o.fecha === selectedDate)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  const currentOrders = view === 'ACTIVOS' ? activeOrders : paidOrders;
  const orderToEdit = orders.find(o => o.id === editingOrder);

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto">
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
          initialClienteName={orderToEdit.cliente}
          title="Editar Pedido"
        />
      )}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-2">
        <div className="space-y-2 text-center lg:text-left">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight leading-none">
            {view === 'ACTIVOS' ? 'Pedidos en Curso' : 'Facturación de Hoy'}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-2">
            <div className="px-4 py-1.5 bg-slate-100 rounded-full">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                {view === 'ACTIVOS' ? `${activeOrders.length} Mesas Activas` : `${paidOrders.length} Ventas Finalizadas`}
              </p>
            </div>
            {view === 'HISTORIAL' && paidOrders.length > 0 && isTodaySelected && (
              <button 
                onClick={() => {
                  requestConfirmation(
                    'Eliminar Todo el Historial',
                    '¿Desea borrar permanentemente todos los pedidos y facturas de hoy? Esta acción no se puede deshacer.',
                    () => resetStock()
                  );
                }}
                className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center gap-2 group"
              >
                <Trash2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                Desechar históricos
              </button>
            )}
          </div>
        </div>

        <div className="flex bg-slate-100/80 p-1.5 rounded-[24px] w-full lg:w-auto soft-shadow-sm border border-slate-200/50 backdrop-blur-sm self-center lg:self-auto">
          <button
            onClick={() => setView('ACTIVOS')}
            className={`flex-1 lg:px-10 py-5 rounded-[22px] text-[12px] font-bold uppercase tracking-widest transition-all duration-300 ${
              view === 'ACTIVOS' ? 'bg-white text-brand-600 soft-shadow scale-[1.02]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Servicio Activo
          </button>
          <button
            onClick={() => setView('HISTORIAL')}
            className={`flex-1 lg:px-10 py-5 rounded-[22px] text-[12px] font-bold uppercase tracking-widest transition-all duration-300 ${
              view === 'HISTORIAL' ? 'bg-white text-brand-600 soft-shadow scale-[1.02]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Ventas Cerradas
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
        <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden soft-shadow">
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
                          {order.mesaId === '13' ? 'PL' : order.mesaId}
                        </div>
                        <div>
                          <p className="font-display font-bold text-slate-900 text-base leading-tight group-hover:text-brand-700 transition-colors">
                            {order.mesaId === '13' ? 'Para Llevar' : `Mesa N° ${order.mesaId}`}
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
                          <span className="text-xs font-bold text-slate-400 tabular-nums">
                            Registrado a las {order.hora}
                          </span>
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
      )}
    </div>
  );
};
