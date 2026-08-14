/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../AppContext';
import { Clock, User, Trash2, Plus, Minus, AlertCircle, Edit2, ChefHat, Check, Utensils, CheckCircle2 } from 'lucide-react';
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
    updateWholeOrder,
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
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="p-2 md:p-5 md:py-6 space-y-3 md:space-y-5 max-w-7xl mx-auto">
      {isCashClosed && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-amber-900 uppercase tracking-tight text-[11px] md:text-xs">Caja Cerrada</h3>
            <p className="text-amber-700 text-[9px] md:text-[10px] font-medium leading-relaxed">No se pueden realizar modificaciones porque la caja está cerrada.</p>
          </div>
        </div>
      )}
      {editingOrder && orderToEdit && (
        <OrderModal
          onClose={() => setEditingOrder(null)}
          onAdd={() => {}}
          onSaveEdit={async (qtys, notes, newClienteName, newMesaId) => {
            await updateWholeOrder(editingOrder, newMesaId, newClienteName, qtys, notes);
            setEditingOrder(null);
          }}
          products={products}
          currentMenu={currentMenu.filter(m => m.fecha === selectedDate)}
          mesaId={orderToEdit.mesaId}
          mesaName={mesas.find(m => m.id === orderToEdit.mesaId)?.nombre || orderToEdit.mesaId}
          initialClienteName={orderToEdit.cliente}
          mesas={mesas}
          initialItems={orderToEdit.items}
          title="Editar Pedido"
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 bg-white/50 p-4 rounded-3xl border border-slate-100 shadow-sm backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <h2 className="text-lg md:text-2xl font-display font-black text-slate-900 tracking-tight leading-none">
            {view === 'ACTIVOS' ? 'Servicio Activo' : 'Cierre de Caja'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-brand-100">
              {view === 'ACTIVOS' ? `${activeOrders.length} Mesas` : `${paidOrders.length} Cerradas`}
            </span>
          </div>
        </div>

        <div className="flex bg-slate-100/90 p-1.5 rounded-full w-full sm:w-auto border border-slate-200/40 backdrop-blur-md">
          <button
            onClick={() => setView('ACTIVOS')}
            className={`flex-1 sm:flex-none sm:px-8 py-2 md:py-2.5 rounded-full text-[9px] md:text-[11px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
              view === 'ACTIVOS' ? 'bg-white text-brand-600 shadow-[0_2px_10px_rgba(159,103,255,0.08)]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setView('HISTORIAL')}
            className={`flex-1 sm:flex-none sm:px-8 py-2 md:py-2.5 rounded-full text-[9px] md:text-[11px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
              view === 'HISTORIAL' ? 'bg-white text-brand-600 shadow-[0_2px_10px_rgba(159,103,255,0.08)]' : 'text-slate-400 hover:text-slate-600'
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
            {currentOrders.map((order) => {
              const totalSoupItems = order.items.filter(i => {
                const p = products.find(prod => prod.id === i.productoId);
                return p?.tipo === 'SOPA';
              }) || [];

              const totalSecondItems = order.items.filter(i => {
                const p = products.find(prod => prod.id === i.productoId);
                return p?.tipo === 'SEGUNDO';
              }) || [];

              const hasSoup = totalSoupItems.length > 0;
              const hasNoSecondsOrderedYet = totalSecondItems.length === 0;
              const isOnlySoupAndNoSeconds = hasSoup && hasNoSecondsOrderedYet;

              const servedSoup = totalSoupItems.find(i => i.estado === 'SERVIDO');
              const isSoupServed = !!servedSoup;

              let isFaltaSegundoAlert = false;
              let minutesSinceSoupListo = 0;
              let secondsSinceSoupListo = 0;

              if (order.estado === 'ABIERTO' && isOnlySoupAndNoSeconds && isSoupServed && servedSoup) {
                const baseTime = servedSoup.timestampServido || servedSoup.timestampPedido || order.timestampPedido || order.timestamp || Date.now();
                const elapsedMsSinceSoupListo = now - baseTime;
                minutesSinceSoupListo = Math.floor(elapsedMsSinceSoupListo / 60000);
                secondsSinceSoupListo = Math.floor((elapsedMsSinceSoupListo % 60000) / 1000);

                // Warning is red after 10 minutes (600,000 ms) of marked "Listo"
                isFaltaSegundoAlert = elapsedMsSinceSoupListo >= 600000;
              }

              const totalItemsQty = order.items.reduce((acc, i) => acc + i.cantidad, 0);
              const servedItems = order.items.filter(i => i.estado === 'SERVIDO' || view === 'HISTORIAL');
              const servedItemsQty = servedItems.reduce((acc, i) => acc + i.cantidad, 0);
              const pendingItems = order.items.filter(i => i.estado !== 'SERVIDO' && view !== 'HISTORIAL');
              const pendingItemsQty = pendingItems.reduce((acc, i) => acc + i.cantidad, 0);
              const isAllServed = order.items.length > 0 && order.items.every(i => i.estado === 'SERVIDO' || view === 'HISTORIAL');
              const isPartiallyServed = servedItemsQty > 0 && pendingItemsQty > 0;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-[20px] border p-3 soft-shadow space-y-2.5 transition-all duration-300 ${
                    isFaltaSegundoAlert 
                      ? 'border-rose-500 ring-2 ring-rose-200 shadow-[0_4px_16px_rgba(239,68,68,0.1)]' 
                      : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-xs border-2 border-white soft-shadow-sm shrink-0 ${
                        view === 'HISTORIAL' ? 'bg-slate-200 text-slate-500' : 'bg-brand-600 text-white'
                      }`}>
                        {order.mesaId === '13' ? 'PL' : (mesas.find(m => m.id === order.mesaId)?.nombre.replace(/mesa\s+/i, '') || order.mesaId)}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs leading-none">
                          {order.mesaId === '13' ? 'Para Llevar' : (mesas.find(m => m.id === order.mesaId)?.nombre || `Mesa ${order.mesaId}`)}
                        </p>
                        <p className="text-[7.5px] text-slate-400 font-extrabold uppercase mt-0.5 leading-none">#{order.id.split('-').pop()} • {order.usuarioNombre?.split(' ')[0] || 'Desconocido'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-display font-black leading-none ${view === 'HISTORIAL' ? 'text-emerald-500' : 'text-slate-900'}`}>
                        S/ {order.total.toFixed(2)}
                      </p>
                      <p className="text-[7.5px] text-slate-400 font-extrabold uppercase mt-0.5 leading-none">{order.hora}</p>
                    </div>
                  </div>

                  {/* Estado de Cocina Mobile Banner */}
                  <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ChefHat className="w-2.5 h-2.5 text-brand-600" /> Estado de Cocina
                      </span>
                      {isAllServed || view === 'HISTORIAL' ? (
                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Listo / Servido
                        </span>
                      ) : isFaltaSegundoAlert ? (
                        <span className="text-[8px] font-black text-white bg-rose-500 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-2.5 h-2.5" /> ¡Falta Segundo!
                        </span>
                      ) : isOnlySoupAndNoSeconds && isSoupServed ? (
                        <span className="text-[8px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Esperando Segundo
                        </span>
                      ) : isPartiallyServed ? (
                        <span className="text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ChefHat className="w-2.5 h-2.5" /> En Preparación ({servedItemsQty}/{totalItemsQty})
                        </span>
                      ) : (
                        <span className="text-[8px] font-black text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Utensils className="w-2.5 h-2.5" /> En Cocina ({pendingItemsQty})
                        </span>
                      )}
                    </div>
                    {isFaltaSegundoAlert && (
                      <p className="text-[7.5px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-center">
                        Sopa servida hace: {minutesSinceSoupListo}m {secondsSinceSoupListo}s — Sin segundo pedido
                      </p>
                    )}
                    {!isFaltaSegundoAlert && isOnlySoupAndNoSeconds && isSoupServed && (
                      <p className="text-[7.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 text-center">
                        Sopa servida hace: {minutesSinceSoupListo}m {secondsSinceSoupListo}s
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50/50 rounded-lg p-1.5 border border-slate-100/50">
                    <div className="flex items-center gap-1 mb-1 leading-none">
                      <User className="w-2 h-2 text-slate-400" />
                      <span className="text-[8px] font-extrabold text-slate-500 truncate uppercase tracking-tight">
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
                            className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded flex items-center gap-0.5 border leading-none ${
                              isServed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-500 border-slate-100'
                            }`}
                          >
                            <span className="text-brand-500 font-black">{item.cantidad}x</span>
                            <span className="max-w-[55px] truncate">{p?.nombre}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isTodaySelected && (
                    <div className="flex gap-1.5 pt-0.5">
                      {view === 'ACTIVOS' && (
                        <button
                          onClick={() => {
                            if (isCashClosed) return;
                            setEditingOrder(order.id);
                          }}
                          disabled={isCashClosed}
                          className={`flex-1 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 ${
                            isCashClosed ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Edit2 className="w-2.5 h-2.5" /> Editar
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
                        className={`flex-1 py-1.5 ${view === 'HISTORIAL' ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-500'} rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 ${
                          isCashClosed ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Borrar
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-[24px] border border-slate-100 overflow-hidden soft-shadow">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ubicación</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Cliente & Registro</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pedido</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Estado Cocina</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentOrders.map((order) => {
                    const totalSoupItems = order.items.filter(i => {
                      const p = products.find(prod => prod.id === i.productoId);
                      return p?.tipo === 'SOPA';
                    }) || [];

                    const totalSecondItems = order.items.filter(i => {
                      const p = products.find(prod => prod.id === i.productoId);
                      return p?.tipo === 'SEGUNDO';
                    }) || [];

                    const hasSoup = totalSoupItems.length > 0;
                    const hasNoSecondsOrderedYet = totalSecondItems.length === 0;
                    const isOnlySoupAndNoSeconds = hasSoup && hasNoSecondsOrderedYet;

                    const servedSoup = totalSoupItems.find(i => i.estado === 'SERVIDO');
                    const isSoupServed = !!servedSoup;

                    let isFaltaSegundoAlert = false;
                    let minutesSinceSoupListo = 0;
                    let secondsSinceSoupListo = 0;

                    if (order.estado === 'ABIERTO' && isOnlySoupAndNoSeconds && isSoupServed && servedSoup) {
                      const baseTime = servedSoup.timestampServido || servedSoup.timestampPedido || order.timestampPedido || order.timestamp || Date.now();
                      const elapsedMsSinceSoupListo = now - baseTime;
                      minutesSinceSoupListo = Math.floor(elapsedMsSinceSoupListo / 60000);
                      secondsSinceSoupListo = Math.floor((elapsedMsSinceSoupListo % 60000) / 1000);

                      // Warning is red after 10 minutes (600,000 ms) of marked "Listo"
                      isFaltaSegundoAlert = elapsedMsSinceSoupListo >= 600000;
                    }

                    const totalItemsQty = order.items.reduce((acc, i) => acc + i.cantidad, 0);
                    const servedItems = order.items.filter(i => i.estado === 'SERVIDO' || view === 'HISTORIAL');
                    const servedItemsQty = servedItems.reduce((acc, i) => acc + i.cantidad, 0);
                    const pendingItems = order.items.filter(i => i.estado !== 'SERVIDO' && view !== 'HISTORIAL');
                    const pendingItemsQty = pendingItems.reduce((acc, i) => acc + i.cantidad, 0);
                    const isAllServed = order.items.length > 0 && order.items.every(i => i.estado === 'SERVIDO' || view === 'HISTORIAL');
                    const isPartiallyServed = servedItemsQty > 0 && pendingItemsQty > 0;

                    return (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-slate-50/50 transition-all duration-200 group ${
                          isFaltaSegundoAlert 
                            ? 'bg-rose-50/20 hover:bg-rose-100/20' 
                            : ''
                        }`}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-4">
                            {/* Número de Pedido primero */}
                            <span className="text-[12px] text-brand-600 bg-brand-50/60 px-3 py-2 rounded-xl border border-brand-100 shadow-[0_2px_12px_rgba(139,92,246,0.03)] font-display font-black uppercase tracking-wider leading-none shrink-0 select-none">
                              PEDIDO - {order.id.split('-').pop()}
                            </span>

                            {/* Ubicación/Mesa con etiqueta arriba y número debajo */}
                            <div className="flex flex-col items-center shrink-0">
                              <span className="text-[10px] font-black text-slate-800 leading-none mb-1 uppercase tracking-tight select-none">
                                {order.mesaId === '13' ? 'Llevar' : 'Mesa'}
                              </span>
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs leading-none shrink-0 border border-white/60 shadow-sm transition-transform group-hover:scale-105 select-none ${
                                view === 'HISTORIAL' ? 'bg-slate-200 text-slate-500' : 'bg-brand-600 text-white'
                              }`}>
                                {order.mesaId === '13' ? 'PL' : (mesas.find(m => m.id === order.mesaId)?.nombre.replace(/mesa\s+/i, '') || order.mesaId)}
                              </div>
                            </div>
                          </div>
                        </td>
                      <td className="px-4 py-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-700 leading-none truncate max-w-[130px]">
                              {order.cliente || 'CONSU. FINAL'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-slate-400 leading-none">
                              Reg. {order.hora}
                            </span>
                            <span className="text-[7.5px] font-extrabold text-brand-500 uppercase tracking-wider leading-none">
                              Por: {order.usuarioNombre?.split(' ')[0] || 'Desconocido'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[320px]">
                          {order.items.map((item, idx) => {
                            const p = products.find(prod => prod.id === item.productoId);
                            const isServed = item.estado === 'SERVIDO' || view === 'HISTORIAL';
                            return (
                              <div 
                                key={`${order.id}-${item.id}-${idx}`}
                                className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-md flex flex-col gap-0.5 border transition-all duration-200 leading-none ${
                                  isServed 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60' 
                                    : 'bg-white text-slate-600 border-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="font-sans font-black text-brand-600">{item.cantidad}x</span>
                                  <span className="truncate max-w-[100px] tracking-tight">{p?.nombre}</span>
                                  {isServed ? (
                                    <div className="w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[7px] font-black shrink-0">✓</div>
                                  ) : (
                                    item.timestampPedido && (
                                      <OrderTimer 
                                        timestamp={item.timestampPedido} 
                                        hideIcon
                                        className="flex items-center gap-0.5 bg-brand-50 px-1 py-0.2 rounded text-[8px] font-sans font-black text-brand-500 border border-brand-100/30 shrink-0 leading-none"
                                      />
                                    )
                                  )}
                                </div>
                                {item.notas && (
                                  <div className="text-[7.5px] text-amber-600 font-extrabold truncate max-w-[120px] bg-amber-50 px-1 py-0.2 rounded border border-amber-100 uppercase">
                                    {item.notas}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {order.items.length === 0 && <span className="text-[9px] text-slate-300 font-bold uppercase italic tracking-widest leading-none">Sin artículos</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {order.items.length === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-extrabold bg-slate-100 text-slate-400 border border-slate-200 uppercase tracking-wider">
                            Sin Platos
                          </span>
                        ) : isFaltaSegundoAlert ? (
                          <div className="flex flex-col gap-1 min-w-[145px]">
                            <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white border border-rose-600 shadow-sm shadow-rose-200 animate-pulse">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              ¡Falta Segundo!
                            </span>
                            <div className="flex items-center justify-between text-[8px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                              <span>Sopa hace:</span>
                              <span className="font-mono font-black">{minutesSinceSoupListo}m {secondsSinceSoupListo}s</span>
                            </div>
                          </div>
                        ) : isOnlySoupAndNoSeconds && isSoupServed ? (
                          <div className="flex flex-col gap-1 min-w-[145px]">
                            <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/80">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              Sopa Lista (Espera 2do)
                            </span>
                            <div className="flex items-center justify-between text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                              <span>Esperando:</span>
                              <span className="font-mono font-black">{minutesSinceSoupListo}m {secondsSinceSoupListo}s</span>
                            </div>
                          </div>
                        ) : isAllServed || view === 'HISTORIAL' ? (
                          <div className="flex flex-col gap-1 min-w-[135px]">
                            <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Listo / Servido
                            </span>
                            <div className="flex items-center justify-between text-[8px] font-bold text-emerald-600 px-1">
                              <span>{totalItemsQty} de {totalItemsQty} listos</span>
                              <span className="text-[7.5px] font-black bg-emerald-100/60 text-emerald-700 px-1 py-0.2 rounded">100%</span>
                            </div>
                          </div>
                        ) : isPartiallyServed ? (
                          <div className="flex flex-col gap-1 min-w-[145px]">
                            <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80">
                              <ChefHat className="w-3 h-3 text-amber-600 shrink-0" />
                              En Preparación ({servedItemsQty}/{totalItemsQty})
                            </span>
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 px-0.5">
                                <span className="text-amber-700">{pendingItemsQty} pendiente{pendingItemsQty > 1 ? 's' : ''}</span>
                                <span className="font-mono font-bold text-slate-400">{Math.round((servedItemsQty / totalItemsQty) * 100)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${Math.round((servedItemsQty / totalItemsQty) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 min-w-[145px]">
                            <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/80">
                              <Utensils className="w-3 h-3 text-brand-600 shrink-0" />
                              En Cocina (Pendiente)
                            </span>
                            <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                              <span>{pendingItemsQty} por preparar</span>
                              {order.timestamp && (
                                <OrderTimer timestamp={order.timestamp} hideIcon className="text-brand-600 font-mono font-bold text-[8px]" />
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col justify-center">
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                            CUENTA
                          </span>
                          <p className={`text-sm md:text-[15px] font-display font-black leading-none tracking-tight ${view === 'HISTORIAL' ? 'text-emerald-500' : 'text-slate-800'}`}>
                            S/ {order.total.toFixed(2)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isTodaySelected ? (
                          <div className="flex items-center justify-center gap-2">
                            {view === 'ACTIVOS' && (
                              <button
                                onClick={() => setEditingOrder(order.id)}
                                className="w-8 h-8 flex items-center justify-center bg-brand-50 hover:bg-brand-600 text-brand-600 hover:text-white rounded-lg transition-all active:scale-95"
                                title="Editar Pedido"
                              >
                                <Edit2 className="w-4 h-4" />
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
                              className={`w-8 h-8 flex items-center justify-center ${view === 'HISTORIAL' ? 'bg-slate-100 hover:bg-slate-600 text-slate-400 hover:text-white' : 'bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white'} rounded-lg transition-all active:scale-95`}
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded inline-block">
                            <span className="text-[8px] font-bold text-slate-400 uppercase italic tracking-wider leading-none">Lectura</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
