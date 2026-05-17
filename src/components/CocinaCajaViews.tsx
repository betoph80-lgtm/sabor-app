/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Check, Clock, Utensils, AlertCircle, Trash2, Search, X, Plus, Timer, User, Download, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderTimer } from './OrderTimer.tsx';
import * as XLSX from 'xlsx';

export const CocinaView: React.FC = () => {
  const { orders, products, updateItemStatus, currentMenu, selectedDate, isTodaySelected } = useApp();

  const itemsToPrepare = orders
    .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
    .flatMap(order => {
      const seconds = order.items.filter(i => {
        const p = products.find(prod => prod.id === i.productoId);
        return p?.tipo === 'SEGUNDO';
      });
      const hasPendingSeconds = seconds.some(i => i.estado !== 'SERVIDO');
      const hasNoSeconds = seconds.length === 0;

      return order.items.map(item => ({ 
        ...item, 
        orderId: order.id, 
        mesaId: order.mesaId,
        timestamp: order.timestamp,
        hasPendingSeconds,
        hasNoSeconds
      }));
    })
    .filter(item => {
      const product = products.find(p => p.id === item.productoId);
      const isSoup = product?.tipo === 'SOPA';

      if (item.estado !== 'SERVIDO') return true;
      
      // Keep served soup if there are pending seconds OR no seconds have been ordered yet
      return isSoup && (item.hasPendingSeconds || item.hasNoSeconds);
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Filter main dishes from current menu to show stock
  const menuStock = currentMenu
    .filter(m => m.fecha === selectedDate)
    .map(item => {
      const product = products.find(p => p.id === item.productoId);
      return { 
        id: item.id,
        nombre: product?.nombre || 'Desconocido',
        tipo: product?.tipo,
        stockActual: item.stockActual,
        stockInicial: item.stockInicial
      };
    })
    .filter(item => item.tipo === 'SEGUNDO');

  if (itemsToPrepare.length === 0 && menuStock.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-300 gap-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
           <Utensils className="w-10 h-10 opacity-20" />
        </div>
        <p className="font-bold uppercase tracking-widest text-xs">Cocina despejada</p>
      </div>
    );
  }

  const summary = itemsToPrepare
    .filter(item => item.estado !== 'SERVIDO')
    .reduce((acc, item) => {
      const name = products.find(p => p.id === item.productoId)?.nombre || 'Desconocido';
      acc[name] = (acc[name] || 0) + item.cantidad;
      return acc;
    }, {} as Record<string, number>);

  // Group by Mesa but keep order ID in mind
  const itemsByMesa = itemsToPrepare.reduce((acc, item) => {
    const key = `${item.mesaId}-${item.orderId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as {[key: string]: any[]});

  // Sort groups by timestamp ascending
  const sortedMesaKeys = Object.keys(itemsByMesa).sort((a, b) => {
    const timestampA = itemsByMesa[a][0].timestamp || 0;
    const timestampB = itemsByMesa[b][0].timestamp || 0;
    return timestampA - timestampB;
  });

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Metrics Bar Compact */}
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 soft-shadow flex flex-col md:flex-row md:items-center gap-4">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <div className="w-1 h-1 rounded-full bg-brand-500" />
             Stock Crítico
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {menuStock.map(item => (
              <div key={item.id} className="flex items-baseline gap-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[80px]">{item.nombre}</span>
                <span className={`text-lg font-display font-bold ${item.stockActual < 5 ? 'text-rose-500' : 'text-slate-800'}`}>
                  {item.stockActual}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg flex flex-col md:flex-row md:items-center gap-4 min-w-fit">
          <div className="text-[9px] font-black text-brand-400 uppercase tracking-widest border-b md:border-b-0 md:border-r border-white/10 pb-2 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <Clock className="w-3 h-3" /> Pendientes hoy
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary).map(([name, qty]) => (
              <div key={name} className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-lg font-display font-bold text-brand-400 leading-none">{qty}</span>
                <span className="text-[9px] font-bold uppercase tracking-tight text-slate-300 leading-none">{name}</span>
              </div>
            ))}
            {Object.entries(summary).length === 0 && (
              <p className="text-[9px] text-slate-500 italic">No hay platos pendientes</p>
            )}
          </div>
        </div>
      </div>

      {/* Preparation Count Floating Style */}
      <div className="flex justify-end pr-2">
        <span className="bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest soft-shadow">
          {itemsToPrepare.length} Items en Proceso
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sortedMesaKeys.map((key) => {
          const items = itemsByMesa[key];
          const mesaId = items[0].mesaId;
          const orderTimestamp = items[0].timestamp || Date.now();
          const elapsedMinutes = Math.floor((Date.now() - orderTimestamp) / 60000);
          
          let headerColorClass = 'bg-brand-600';
          let textColorClass = 'text-brand-100';
          
          if (elapsedMinutes >= 20) {
            headerColorClass = 'bg-rose-600';
            textColorClass = 'text-rose-50';
          } else if (elapsedMinutes >= 10) {
            headerColorClass = 'bg-amber-600';
            textColorClass = 'text-amber-50';
          }

          return (
            <div 
              key={key} 
              className={`bg-white rounded-[40px] border shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
                elapsedMinutes >= 20 ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-200'
              }`}
            >
            <div className={`${headerColorClass} px-5 py-4 flex justify-between items-center text-white relative transition-colors duration-500`}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-8 translate-x-8" />
               <div className="flex flex-col relative z-10">
                  <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${textColorClass} leading-none mb-1.5`}>
                    #{items[0].orderId.split('-').pop()} • Ticket
                  </span>
                  <h3 className="text-xl font-display font-bold leading-none">{mesaId === '13' ? 'PL (CLIENTE)' : `MESA ${mesaId}`}</h3>
               </div>
               <div className="flex flex-col items-end gap-2 relative z-10">
                  <OrderTimer timestamp={orderTimestamp} className="text-lg" />
                  <p className="text-[8px] font-mono font-bold uppercase tracking-widest tabular-nums px-2 py-0.5 bg-black/20 rounded-lg backdrop-blur-sm border border-white/5">A las {items[0].horaPedido}</p>
               </div>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-auto">
              {/* Items already served for this mesa in this order */}
              {(() => {
                const orderId = items[0].orderId;
                const servedItems = orders.find(o => o.id === orderId && o.fecha === selectedDate)?.items.filter(i => i.estado === 'SERVIDO') || [];
                if (servedItems.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-50">
                    {servedItems.map(si => {
                      const p = products.find(prod => prod.id === si.productoId);
                      return (
                        <div key={si.id} className="px-2 py-0.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-1 opacity-60">
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">{si.cantidad}x {p?.nombre}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="space-y-3">
                {items.map((item) => {
                  const product = products.find(p => p.id === item.productoId);
                  const isSoup = product?.tipo === 'SOPA';
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between group py-1 border-b border-slate-50 last:border-0 pb-3 last:pb-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
                          isSoup ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-brand-50 text-brand-600 border border-brand-100'
                        }`}>
                          {item.cantidad}
                        </div>
                        <div className="flex flex-col">
                           <p className="font-bold text-slate-800 uppercase tracking-tight leading-tight mb-0.5 text-[13px]">{product?.nombre}</p>
                           <div className="flex items-center gap-2">
                             <p className={`text-[8px] font-bold uppercase tracking-widest ${isSoup ? 'text-violet-400' : 'text-slate-400'}`}>
                                {isSoup ? 'Entrada/Sopa' : (product?.categoria === 'MENÚ' ? 'Plato Fondo' : product?.categoria)}
                             </p>
                             {item.estado !== 'SERVIDO' && item.timestampPedido && (
                               <OrderTimer 
                                 timestamp={item.timestampPedido} 
                                 hideIcon
                                 className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded-md scale-90 origin-left ml-1 text-white text-[9px] font-mono"
                               />
                             )}
                           </div>
                        </div>
                      </div>

                      {item.estado === 'SERVIDO' ? (
                        <div className="text-emerald-500 p-2">
                          <Check className="w-5 h-5" />
                        </div>
                      ) : (
                        <button
                          onClick={() => updateItemStatus(item.orderId, item.id, 'SERVIDO')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-100 flex items-center gap-2"
                        >
                          Listo
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
};

export const CajaView: React.FC = () => {
  const { orders, payOrder, resetStock, products, customers, deleteOrder, setOrders, requestConfirmation, selectedDate, isTodaySelected, cashControls, openCash, closeCash, reopenCash, currentCash } = useApp();
  const [selectingCustomerFor, setSelectingCustomerFor] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('0');

  const openOrders = [...orders]
    .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
    .sort((a, b) => {
      const aReady = a.items.every(i => i.estado === 'SERVIDO');
      const bReady = b.items.every(i => i.estado === 'SERVIDO');
      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

  const allPaymentsToday = orders
    .filter(o => o.fecha === selectedDate)
    .flatMap(o => o.pagos || []);

  const totalEfectivo = allPaymentsToday
    .filter(p => p.metodo === 'EFECTIVO')
    .reduce((acc, p) => acc + p.monto, 0);

  const totalYape = allPaymentsToday
    .filter(p => p.metodo === 'YAPE')
    .reduce((acc, p) => acc + p.monto, 0);

  const totalDirecto = totalEfectivo + totalYape;

  // Calcular cobros a clientes hoy (Depósitos y Pagos de crédito)
  const customerPaymentsToday = customers.flatMap(c => 
    c.historial
      .filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
      .map(t => ({ ...t, cliente: c.nombre }))
  );
  
  // Also count partial payments made via CREDITO today
  const partialCreditPaymentsToday = allPaymentsToday
    .filter(p => p.metodo === 'CREDITO')
    .reduce((acc, p) => acc + p.monto, 0);

  const totalCustomerPayments = customerPaymentsToday.reduce((acc, t) => acc + t.monto, 0) + partialCreditPaymentsToday;

  const totalRecaudado = totalDirecto + totalCustomerPayments;

  const exportFullDatabaseExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Detalle de Ventas (Row per item)
    const allSales = orders.flatMap(order => 
      order.items.map(item => {
        const product = products.find(p => p.id === item.productoId);
        return {
          'FECHA': order.fecha,
          'HORA': order.hora,
          'TICKET': order.id.split('-').pop(),
          'MESA': order.mesaId === '13' ? 'PL' : order.mesaId,
          'CLIENTE': order.cliente,
          'PRODUCTO': product?.nombre || 'Desconocido',
          'CANTIDAD': item.cantidad,
          'PRECIO UNIT.': product?.precio || 0,
          'SUBTOTAL': item.cantidad * (product?.precio || 0),
          'ESTADO PEDIDO': order.estado
        };
      })
    );
    const saleSheet = XLSX.utils.json_to_sheet(allSales);
    XLSX.utils.book_append_sheet(workbook, saleSheet, "Ventas Detalladas");

    // 2. Historial de Pagos
    const allPayments = orders.flatMap(order => 
      (order.pagos || []).map(p => ({
        'FECHA': p.fecha,
        'HORA': p.hora,
        'PEDIDO ID': order.id.split('-').pop(),
        'CLIENTE': order.cliente,
        'MONTO': p.monto,
        'METODO': p.metodo,
        'ESTADO FINAL': order.estado
      }))
    );
    const paymentSheet = XLSX.utils.json_to_sheet(allPayments);
    XLSX.utils.book_append_sheet(workbook, paymentSheet, "Historial Pagos");

    // 3. Control de Caja
    const cashSheet = XLSX.utils.json_to_sheet(cashControls.map(c => ({
      'FECHA': c.fecha,
      'ESTADO': c.estado,
      'APERTURA': c.montoApertura,
      'EFECTIVO': c.ingresosEfectivo,
      'YAPE': c.ingresosYape,
      'FIAR (CREDITOS)': c.ingresosFiar,
      'CIERRE TOTAL': c.montoCierre,
      'H. APERTURA': c.horaApertura,
      'H. CIERRE': c.horaCierre || '-'
    })));
    XLSX.utils.book_append_sheet(workbook, cashSheet, "Control Diario Caja");

    // 4. Clientes y Saldos
    const clientSheet = XLSX.utils.json_to_sheet(customers.map(c => ({
       'NOMBRE/RAZON SOCIAL': c.nombre,
       'TELEFONO': c.telefono,
       'SALDO ACUMULADO': c.saldo,
       'TOTAL TRANSACCIONES': c.historial.length
    })));
    XLSX.utils.book_append_sheet(workbook, clientSheet, "Base Clientes");

    // 5. Menu/Productos
    const productSheet = XLSX.utils.json_to_sheet(products.map(p => ({
      'CATEGORIA': p.categoria,
      'PRODUCTO': p.nombre,
      'PRECIO': p.precio,
      'STOCK INICIAL': p.stockInicial,
      'STOCK ACTUAL': p.stockActual
    })));
    XLSX.utils.book_append_sheet(workbook, productSheet, "Catalogo Menu");

    XLSX.writeFile(workbook, `SaborAbanquino_DB_Full_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Order summary for the table (all orders today)
  const orderSummary = [...orders]
    .filter(o => o.fecha === selectedDate)
    .sort((a, b) => {
      const numA = parseInt(a.id.split('-')[1] || '0');
      const numB = parseInt(b.id.split('-')[1] || '0');
      return numB - numA;
    });

  return (
    <div className="p-3 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Control de Jornada Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 p-6 rounded-[32px] border border-slate-100 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Control de Jornada</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Gestión de ingresos y reportes</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={exportFullDatabaseExcel}
            className="flex items-center gap-3 px-6 py-3.5 bg-emerald-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-[0.1em] hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          <button 
            onClick={exportFullDatabaseExcel}
            className="flex items-center gap-3 px-6 py-3.5 bg-brand-400 text-white rounded-[20px] font-black uppercase text-[10px] tracking-[0.1em] hover:bg-brand-500 transition-all active:scale-95 shadow-lg shadow-brand-100"
          >
            <Timer className="w-4 h-4" />
            Reporte de Ventas
          </button>
        </div>
      </div>

      {/* Caja Status Banner */}
      {!currentCash && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 soft-shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-rose-600 rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-rose-200">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight italic">Caja Cerrada</h3>
              <p className="text-rose-600/70 text-xs font-bold uppercase tracking-widest mt-1">Debe abrir la caja para registrar ventas y pagos en {selectedDate}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowOpenModal(true)}
            className="w-full md:w-auto px-10 py-5 bg-rose-600 text-white rounded-[22px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
          >
            Abrir Caja para {selectedDate}
          </button>
        </div>
      )}

      {currentCash && currentCash.estado === 'ABIERTA' && (
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[32px] p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 soft-shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-900 uppercase tracking-tight">Caja Abierta • {currentCash.horaApertura}</h3>
              <p className="text-emerald-600/70 text-[9px] font-bold uppercase tracking-widest">Base: S/ {currentCash.montoApertura.toFixed(2)} | Fecha: {selectedDate}</p>
            </div>
          </div>
          <button 
            onClick={() => closeCash()}
            className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all active:scale-95"
          >
            Cerrar Caja Final
          </button>
        </div>
      )}

      {currentCash && currentCash.estado === 'CERRADA' && (
        <div className="bg-slate-100 border-2 border-slate-200 rounded-[32px] p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 soft-shadow-sm grayscale">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-400 rounded-2xl flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-600 uppercase tracking-tight">Jornada Finalizada • {currentCash.horaCierre}</h3>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Cierre: S/ {currentCash.montoCierre.toFixed(2)} | Fecha: {selectedDate}</p>
            </div>
          </div>
          {isTodaySelected ? (
            <button 
              onClick={() => reopenCash()}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-100"
            >
              Reabrir Caja para {selectedDate}
            </button>
          ) : (
            <div className="px-6 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Registro Cerrado
            </div>
          )}
        </div>
      )}

      {/* Daily Summary Compact */}
      <div className="flex flex-col xl:flex-row gap-4 opacity-100 transition-opacity">
        <div className={`flex-1 bg-white rounded-3xl p-6 border border-slate-100 soft-shadow flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -translate-y-8 -translate-x-8" />
          <div className="shrink-0 relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Caja Real del Día</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-display font-bold text-emerald-600">S/</span>
              <span className="text-4xl font-display font-bold text-slate-900 tracking-tighter">{totalRecaudado.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="h-px md:h-12 w-full md:w-px bg-slate-100 shrink-0" />

          <div className="flex flex-wrap items-center gap-6 relative z-10">
            <div className="flex flex-col">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectivo</p>
              <p className="font-display font-bold text-slate-800 text-lg">S/ {totalEfectivo.toFixed(2)}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest mb-1">Yape</p>
              <p className="font-display font-bold text-slate-800 text-lg">S/ {totalYape.toFixed(2)}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Depósitos/Créditos</p>
              <p className="font-display font-bold text-slate-800 text-lg">S/ {totalCustomerPayments.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className={`xl:w-[400px] bg-slate-50 rounded-3xl p-5 border border-slate-200 flex flex-col soft-shadow-sm h-[100px] md:h-auto max-h-[160px] ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Flujo Reciente</p>
          <div className="space-y-2 overflow-y-auto no-scrollbar">
            {customerPaymentsToday.length === 0 ? (
              <p className="text-[9px] text-slate-400 font-bold uppercase py-2">Sin actividad reciente</p>
            ) : (
              customerPaymentsToday.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/50 px-3 py-2 rounded-xl border border-white transition-colors">
                  <p className="text-[10px] font-bold text-slate-700 truncate max-w-[150px] uppercase">{t.cliente}</p>
                  <p className="text-[11px] font-display font-bold text-emerald-600">+S/ {t.monto.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`space-y-4 ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cobros Pendientes</h2>
          </div>
          <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-brand-100">
            {openOrders.length} por liquidar
          </span>
        </div>

        {openOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3 bg-white rounded-3xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Caja al día</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {openOrders.map((order) => {
              const isReadyToPay = order.items.every(i => i.estado === 'SERVIDO');

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-[24px] p-5 shadow-sm border transition-all duration-300 relative overflow-hidden ${
                    isReadyToPay 
                      ? 'border-emerald-200 ring-4 ring-emerald-100/10 shadow-lg' 
                      : 'border-slate-100'
                  } flex flex-col sm:flex-row gap-5 lg:flex-col xl:flex-row`}
                >
                  {/* Visual Status Indicator */}
                  {!isReadyToPay && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200" />
                  )}
                  {isReadyToPay && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                  )}

                  {/* Order Info & Total */}
                  <div className="flex flex-col justify-between gap-4 min-w-[140px] shrink-0">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.15em]">
                          #{order.id.split('-').pop()}
                        </span>
                        {isReadyToPay ? (
                          <span className="text-[8px] font-black text-emerald-600 uppercase">Listo</span>
                        ) : (
                          <span className="text-[8px] font-black text-amber-500 uppercase">Cocina</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100 shrink-0">
                            <span className="font-display font-bold text-brand-600 text-sm">
                              {order.mesaId === '13' ? 'PL' : order.mesaId}
                            </span>
                         </div>
                         <h3 className="font-display font-bold text-slate-900 text-base uppercase leading-tight truncate max-w-[100px]">{order.cliente}</h3>
                      </div>
                    </div>

                    <div>
                       <div className="flex justify-between items-end mb-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total: S/ {order.total.toFixed(2)}</p>
                         {(() => {
                           const paid = (order.pagos || []).reduce((acc, p) => acc + p.monto, 0);
                           if (paid > 0) return <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Pagado: S/ {paid.toFixed(2)}</p>;
                           return null;
                         })()}
                       </div>
                       <div className="flex items-baseline gap-1">
                          <span className="text-base font-display font-bold text-emerald-600">S/</span>
                          <p className="text-3xl font-display font-bold text-slate-900 tracking-tighter leading-none">
                            {(() => {
                              const paid = (order.pagos || []).reduce((acc, p) => acc + p.monto, 0);
                              return Math.max(0, order.total - paid).toFixed(2);
                            })()}
                          </p>
                       </div>
                       <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Saldo Pendiente</p>
                    </div>
                  </div>

                  {/* Compact Detail Panel */}
                  <div className="flex-1 bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        Consumo • {order.items.length} Platos
                      </p>
                      
                      {/* Historial de pagos parciales */}
                      <div className="flex gap-1 overflow-x-auto no-scrollbar ml-2">
                        {(order.pagos || []).map((p, i) => (
                          <span key={p.id} className="text-[7px] font-black bg-white border border-slate-200 px-1.5 py-0.5 rounded-md text-slate-500 uppercase whitespace-nowrap">
                            {p.metodo === 'EFECTIVO' ? 'EF' : p.metodo === 'YAPE' ? 'YP' : 'FI'}: {p.monto.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 overflow-y-auto max-h-[85px] pr-2 no-scrollbar">
                      {order.items.map((item) => {
                        const p = products.find(prod => prod.id === item.productoId);
                        return (
                          <div key={item.id} className="flex justify-between items-center text-[9px] py-0.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-lg bg-white shadow-sm flex items-center justify-center text-[8px] font-black text-slate-500 shrink-0">{item.cantidad}</span>
                              <span className="font-bold text-slate-700 uppercase tracking-tight truncate max-w-[100px]">
                                {p?.nombre}
                              </span>
                            </div>
                            <span className="font-mono text-slate-400 text-[9px] tabular-nums">
                              {(item.cantidad * item.precioUnitario).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Highly Compact Actions */}
                  <div className="flex flex-col gap-2 min-w-[160px] justify-center pt-2">
                    <div className="flex flex-col gap-1 px-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto a pagar</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">S/</span>
                        <input 
                          type="number"
                          step="0.1"
                          placeholder="0.00"
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg py-1.5 pl-7 pr-2 text-xs font-bold outline-none focus:border-brand-400 focus:bg-white transition-all"
                          value={partialAmounts[order.id] ?? (order.total - (order.pagos || []).reduce((acc, p) => acc + p.monto, 0)).toFixed(2)}
                          onChange={(e) => setPartialAmounts(prev => ({ ...prev, [order.id]: e.target.value }))}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const amount = parseFloat(partialAmounts[order.id] || (order.total - (order.pagos || []).reduce((acc, p) => acc + p.monto, 0)).toString());
                        if (amount > 0) {
                          payOrder(order.id, 'EFECTIVO', amount);
                          setPartialAmounts(prev => ({ ...prev, [order.id]: '' }));
                        }
                      }}
                      disabled={!isReadyToPay}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl transition-all active:scale-95 border-2 ${
                        isReadyToPay 
                          ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600' 
                          : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.1em]">Efectivo</span>
                      <div className={`w-4 h-4 rounded-lg flex items-center justify-center transition-all ${isReadyToPay ? 'bg-white/20' : 'bg-transparent'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        const amount = parseFloat(partialAmounts[order.id] || (order.total - (order.pagos || []).reduce((acc, p) => acc + p.monto, 0)).toString());
                        if (amount > 0) {
                          payOrder(order.id, 'YAPE', amount);
                          setPartialAmounts(prev => ({ ...prev, [order.id]: '' }));
                        }
                      }}
                      disabled={!isReadyToPay}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl transition-all active:scale-95 border-2 ${
                        isReadyToPay 
                          ? 'bg-brand-600 border-brand-500 text-white hover:bg-brand-700' 
                          : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.1em]">Via Yape</span>
                      <div className={`w-4 h-4 rounded-lg flex items-center justify-center transition-all ${isReadyToPay ? 'bg-white/20' : 'bg-transparent'}`}>
                        <Plus className="w-2.5 h-2.5" />
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectingCustomerFor(order.id)}
                      disabled={!isReadyToPay}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl transition-all border-2 text-[8px] font-black uppercase tracking-widest ${
                        isReadyToPay 
                          ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' 
                          : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      Fiar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showOpenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden p-8 space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-brand-100">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Apertura de Jornada</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.1em]">Ingresa el fondo inicial de caja</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-display font-bold text-slate-400">S/</span>
                <input 
                  autoFocus
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] py-6 pl-16 pr-6 text-2xl font-display font-bold focus:border-brand-500 focus:bg-white outline-none transition-all text-slate-800"
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const amount = parseFloat(openingAmount || '0');
                    if (amount < 0) return;
                    openCash(amount);
                    setShowOpenModal(false);
                    setOpeningAmount('0');
                  }}
                  className="w-full py-5 bg-brand-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all active:scale-95 cursor-pointer"
                >
                  Iniciar Operaciones
                </button>
                <button 
                  onClick={() => setShowOpenModal(false)}
                  className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {selectingCustomerFor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cargar a Cuenta</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecciona el cliente para esta orden</p>
                </div>
                <button onClick={() => setSelectingCustomerFor(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-4">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    autoFocus
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] py-5 pl-14 pr-6 text-base font-bold focus:border-brand-500 focus:bg-white outline-none transition-all soft-shadow-sm"
                    placeholder="Buscar por nombre de cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                
                <div className="space-y-3 max-h-[350px] overflow-auto pr-2 no-scrollbar">
                  {customers
                    .filter(c => c.nombre.toLowerCase().includes(customerSearch.toLowerCase()))
                    .map(customer => (
                       <button
                        key={customer.id}
                        onClick={() => {
                          const selectedOrder = orders.find(o => o.id === selectingCustomerFor && o.fecha === selectedDate);
                          const amount = parseFloat(partialAmounts[selectingCustomerFor!] || (selectedOrder?.total! - (selectedOrder?.pagos || []).reduce((acc, p) => acc + p.monto, 0)).toString());
                          if (amount > 0) {
                            payOrder(selectingCustomerFor!, 'CREDITO', amount, customer.id);
                            setSelectingCustomerFor(null);
                            setPartialAmounts(prev => ({ ...prev, [selectingCustomerFor!]: '' }));
                            setCustomerSearch('');
                          }
                        }}
                        className="w-full p-5 bg-white border border-slate-100 rounded-[28px] flex justify-between items-center hover:border-brand-500 hover:bg-brand-50/30 transition-all group soft-shadow-sm"
                      >
                        <div className="text-left flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-brand-500 transition-colors">
                             <User className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-slate-900 group-hover:text-brand-700 transition-colors">{customer.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Saldo: <span className="text-emerald-500">S/ {customer.saldo.toFixed(2)}</span></p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand-600 group-hover:text-white transition-all">
                           <Plus className="w-5 h-5" />
                        </div>
                      </button>
                    ))}
                  {customers.filter(c => c.nombre.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                    <p className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                      No se encontraron clientes
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Orders Summary Table Compact */}
      <div className="space-y-4 pt-4">
        <div className="px-2">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Registro Histórico</h2>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 soft-shadow overflow-hidden overflow-x-auto no-scrollbar">
           <table className="w-full text-left border-collapse min-w-[700px]">
             <thead>
               <tr className="bg-slate-50/50 border-b border-slate-100">
                 <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                 <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Comensal</th>
                 <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                 <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                 <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {orderSummary.map((order) => (
                 <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-5 py-3 text-[9px] font-bold text-slate-400 tracking-widest font-mono">#{order.id.split('-').pop()}</td>
                   <td className="px-5 py-3 text-xs font-bold text-slate-800 uppercase truncate max-w-[200px]">{order.cliente}</td>
                   <td className="px-5 py-3 text-center">
                     <span className="text-[10px] font-bold text-slate-400">{order.items.length}</span>
                   </td>
                   <td className="px-5 py-3 text-xs font-display font-bold text-slate-900 tracking-tight">S/ {order.total.toFixed(2)}</td>
                   <td className="px-5 py-3">
                     <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                        order.estado === 'PAGADO' ? 'bg-emerald-50 text-emerald-600' : 
                        order.estado === 'CREDITO' ? 'bg-slate-900 text-white' : 'bg-rose-50 text-rose-500'
                      }`}>
                        {order.estado}
                      </span>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};
