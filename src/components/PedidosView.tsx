/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext';
import { Clock, User, Trash2, Plus, Minus, AlertCircle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderModal } from './OrderModal.tsx';

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
    requestConfirmation
  } = useApp();
  const [view, setView] = React.useState<'ACTIVOS' | 'HISTORIAL'>('ACTIVOS');
  const [editingOrder, setEditingOrder] = React.useState<string | null>(null);

  const activeOrders = [...orders]
    .filter(o => o.estado === 'ABIERTO')
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  const paidOrders = [...orders]
    .filter(o => o.estado === 'PAGADO')
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  const currentOrders = view === 'ACTIVOS' ? activeOrders : paidOrders;
  const orderToEdit = orders.find(o => o.id === editingOrder);

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-7xl mx-auto">
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
          currentMenu={currentMenu}
          mesaId={orderToEdit.mesaId}
          initialClienteName={orderToEdit.cliente}
          title="Agregar al Pedido"
        />
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1.5 text-center md:text-left">
          <h2 className="text-2xl md:text-xl font-bold text-slate-800 tracking-tight">
            {view === 'ACTIVOS' ? 'Pedidos en Curso' : 'Historial de Hoy'}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {view === 'ACTIVOS' ? `${activeOrders.length} mesas siendo atendidas` : `${paidOrders.length} cuentas cerradas hoy`}
            </p>
            {view === 'HISTORIAL' && paidOrders.length > 0 && (
              <button 
                onClick={() => {
                  requestConfirmation(
                    'Reiniciar Jornada',
                    '¿ELIMINAR TODO EL HISTORIAL Y REINICIAR JORNADA? Se perderán todos los datos de hoy.',
                    () => resetStock()
                  );
                }}
                className="text-[9px] font-black text-rose-500 uppercase tracking-tighter hover:underline underline-offset-4"
              >
                Limpiar Todo
              </button>
            )}
          </div>
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-[20px] w-full md:w-auto shadow-inner">
          <button
            onClick={() => setView('ACTIVOS')}
            className={`flex-1 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'ACTIVOS' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setView('HISTORIAL')}
            className={`flex-1 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'HISTORIAL' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {currentOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-300 gap-4">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10" />
          </div>
          <p className="font-bold uppercase tracking-widest text-xs">
            {view === 'ACTIVOS' ? 'No hay pedidos activos' : 'No hay historial de pagos'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm shadow-slate-100">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white ${
                          view === 'HISTORIAL' ? 'bg-slate-500' : 'bg-orange-600 shadow-lg shadow-orange-100'
                        }`}>
                          {order.mesaId === '13' ? 'PL' : order.mesaId}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm tracking-tighter uppercase leading-none">
                            {order.mesaId === '13' ? 'Para Llevar' : `Mesa ${order.mesaId}`}
                          </p>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            {order.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-tight truncate max-w-[150px]">
                          {order.cliente}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-xs font-bold text-slate-400 tabular-nums">
                          {order.hora}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                        {order.items.map((item, idx) => {
                          const p = products.find(prod => prod.id === item.productoId);
                          const isServed = item.estado === 'SERVIDO' || view === 'HISTORIAL';
                          return (
                            <div 
                              key={`${order.id}-${item.id}-${idx}`}
                              className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg flex items-center gap-1.5 border ${
                                isServed 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}
                            >
                              <span className="font-black tabular-nums">{item.cantidad}x</span>
                              <span className="truncate max-w-[80px]">{p?.nombre}</span>
                              {isServed && <span className="opacity-60">✓</span>}
                            </div>
                          );
                        })}
                        {order.items.length === 0 && <span className="text-[10px] text-slate-300 font-bold uppercase">Sin items</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">
                          {view === 'HISTORIAL' ? 'Liquidado' : 'Subtotal'}
                        </span>
                        <p className={`text-lg font-black tracking-tighter ${view === 'HISTORIAL' ? 'text-emerald-600' : 'text-slate-800'}`}>
                          S/ {order.total.toFixed(2)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {view === 'ACTIVOS' && (
                          <button
                            onClick={() => setEditingOrder(order.id)}
                            className="p-2.5 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all"
                            title="Editar Pedido"
                          >
                            <Edit2 className="w-4 h-4 text-orange-600" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            requestConfirmation(
                              'Eliminar Pedido',
                              `¿Deseas eliminar el pedido ${order.id}${order.mesaId === '13' ? ' para llevar' : ` de la mesa ${order.mesaId}`}?`,
                              () => deleteOrder(order.id)
                            );
                          }}
                          className={`p-2.5 ${view === 'HISTORIAL' ? 'bg-slate-100 hover:bg-slate-200 text-slate-400' : 'bg-rose-50 hover:bg-rose-100 text-rose-500'} rounded-xl transition-all`}
                          title="Eliminar Pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
