/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.tsx';
import { Check, Clock, Utensils, AlertCircle, Trash2, Search, X, Plus, Timer, User, Users, Download, LayoutDashboard, Edit2, Lock, Coins, Calculator, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderTimer } from './OrderTimer.tsx';
import { OrderModal } from './OrderModal.tsx';
import * as XLSX from 'xlsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const CocinaView: React.FC = () => {
  const { orders, products, updateItemStatus, currentMenu, selectedDate, isTodaySelected, mesas } = useApp();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const productsMap = React.useMemo(() => {
    const map = new Map<string, typeof products[0]>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const itemsToPrepare = React.useMemo(() => {
    return orders
      .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate)
      .flatMap(order => {
        const seconds = order.items.filter(i => {
          const p = productsMap.get(i.productoId);
          return p?.tipo === 'SEGUNDO';
        });
        const hasPendingSeconds = seconds.some(i => i.estado !== 'SERVIDO');
        const hasNoSeconds = seconds.length === 0;

        return order.items.map(item => ({ 
          ...item, 
          orderId: order.id, 
          mesaId: order.mesaId,
          usuarioNombre: order.usuarioNombre,
          timestamp: order.timestamp,
          hasPendingSeconds,
          hasNoSeconds
        }));
      })
      .filter(item => {
        const product = productsMap.get(item.productoId);
        const isSoup = product?.tipo === 'SOPA';

        if (item.estado !== 'SERVIDO') return true;
        
        // Keep served soup if there are pending seconds OR no seconds have been ordered yet
        return isSoup && (item.hasPendingSeconds || item.hasNoSeconds);
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [orders, productsMap, selectedDate]);

  // Filter main dishes and soup from current menu to show stock
  const menuStock = React.useMemo(() => {
    return currentMenu
      .filter(m => m.fecha === selectedDate)
      .map(item => {
        const product = productsMap.get(item.productoId);
        return { 
          id: item.id,
          nombre: product?.nombre || 'Desconocido',
          tipo: product?.tipo,
          stockActual: item.stockActual,
          stockInicial: item.stockInicial
        };
      })
      .filter(item => item.tipo === 'SEGUNDO' || item.tipo === 'SOPA')
      .sort((a, b) => {
        if (a.tipo === 'SOPA' && b.tipo !== 'SOPA') return -1;
        if (a.tipo !== 'SOPA' && b.tipo === 'SOPA') return 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [currentMenu, productsMap, selectedDate]);

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

  const summary = React.useMemo(() => {
    return itemsToPrepare
      .filter(item => item.estado !== 'SERVIDO')
      .reduce((acc, item) => {
        const name = productsMap.get(item.productoId)?.nombre || 'Desconocido';
        acc[name] = (acc[name] || 0) + item.cantidad;
        return acc;
      }, {} as Record<string, number>);
  }, [itemsToPrepare, productsMap]);

  // Group by Mesa but keep order ID in mind
  const { itemsByMesa, sortedMesaKeys } = React.useMemo(() => {
    const grouped = itemsToPrepare.reduce((acc, item) => {
      const key = `${item.mesaId}-${item.orderId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as {[key: string]: any[]});

    const keys = Object.keys(grouped).sort((a, b) => {
      const timestampA = grouped[a][0].timestamp || 0;
      const timestampB = grouped[b][0].timestamp || 0;
      return timestampA - timestampB;
    });

    return { itemsByMesa: grouped, sortedMesaKeys: keys };
  }, [itemsToPrepare]);

  return (
    <div className="p-2 md:p-6 space-y-3 md:space-y-4 max-w-[1600px] mx-auto">
      {/* Metrics Bar Compact */}
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="flex-1 bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-4 border border-violet-100/60 shadow-[0_4px_20px_rgba(159,103,255,0.01)] flex flex-col md:flex-row md:items-center gap-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b md:border-b-0 md:border-r border-violet-100 pb-2 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
             Stock Crítico
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-0.5">
            {menuStock.map(item => {
              const isCritical = item.stockActual < 5;
              return (
                <div key={item.id} className={`flex items-baseline gap-2 shrink-0 px-3 py-1 rounded-full border transition-all ${
                  isCritical 
                    ? 'bg-rose-50/70 border-rose-200/60 text-rose-700 font-extrabold ring-2 ring-rose-500/5' 
                    : 'bg-white border-slate-100 text-slate-700'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[90px]">{item.nombre}</span>
                  <span className={`text-sm font-display font-black leading-none ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>
                    {item.stockActual}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-4 text-white shadow-lg flex flex-col md:flex-row md:items-center gap-4 min-w-fit">
          <div className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] border-b md:border-b-0 md:border-r border-white/10 pb-2 md:pb-0 md:pr-4 flex items-center gap-2 shrink-0">
             <Clock className="w-3.5 h-3.5 text-brand-400" /> Hoy Cocinado
          </div>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(summary).map(([name, qty]) => (
              <div key={name} className="flex items-center gap-1.5 shrink-0 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <span className="text-sm font-display font-black text-brand-400 leading-none">{qty}</span>
                <span className="text-[8px] md:text-[9.5px] font-black uppercase tracking-wider text-slate-300 leading-none">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preparation Count Floating Style */}
      <div className="flex justify-end pr-2">
        <span className="bg-brand-50 text-brand-700 border border-brand-100/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider soft-shadow-sm flex items-center gap-1.5 selection:bg-transparent">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
          {itemsToPrepare.length} Items en Proceso
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sortedMesaKeys.map((key) => {
          const items = itemsByMesa[key];
          const mesaId = items[0].mesaId;
          const orderTimestamp = items[0].timestamp || Date.now();
          const elapsedMinutes = Math.floor((Date.now() - orderTimestamp) / 60000);
          
          const orderId = items[0].orderId;
          const fullOrder = orders.find(o => o.id === orderId);

          // "Falta Segundo" alert check
          const totalSoupItems = fullOrder?.items.filter(i => {
            const p = products.find(prod => prod.id === i.productoId);
            return p?.tipo === 'SOPA';
          }) || [];
          
          const totalSecondItems = fullOrder?.items.filter(i => {
            const p = products.find(prod => prod.id === i.productoId);
            return p?.tipo === 'SEGUNDO';
          }) || [];

          const hasSoup = totalSoupItems.length > 0;
          const hasNoSecondsOrderedYet = totalSecondItems.length === 0;
          const isOnlySoupAndNoSeconds = hasSoup && hasNoSecondsOrderedYet;

          // Find if there's any soup item marked as SERVIDO ("Listo")
          const servedSoup = totalSoupItems.find(i => i.estado === 'SERVIDO');
          const isSoupServed = !!servedSoup;

          let isFaltaSegundoAlert = false;
          let elapsedMsSinceSoupListo = 0;
          let minutesSinceSoupListo = 0;
          let secondsSinceSoupListo = 0;

          if (isOnlySoupAndNoSeconds && isSoupServed && servedSoup) {
            const baseTime = servedSoup.timestampServido || servedSoup.timestampPedido || fullOrder?.timestamp || orderTimestamp;
            elapsedMsSinceSoupListo = now - baseTime;
            minutesSinceSoupListo = Math.floor(elapsedMsSinceSoupListo / 60000);
            secondsSinceSoupListo = Math.floor((elapsedMsSinceSoupListo % 60000) / 1000);

            // Warning is red after 10 minutes (600,000 ms) of marked "Listo"
            isFaltaSegundoAlert = elapsedMsSinceSoupListo >= 600000;
          }

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
              className={`bg-white rounded-[32px] md:rounded-[40px] border shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
                isFaltaSegundoAlert
                  ? 'border-rose-500 ring-2 ring-rose-200 shadow-[0_4px_24px_rgba(239,68,68,0.12)]'
                  : (elapsedMinutes >= 20 ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-200')
              }`}
            >
            <div className={`${headerColorClass} px-4 md:px-5 py-3 md:py-4 flex justify-between items-center text-white relative transition-colors duration-500`}>
               <div className="absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full blur-2xl -translate-y-8 translate-x-8" />
               <div className="flex flex-col relative z-10">
                  <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] ${textColorClass} leading-none mb-1 md:mb-1.5`}>
                    #{items[0].orderId.split('-').pop()} • Ticket
                  </span>
                  <h3 className="text-lg md:text-xl font-display font-bold leading-none">
                    {mesaId === '13' ? 'PARA LLEVAR' : (mesas.find(m => m.id === mesaId)?.nombre.toUpperCase() || `MESA ${mesaId}`)}
                  </h3>
                  <p className={`text-[7px] md:text-[8px] font-bold uppercase tracking-widest mt-1 ${textColorClass} opacity-80`}>Por: {items[0].usuarioNombre || 'Desconocido'}</p>
               </div>
               <div className="flex flex-col items-end gap-1 md:gap-2 relative z-10">
                  <OrderTimer timestamp={orderTimestamp} className="text-base md:text-lg" />
                  <p className="text-[7px] md:text-[8px] font-sans font-extrabold uppercase tracking-widest tabular-nums px-1.5 py-0.5 bg-black/20 rounded-md md:rounded-lg backdrop-blur-sm border border-white/5">A las {items[0].horaPedido}</p>
               </div>
            </div>

            <div className="p-3 md:p-4 space-y-2 md:space-y-3 flex-1 overflow-auto">
              {/* Alerta de Falta Segundo */}
              {isOnlySoupAndNoSeconds && isSoupServed && (
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                  isFaltaSegundoAlert 
                    ? 'bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-200 animate-pulse' 
                    : 'bg-amber-50 border-amber-200 text-amber-900 border-dashed'
                }`}>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-sm">⚠️</span>
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isFaltaSegundoAlert ? '¡FALTA SEGUNDO!' : 'Sopa Servida (Esperando Segundo)'}
                    </span>
                  </div>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isFaltaSegundoAlert ? 'text-rose-100' : 'text-amber-600'}`}>
                    Sopa lista hace: {minutesSinceSoupListo}m {secondsSinceSoupListo}s
                  </p>
                </div>
              )}
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

              <div className="space-y-1">
                {items
                  .filter(item => item.estado !== 'SERVIDO')
                  .map((item) => {
                  const product = products.find(p => p.id === item.productoId);
                  const isSoup = product?.tipo === 'SOPA';
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between group py-1 border-b border-slate-50 last:border-0 pb-1.5 last:pb-0.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
                          isSoup ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-brand-50 text-brand-600 border border-brand-100'
                        }`}>
                          {item.cantidad}
                        </div>
                        <div className="flex flex-col">
                           <div className="flex items-center gap-1.5 flex-wrap">
                             <p className="font-bold text-slate-800 uppercase tracking-tight leading-tight text-[13px]">{product?.nombre}</p>
                             {item.estado !== 'SERVIDO' && item.timestampPedido && (
                               <OrderTimer 
                                 timestamp={item.timestampPedido} 
                                 hideIcon
                                 className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-md text-white text-[9.5px] font-sans font-extrabold leading-none shrink-0"
                               />
                             )}
                           </div>
                           <p className={`text-[8.5px] font-bold uppercase tracking-widest mt-0.5 ${isSoup ? 'text-violet-400' : 'text-slate-400'} leading-none`}>
                              {isSoup ? 'Entrada/Sopa' : (item.notas ? `⚠️ ${item.notas.toUpperCase()}` : (product?.categoria === 'MENÚ' ? 'Plato Fondo' : product?.categoria))}
                           </p>
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
  const { currentUser, orders, payOrder, resetStock, products, customers, deleteOrder, setOrders, requestConfirmation, selectedDate, isTodaySelected, cashControls, openCash, closeCash, reopenCash, currentCash, addItemsToOrder, updateOrderInfo, updateWholeOrder, currentMenu, mesas } = useApp();
  const [desdeDate, setDesdeDate] = useState<string>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const y = firstDay.getFullYear();
    const m = String(firstDay.getMonth() + 1).padStart(2, '0');
    const d = String(firstDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [hastaDate, setHastaDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [isExporting, setIsExporting] = useState(false);

  const [selectingCustomerFor, setSelectingCustomerFor] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  const productsMap = React.useMemo(() => {
    const map = new Map<string, typeof products[0]>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const mesasMap = React.useMemo(() => {
    const map = new Map<string, typeof mesas[0]>();
    mesas.forEach(m => map.set(m.id, m));
    return map;
  }, [mesas]);

  // New spectacular account settlement/liquidation modal states
  const [liquidationOrderId, setLiquidationOrderId] = useState<string | null>(null);
  const [liquidationModality, setLiquidationModality] = useState<'COMPLETO' | 'EQUITATIVO' | 'POR_PLATO' | 'PERSONALIZADO'>('COMPLETO');
  const [liquidationSplitCount, setLiquidationSplitCount] = useState<number>(2);
  const [liquidationSelectedItems, setLiquidationSelectedItems] = useState<Record<string, number>>({});
  const [liquidationMethod, setLiquidationMethod] = useState<'EFECTIVO' | 'YAPE' | 'PLIN' | 'CREDITO'>('EFECTIVO');
  const [liquidationCashReceived, setLiquidationCashReceived] = useState<string>('');
  const [liquidationCustomAmount, setLiquidationCustomAmount] = useState<string>('');
  const [liquidationCustomerSearch, setLiquidationCustomerSearch] = useState<string>('');
  const [liquidationSelectedCustomer, setLiquidationSelectedCustomer] = useState<{ id: string; nombre: string; saldo: number } | null>(null);

  const liquidationOrder = React.useMemo(() => {
    return orders.find(o => o.id === liquidationOrderId);
  }, [orders, liquidationOrderId]);

  const liquidationTotalPaid = React.useMemo(() => {
    return (liquidationOrder?.pagos || []).reduce((acc, p) => acc + p.monto, 0);
  }, [liquidationOrder]);

  const liquidationBalance = React.useMemo(() => {
    return liquidationOrder ? Math.max(0, liquidationOrder.total - liquidationTotalPaid) : 0;
  }, [liquidationOrder, liquidationTotalPaid]);

  const liquidationAmountToPay = React.useMemo(() => {
    let amt = 0;
    if (liquidationModality === 'COMPLETO') {
      amt = liquidationBalance;
    } else if (liquidationModality === 'EQUITATIVO') {
      amt = liquidationBalance / liquidationSplitCount;
    } else if (liquidationModality === 'POR_PLATO') {
      amt = liquidationOrder?.items.reduce((acc, item) => {
        const selectedQty = liquidationSelectedItems[item.id] || 0;
        return acc + (selectedQty * item.precioUnitario);
      }, 0) || 0;
    } else if (liquidationModality === 'PERSONALIZADO') {
      amt = parseFloat(liquidationCustomAmount) || 0;
    }
    return Math.min(amt, liquidationBalance);
  }, [liquidationModality, liquidationBalance, liquidationSplitCount, liquidationOrder, liquidationSelectedItems, liquidationCustomAmount]);

  useEffect(() => {
    if (liquidationOrderId && liquidationOrder) {
      setLiquidationModality('COMPLETO');
      setLiquidationSplitCount(2);
      setLiquidationMethod('EFECTIVO');
      setLiquidationCashReceived('');
      setLiquidationCustomAmount('');
      setLiquidationCustomerSearch('');
      setLiquidationSelectedCustomer(null);
      
      const initQtys: Record<string, number> = {};
      liquidationOrder.items.forEach(item => {
        initQtys[item.id] = 0;
      });
      setLiquidationSelectedItems(initQtys);
    }
  }, [liquidationOrderId, liquidationOrder]);

  const [efectivoModalFor, setEfectivoModalFor] = useState<{
    id: string;
    cliente: string;
    total: number;
    balance: number;
    defaultMonto: number;
  } | null>(null);
  const [efectivoMontoAPagar, setEfectivoMontoAPagar] = useState('');
  const [efectivoDineroRecibido, setEfectivoDineroRecibido] = useState('');

  const isCashClosed = React.useMemo(() => {
    return cashControls.find(c => c.fecha === selectedDate)?.estado === 'CERRADA';
  }, [cashControls, selectedDate]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('0');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [cashCounted, setCashCounted] = useState('');

  const executeLiquidationPayment = async () => {
    if (!liquidationOrder || liquidationAmountToPay <= 0) return;
    
    let targetCustomerId: string | undefined = undefined;
    if (liquidationMethod === 'CREDITO') {
      if (!liquidationSelectedCustomer) {
        alert('Por favor, selecciona un cliente para fiar a cuenta.');
        return;
      }
      targetCustomerId = liquidationSelectedCustomer.id;
    }

    try {
      await payOrder(liquidationOrder.id, liquidationMethod, liquidationAmountToPay, targetCustomerId);

      // Recalculate balance with current batch to decide closure
      const updatedOrder = orders.find(o => o.id === liquidationOrder.id);
      const newTotalPaid = [...(updatedOrder?.pagos || []), { id: 'temp', metodo: liquidationMethod, monto: liquidationAmountToPay }].reduce((acc, p) => acc + p.monto, 0);
      const newBalance = Math.max(0, (updatedOrder?.total || 0) - newTotalPaid);

      if (newBalance <= 0.01) {
        setLiquidationOrderId(null);
      } else {
        setLiquidationCashReceived('');
        if (liquidationModality === 'POR_PLATO') {
          // Reset quantities of plates to 0 since they just paid for them
          const resetQtys: Record<string, number> = {};
          liquidationOrder.items.forEach(item => {
            resetQtys[item.id] = 0;
          });
          setLiquidationSelectedItems(resetQtys);
        } else if (liquidationModality === 'EQUITATIVO') {
          // Reduce the remaining split parts count by 1 so the remaining balance is divided correctly
          setLiquidationSplitCount(prev => Math.max(1, prev - 1));
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Error al registrar el pago de liquidación: ' + err.message);
    }
  };

  const openOrders = React.useMemo(() => {
    return [...orders]
      .filter(o => o.estado === 'ABIERTO' && o.fecha === selectedDate && o.total > 0 && o.items.every(i => i.estado === 'SERVIDO'))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [orders, selectedDate]);

  const financialMetrics = React.useMemo(() => {
    const allPaymentsToday = orders
      .filter(o => o.fecha === selectedDate)
      .flatMap(o => o.pagos || []);

    const totalEfectivoVentas = allPaymentsToday
      .filter(p => p.metodo === 'EFECTIVO')
      .reduce((acc, p) => acc + p.monto, 0);

    const totalYapeVentas = allPaymentsToday
      .filter(p => p.metodo === 'YAPE' || p.metodo === 'PLIN')
      .reduce((acc, p) => acc + p.monto, 0);

    // Calcular cobros a clientes hoy (Depósitos y Pagos de crédito)
    const customerPaymentsTodayRaw = customers.flatMap(c => 
      c.historial
        .filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
        .map(t => ({ ...t, cliente: c.nombre }))
    );
    
    const totalEfectivoCobros = customerPaymentsTodayRaw
      .filter(t => t.metodoPago === 'EFECTIVO')
      .reduce((acc, t) => acc + t.monto, 0);
      
    const totalYapeCobros = customerPaymentsTodayRaw
      .filter(t => t.metodoPago === 'YAPE' || t.metodoPago === 'PLIN')
      .reduce((acc, t) => acc + t.monto, 0);

    const baseCaja = currentCash?.montoApertura || 0;
    
    // CAJA TOTAL = (Efectivo Ventas + Efectivo Cobros) + (Yape Ventas + Yape Cobros) + Base
    const totalCajaGlobal = totalEfectivoVentas + totalYapeVentas + totalEfectivoCobros + totalYapeCobros + baseCaja;
    
    // CAJA REAL (Efectivo) = (Efectivo Ventas + Efectivo Cobros) + Base
    const totalCajaEfectivo = totalEfectivoVentas + totalEfectivoCobros + baseCaja;

    return {
      allPaymentsToday,
      totalEfectivoVentas,
      totalYapeVentas,
      customerPaymentsTodayRaw,
      totalEfectivoCobros,
      totalYapeCobros,
      baseCaja,
      totalCajaGlobal,
      totalCajaEfectivo
    };
  }, [orders, customers, currentCash, selectedDate]);

  const {
    allPaymentsToday,
    totalEfectivoVentas,
    totalYapeVentas,
    customerPaymentsTodayRaw,
    totalEfectivoCobros,
    totalYapeCobros,
    baseCaja,
    totalCajaGlobal,
    totalCajaEfectivo
  } = financialMetrics;

  const exportFullDatabaseExcel = async () => {
    setIsExporting(true);
    try {
      const [ordersSnapshot, cashSnapshot] = await Promise.all([
        getDocs(collection(db, 'pedidos')),
        getDocs(collection(db, 'control_caja'))
      ]);

      const allOrders = ordersSnapshot.docs.map(doc => doc.data() as any);
      const allCashControls = cashSnapshot.docs.map(doc => doc.data() as any);

      // Helper function to check if a Date (from dd/mm/yyyy format) is in the range
      const start = new Date(desdeDate + 'T00:00:00');
      const end = new Date(hastaDate + 'T23:59:59');

      const isDateInRange = (dateStr: string) => {
        if (!dateStr) return false;
        const [d, m, y] = dateStr.split('/').map(Number);
        const dObj = new Date(y, m - 1, d);
        return dObj >= start && dObj <= end;
      };

      const filteredOrders = allOrders.filter(o => isDateInRange(o.fecha));
      const filteredCash = allCashControls.filter(c => isDateInRange(c.fecha));

      const workbook = XLSX.utils.book_new();

      // 1. Detalle de Ventas (Row per item)
      const allSales = filteredOrders.flatMap(order => 
        (order.items || []).map((item: any) => {
          const product = products.find(p => p.id === item.productoId);
          return {
            'FECHA': order.fecha,
            'HORA': order.hora,
            'TICKET': order.id ? order.id.split('-').pop() : '',
            'MESA': order.mesaId === '13' ? 'PL' : (mesas.find(m => m.id === order.mesaId)?.nombre || order.mesaId),
            'CLIENTE': order.cliente,
            'USUARIO': order.usuarioNombre || 'Desconocido',
            'PRODUCTO': product?.nombre || 'Desconocido',
            'CANTIDAD': item.cantidad,
            'PRECIO UNIT.': item.precioUnitario || 0,
            'SUBTOTAL': item.cantidad * (item.precioUnitario || 0),
            'ESTADO PEDIDO': order.estado
          };
        })
      );
      const saleSheet = XLSX.utils.json_to_sheet(allSales);
      XLSX.utils.book_append_sheet(workbook, saleSheet, "Ventas Detalladas");

      // 2. Historial de Pagos
      const allPayments = filteredOrders.flatMap(order => 
        (order.pagos || []).map((p: any) => ({
          'FECHA': p.fecha,
          'HORA': p.hora,
          'PEDIDO ID': order.id ? order.id.split('-').pop() : '',
          'CLIENTE': order.cliente,
          'MONTO': p.monto,
          'METODO': p.metodo,
          'USUARIO': p.usuarioNombre || order.usuarioNombre || 'Desconocido',
          'ESTADO FINAL': order.estado
        }))
      );
      const paymentSheet = XLSX.utils.json_to_sheet(allPayments);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, "Historial Pagos");

      // 3. Control de Caja
      const cashSheet = XLSX.utils.json_to_sheet(filteredCash.map((c: any) => ({
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
         'TOTAL TRANSACCIONES': c.historial ? c.historial.length : 0
      })));
      XLSX.utils.book_append_sheet(workbook, clientSheet, "Base Clientes");

      // 5. Movimientos de Cuentas (En el rango de fechas)
      const movementsRanged = customers.flatMap(c => 
        (c.historial || [])
          .filter(t => isDateInRange(t.fecha))
          .map(t => ({
            'FECHA': t.fecha,
            'HORA': t.hora,
            'CLIENTE': c.nombre,
            'TIPO': t.tipo,
            'DESCRIPCION': t.descripcion,
            'METODO': t.metodoPago || '-',
            'MONTO': t.monto
          }))
      ).sort((a, b) => {
        const orderA = a.FECHA.split('/').reverse().join('') + a.HORA;
        const orderB = b.FECHA.split('/').reverse().join('') + a.HORA;
        return orderA.localeCompare(orderB);
      });
      
      const movementSheet = XLSX.utils.json_to_sheet(movementsRanged);
      XLSX.utils.book_append_sheet(workbook, movementSheet, "Movimientos Cuentas");

      // 6. Menu/Productos
      const productSheet = XLSX.utils.json_to_sheet(products.map(p => ({
        'CATEGORIA': p.categoria,
        'PRODUCTO': p.nombre,
        'PRECIO': p.precio,
        'STOCK INICIAL': p.stockInicial || 0,
        'STOCK ACTUAL': p.stockActual || 0
      })));
      XLSX.utils.book_append_sheet(workbook, productSheet, "Catalogo Menu");

      const rangeString = `${desdeDate.split('-').reverse().join('-')}_al_${hastaDate.split('-').reverse().join('-')}`;
      XLSX.writeFile(workbook, `SaborAbanquino_DB_Rango_${rangeString}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Hubo un error al descargar el archivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  // Order summary for the table (all orders today)
  const orderSummary = React.useMemo(() => {
    return [...orders]
      .filter(o => o.fecha === selectedDate)
      .sort((a, b) => {
        const numA = parseInt(a.id.split('-')[1] || '0');
        const numB = parseInt(b.id.split('-')[1] || '0');
        return numB - numA;
      });
  }, [orders, selectedDate]);

  const getMesaNumber = (mesaId: string) => {
    const found = mesasMap.get(mesaId);
    const name = found ? found.nombre : mesaId;
    const numOnly = name.replace(/\D/g, '');
    return numOnly ? numOnly.padStart(2, '0') : name;
  };

  const getMetodoBadgeStyle = (metodo: string) => {
    const m = metodo.toUpperCase();
    if (m === 'YAPE') return 'text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100/50';
    if (m === 'PLIN') return 'text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100/50';
    if (m === 'EFECTIVO') return 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50';
    if (m === 'CREDITO') return 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100/50';
    return 'text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-150';
  };

  const ordersMap = React.useMemo(() => {
    const map = new Map<string, typeof orders[0]>();
    orders.forEach(o => map.set(o.id, o));
    return map;
  }, [orders]);

  const orderToEdit = React.useMemo(() => {
    return editingOrderId ? ordersMap.get(editingOrderId) : undefined;
  }, [ordersMap, editingOrderId]);

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
       {editingOrderId && orderToEdit && (
        <OrderModal
          onClose={() => setEditingOrderId(null)}
          onAdd={() => {}}
          onSaveEdit={async (qtys, notes, newClienteName, newMesaId) => {
            await updateWholeOrder(editingOrderId, newMesaId, newClienteName, qtys, notes);
            setEditingOrderId(null);
          }}
          products={products}
          currentMenu={currentMenu.filter(m => m.fecha === selectedDate)}
          mesaId={orderToEdit.mesaId}
          mesaName={mesasMap.get(orderToEdit.mesaId)?.nombre || orderToEdit.mesaId}
          initialClienteName={orderToEdit.cliente}
          mesas={mesas}
          initialItems={orderToEdit.items}
          title="Modificar Pedido en Caja"
        />
      )}
      {/* Control de Jornada Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/50 p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-100 mb-1 md:mb-2">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-50 rounded-xl md:rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
            <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Caja Central</h1>
            <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Gestión de ingresos</p>
          </div>
        </div>
        
        {currentUser?.role === 'ADMIN' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white border border-slate-900 p-3.5 rounded-3xl w-full lg:w-auto shadow-sm">
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 select-none">DESDE</span>
                <div className="relative flex items-center justify-between bg-white border border-slate-900 px-3.5 py-1.5 rounded-xl h-[42px] hover:border-slate-800 transition-all cursor-pointer">
                  <span className="text-[11px] md:text-sm font-sans font-black text-slate-900 select-none">
                    {(() => {
                      if (!desdeDate) return '';
                      const [y, m, d] = desdeDate.split('-');
                      return `${d}/${m}/${y}`;
                    })()}
                  </span>
                  <Calendar className="w-4 h-4 text-slate-700 shrink-0 ml-1.5" />
                  <input 
                    type="date"
                    value={desdeDate}
                    onChange={(e) => setDesdeDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 select-none">HASTA</span>
                <div className="relative flex items-center justify-between bg-white border border-slate-900 px-3.5 py-1.5 rounded-xl h-[42px] hover:border-slate-800 transition-all cursor-pointer">
                  <span className="text-[11px] md:text-sm font-sans font-black text-slate-900 select-none">
                    {(() => {
                      if (!hastaDate) return '';
                      const [y, m, d] = hastaDate.split('-');
                      return `${d}/${m}/${y}`;
                    })()}
                  </span>
                  <Calendar className="w-4 h-4 text-slate-700 shrink-0 ml-1.5" />
                  <input 
                    type="date"
                    value={hastaDate}
                    onChange={(e) => setHastaDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={exportFullDatabaseExcel}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-5 h-[42px] sm:mt-4.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-350 disabled:text-slate-400 text-white rounded-3xl font-black uppercase text-[10px] tracking-wider transition-all active:scale-95 shadow-md shadow-emerald-100/50 group shrink-0 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
              {isExporting ? 'Exportando...' : 'Descargar Excel Completo'}
            </button>
          </div>
        )}
      </div>

      {/* Caja Status Banner */}
      {!currentCash && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl md:rounded-[32px] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 soft-shadow-sm">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-rose-600 rounded-xl md:rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
              <AlertCircle className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-rose-900 uppercase tracking-tight italic">Caja Cerrada</h3>
              <p className="text-rose-600/70 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Abre caja para operar en {selectedDate}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowOpenModal(true)}
            className="w-full md:w-auto px-6 md:px-10 py-4 md:py-5 bg-rose-600 text-white rounded-xl md:rounded-[22px] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
          >
            Abrir Caja
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
            onClick={() => {
              setCashCounted(totalCajaEfectivo.toFixed(2));
              setShowCloseModal(true);
            }}
            className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all active:scale-95"
          >
            Cerrar Caja Final
          </button>
        </div>
      )}

      {currentCash && currentCash.estado === 'CERRADA' && currentCash.efectivoFisico !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2 animate-in fade-in slide-in-from-top-2 duration-700">
          <div className="bg-white p-5 rounded-2xl md:rounded-[32px] border border-slate-100 flex flex-col items-center text-center soft-shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Efectivo Sistema</p>
            <p className="font-display font-bold text-slate-700 text-2xl tracking-tighter">S/ {(currentCash.montoApertura + currentCash.ingresosEfectivo).toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl md:rounded-[32px] border border-brand-100 flex flex-col items-center text-center soft-shadow-sm ring-4 ring-brand-50/30">
            <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest mb-1.5">Efectivo Físico</p>
            <p className="font-display font-bold text-brand-600 text-2xl tracking-tighter">S/ {currentCash.efectivoFisico.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl md:rounded-[32px] border border-slate-100 flex flex-col items-center text-center soft-shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diferencia Auditores</p>
            <p className={`font-display font-bold text-2xl tracking-tighter ${currentCash.diferencia === 0 ? 'text-slate-400' : currentCash.diferencia! > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {currentCash.diferencia! > 0 ? '+' : ''}{currentCash.diferencia?.toFixed(2)}
            </p>
            <span className="text-[6px] font-bold text-slate-400 uppercase mt-1">
              {currentCash.diferencia === 0 ? 'Cuadre Perfecto' : currentCash.diferencia! > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
            </span>
          </div>
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
          {isTodaySelected && currentUser?.role === 'ADMIN' ? (
            <button 
              onClick={() => reopenCash()}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-100"
            >
              Reabrir Caja para {selectedDate}
            </button>
          ) : isTodaySelected ? (
            <div className="px-6 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Registro Cerrado
            </div>
          ) : (
            <div className="px-6 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Registro Histórico
            </div>
          )}
        </div>
      )}

      {/* Daily Summary Compact */}
      <div className="flex flex-col xl:flex-row gap-3 md:gap-4 opacity-100 transition-opacity">
        <div className={`flex-1 bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 soft-shadow flex flex-col md:flex-row md:items-center gap-4 md:gap-6 relative overflow-hidden ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <div className="absolute top-0 left-0 w-20 h-20 md:w-24 md:h-24 bg-brand-50 rounded-full blur-2xl -translate-y-8 -translate-x-8" />
          <div className="shrink-0 relative z-10">
            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-brand-600 mb-0.5 md:mb-1">Caja Total</p>
            <div className="flex items-baseline gap-1 md:gap-1.5">
              <span className="text-lg md:text-xl font-display font-bold text-brand-600">S/</span>
              <span className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tighter">{totalCajaGlobal.toFixed(2)}</span>
            </div>
            <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Efectivo + Yape + Base</p>
          </div>
          
          <div className="h-px md:h-10 w-full md:w-px bg-slate-100 shrink-0" />

          <div className="flex flex-wrap items-center gap-4 md:gap-8 relative z-10 flex-1">
            <div className="flex flex-col">
              <p className="text-[7px] md:text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Caja Real (Efectivo)</p>
              <p className="font-display font-bold text-slate-900 text-xl md:text-2xl italic tracking-tighter">S/ {totalCajaEfectivo.toFixed(2)}</p>
              <p className="text-[6px] text-slate-400 font-bold uppercase">Solo Efectivo + Base</p>
            </div>
            <div className="flex flex-col opacity-60">
              <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Yape</p>
              <p className="font-display font-bold text-slate-800 text-base md:text-lg">S/ {(totalYapeVentas + totalYapeCobros).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className={`xl:w-[400px] bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-200 flex flex-col soft-shadow-sm max-h-[140px] md:max-h-[160px] ${(!currentCash || currentCash.estado === 'CERRADA') ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 md:mb-3">Flujo Reciente</p>
          <div className="space-y-1.5 md:space-y-2 overflow-y-auto no-scrollbar">
            {customerPaymentsTodayRaw.length === 0 ? (
              <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase py-1">Sin actividad</p>
            ) : (
              customerPaymentsTodayRaw.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/50 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl border border-white transition-colors">
                  <div className="flex flex-col">
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-700 truncate max-w-[120px] md:max-w-[150px] uppercase">{t.cliente}</p>
                    <span className="text-[6px] text-slate-400 font-black uppercase tracking-tighter">{t.metodoPago} • {t.hora}</span>
                  </div>
                  <p className="text-[10px] md:text-[11px] font-display font-bold text-emerald-600">+S/ {t.monto.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {currentCash && currentCash.estado === 'CERRADA' && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500 mb-6 grayscale-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-100 rounded-[22px] flex items-center justify-center text-amber-600 shadow-sm">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-display font-bold text-amber-900 uppercase tracking-tight text-lg mb-1">Caja Cerrada</h3>
              <p className="text-amber-700 text-xs font-medium leading-relaxed max-w-sm">La jornada ha finalizado. No se permiten más cobros ni modificaciones de pedidos para esta fecha.</p>
            </div>
          </div>
          {isTodaySelected && currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => reopenCash()}
              className="px-8 py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all active:scale-95 shadow-lg shadow-amber-200/50"
            >
              Reabrir Caja
            </button>
          )}
        </div>
      )}

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
              const totalPaid = (order.pagos || []).reduce((acc, p) => acc + p.monto, 0);
              const balance = Math.max(0, order.total - totalPaid);

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    if (isCashClosed) return;
                    setLiquidationOrderId(order.id);
                  }}
                  className={`bg-white rounded-[24px] p-3 md:p-4 shadow-sm border transition-all duration-300 relative overflow-hidden cursor-pointer hover:shadow-xl hover:border-brand-300 ${
                    isReadyToPay 
                      ? 'border-emerald-250 ring-4 ring-emerald-100/10 shadow-lg' 
                      : 'border-slate-100'
                  } flex flex-col md:flex-row items-center gap-4 justify-between w-full`}
                >
                  {/* Visual Status Indicator on Left edge */}
                  {!isReadyToPay && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200" />
                  )}
                  {isReadyToPay && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                  )}

                  {/* LEFT COLUMN: Ticket info, Mesa/Client and Mesero/Editar */}
                  <div className="flex flex-col gap-2 min-w-[180px] w-full md:w-auto shrink-0 pl-1">
                    {/* Ticket number and state */}
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider">
                        #{order.id.split('-').pop()}
                      </span>
                      {isReadyToPay ? (
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Listo</span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Cocina</span>
                      )}
                    </div>

                    {/* Mesa Circle Badge and CLIENT/MESERO */}
                    <div className="flex items-center gap-3">
                      {/* Circle badge */}
                      <div className="w-10 h-10 bg-brand-50/50 rounded-full flex items-center justify-center border border-brand-100 shrink-0">
                        <span className={`font-display font-extrabold text-brand-650 ${order.mesaId === '13' ? 'text-[8px] px-0.5 text-center leading-tight' : 'text-sm'}`}>
                          {order.mesaId === '13' ? 'PL' : (mesas.find(m => m.id === order.mesaId)?.nombre.replace(/mesa\s+/i, '') || order.mesaId)}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-display font-black text-slate-900 text-sm uppercase tracking-tight leading-none truncate max-w-[130px]">
                          {order.cliente}
                        </h3>
                        <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest leading-none mt-1.5 mb-1.5">
                          MESERO: {order.usuarioNombre || 'ADMINISTRADOR'}
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCashClosed) return;
                            setEditingOrderId(order.id);
                          }}
                          disabled={isCashClosed}
                          className={`flex items-center gap-1 text-[8px] font-black text-brand-600 uppercase hover:text-brand-700 transition-colors ${
                            isCashClosed ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Edit2 className="w-2.5 h-2.5" /> EDITAR / MOVER
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CENTER COLUMN: Consumo Plate List Frame */}
                  <div className="flex-1 bg-slate-50/40 rounded-[20px] p-2.5 md:p-3 border border-slate-100 flex flex-col justify-between w-full md:w-auto self-stretch min-h-[90px]">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-slate-100">
                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">
                          Consumo • {order.items.length} Platos
                        </p>
                        {/* Mini historical of payments */}
                        <div className="flex gap-1 overflow-x-auto no-scrollbar ml-2">
                          {(order.pagos || []).map((p) => (
                            <span key={p.id} className="text-[6.5px] font-black bg-white border border-slate-200 px-1 py-0.5 rounded-md text-slate-500 uppercase whitespace-nowrap">
                              {p.metodo === 'EFECTIVO' ? 'EF' : p.metodo === 'YAPE' ? 'YP' : p.metodo === 'PLIN' ? 'PL' : 'FI'}: {p.monto.toFixed(1)}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-1 overflow-y-auto max-h-[80px] pr-1.5 no-scrollbar">
                        {order.items.map((item) => {
                          const p = products.find(prod => prod.id === item.productoId);
                          return (
                            <div key={item.id} className="flex justify-between items-center text-[9px] py-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-100 shrink-0">
                                  {item.cantidad}
                                </span>
                                <span className="font-bold text-slate-700 uppercase tracking-tight truncate max-w-[150px]">
                                  {p?.nombre}
                                </span>
                              </div>
                              <span className="font-mono text-slate-400 text-[9px] tabular-nums font-bold">
                                {(item.cantidad * item.precioUnitario).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Liquidar Button & Big formatted total price label */}
                  <div className="flex flex-col items-center md:items-end justify-between min-w-[150px] w-full md:w-auto self-stretch gap-2.5 shrink-0">
                    {/* The LIQUIDAR CUENTA trigger button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLiquidationOrderId(order.id);
                      }}
                      disabled={!isReadyToPay || isCashClosed}
                      className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 duration-150 border-2 flex items-center justify-center gap-1.5 ${
                        isReadyToPay && !isCashClosed
                          ? 'bg-brand-600 border-brand-500 text-white hover:bg-brand-700 hover:border-brand-600 shadow-md shadow-brand-105/30 cursor-pointer'
                          : 'bg-slate-50 border-slate-150 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" /> LIQUIDAR CUENTA
                    </button>

                    {/* Separator / Divider decoration as shown in image */}
                    <div className="w-full h-[1px] bg-slate-100 hidden md:block" />

                    {/* Superb large elegant formatted price layout */}
                    <div className="flex justify-between md:justify-end items-center md:items-baseline gap-2 w-full md:w-auto">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest md:hidden">Saldo Pendiente:</p>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[11px] font-display font-extrabold text-emerald-600 uppercase">S/</span>
                        <p className="text-2xl font-display font-black text-slate-900 tracking-tighter leading-none">
                          {balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCloseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden p-8 space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-[24px] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Cierre de Auditoría</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">Compara el total calculado en sistema con el efectivo físico que tienes en caja.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Calculado en Sistema (Efectivo)</p>
                <p className="text-2xl font-display font-bold text-slate-900 tracking-tight">S/ {totalCajaEfectivo.toFixed(2)}</p>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Base: {baseCaja.toFixed(2)} + Ventas: {(totalEfectivoVentas + totalEfectivoCobros).toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Efectivo Físico Contado</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">S/</span>
                  <input 
                    autoFocus
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 pl-10 pr-4 text-2xl font-display font-bold outline-none focus:bg-white focus:border-brand-500 transition-all text-slate-800"
                    value={cashCounted}
                    onChange={(e) => setCashCounted(e.target.value)}
                  />
                </div>
              </div>

              {Number(cashCounted) !== totalCajaEfectivo && Number(cashCounted) > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${Number(cashCounted) > totalCajaEfectivo ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-tight leading-tight">
                    Diferencia: S/ {(Number(cashCounted) - totalCajaEfectivo).toFixed(2)} 
                    ({Number(cashCounted) > totalCajaEfectivo ? 'SOBRANTE' : 'FALTANTE'})
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => setShowCloseModal(false)}
                className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  closeCash(Number(cashCounted) || 0);
                  setShowCloseModal(false);
                }}
                className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95"
              >
                Confirmar Cierre
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
        {liquidationOrderId && liquidationOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 md:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto border border-slate-100 max-h-[90vh] md:max-h-[85vh]"
            >
              {/* LEFT COLUMN: Order Details / Split options */}
              <div className="flex-1 p-5 md:p-7 flex flex-col justify-between overflow-y-auto border-r border-slate-100 max-h-[50vh] md:max-h-[85vh] no-scrollbar">
                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-brand-100 inline-flex items-center gap-1.5 mb-2">
                        <Calculator className="w-3.5 h-3.5 text-brand-600" /> Liquidación de Cuenta
                      </span>
                      <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mt-1">
                        {liquidationOrder.cliente}
                      </h3>
                      <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mt-2">
                        Servicio por: <span className="text-slate-700">{liquidationOrder.usuarioNombre || 'Administrador'}</span> • {liquidationOrder.items.length} platos
                      </p>
                    </div>
                    <span className="bg-slate-900 text-white px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                      Mesa {getMesaNumber(liquidationOrder.mesaId)}
                    </span>
                  </div>

                  {/* Payment Modality Buttons */}
                  <div className="bg-slate-50/50 p-2.5 rounded-[24px] border border-slate-100 space-y-2.5">
                    <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">
                      Modalidad de Cobro/Pago
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'COMPLETO', label: 'Completo', desc: 'Pago total' },
                        { id: 'EQUITATIVO', label: 'Equitativo', desc: 'Dividir partes' },
                        { id: 'POR_PLATO', label: 'Por Plato', desc: 'Suma platos' },
                        { id: 'PERSONALIZADO', label: 'Monto Libre', desc: 'Monto mixto' }
                      ].map((mod) => (
                        <button
                          key={mod.id}
                          onClick={() => setLiquidationModality(mod.id as any)}
                          className={`p-2.5 rounded-[18px] border-2 flex flex-col items-center justify-center text-center transition-all active:scale-95 duration-150 cursor-pointer ${
                            liquidationModality === mod.id
                              ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-100/30'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50/10'
                          }`}
                        >
                          <span className="text-[9px] font-black uppercase tracking-tight leading-none mb-1.5 truncate w-full">{mod.label}</span>
                          <span className={`text-[6.5px] font-black uppercase tracking-widest leading-none truncate w-full ${liquidationModality === mod.id ? 'text-brand-100' : 'text-slate-450'}`}>
                            {mod.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modality Details Block */}
                  {liquidationModality === 'COMPLETO' && (
                    <div className="bg-brand-50/40 border border-brand-100 p-4 rounded-[20px] flex gap-3.5 items-start">
                      <div className="w-8 h-8 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0 mt-0.5">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-brand-700 uppercase tracking-widest">PAGO COMPLETO</p>
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                          Se cobrará la totalidad del saldo restante de la comanda en una sola transacción.
                        </p>
                      </div>
                    </div>
                  )}

                  {liquidationModality === 'EQUITATIVO' && (
                    <div className="bg-brand-50/30 border border-brand-100 p-4 rounded-[20px] space-y-3.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-brand-700 uppercase tracking-widest">DIVISIÓN EQUITATIVA</p>
                            <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide mt-0.5">Divide el saldo en partes iguales</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 p-1">
                          <button
                            onClick={() => setLiquidationSplitCount(prev => Math.max(1, prev - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-150 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-90 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-display font-black text-slate-800 text-sm">{liquidationSplitCount}</span>
                          <button
                            onClick={() => setLiquidationSplitCount(prev => Math.min(10, prev + 1))}
                            className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-150 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-90 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="h-[1px] bg-brand-100" />
                      
                      <div className="flex justify-between items-center bg-white px-3.5 py-2 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto de una parte:</p>
                        <p className="text-sm font-display font-bold text-slate-900">
                          S/ {(liquidationBalance / liquidationSplitCount).toFixed(2)} <span className="text-[10px] text-slate-450 lowercase font-bold font-sans">c/u</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {liquidationModality === 'POR_PLATO' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SELECCIONAR PLATOS A COBRAR</p>
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => {
                              const qtys: Record<string, number> = {};
                              liquidationOrder.items.forEach(item => {
                                qtys[item.id] = item.cantidad;
                              });
                              setLiquidationSelectedItems(qtys);
                            }}
                            className="text-[9px] font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest cursor-pointer"
                          >
                            Todos
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            onClick={() => {
                              const qtys: Record<string, number> = {};
                              liquidationOrder.items.forEach(item => {
                                qtys[item.id] = 0;
                              });
                              setLiquidationSelectedItems(qtys);
                            }}
                            className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest cursor-pointer"
                          >
                            Ninguno
                          </button>
                        </div>
                      </div>
                      
                      <div className="border border-slate-100 divide-y divide-slate-100/80 rounded-[20px] overflow-hidden max-h-[180px] overflow-y-auto no-scrollbar bg-slate-50/50">
                        {liquidationOrder.items.map((item) => {
                          const p = products.find(prod => prod.id === item.productoId);
                          const currentQtySelected = liquidationSelectedItems[item.id] || 0;
                          return (
                            <div key={item.id} className="p-3 flex justify-between items-center text-xs hover:bg-brand-50/10 transition-colors">
                              <div className="min-w-0 pr-3 flex-1">
                                <p className="font-bold text-slate-800 uppercase tracking-tight truncate leading-tight select-none">{p?.nombre}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1 select-none text-left">
                                  {item.cantidad} ordenado • S/ {item.precioUnitario.toFixed(2)} c/u
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-slate-500 select-none text-[11px] tabular-nums">
                                  S/ {(currentQtySelected * item.precioUnitario).toFixed(2)}
                                </span>
                                
                                <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 p-1">
                                  <button
                                    onClick={() => setLiquidationSelectedItems(prev => ({
                                      ...prev,
                                      [item.id]: Math.max(0, currentQtySelected - 1)
                                    }))}
                                    className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-150 text-slate-700 text-xs font-black shadow-sm flex items-center justify-center hover:bg-slate-100 active:scale-90 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="w-4 text-center font-bold text-slate-800 select-none">{currentQtySelected}</span>
                                  <button
                                    onClick={() => setLiquidationSelectedItems(prev => ({
                                      ...prev,
                                      [item.id]: Math.min(item.cantidad, currentQtySelected + 1)
                                    }))}
                                    className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-150 text-slate-700 text-xs font-black shadow-sm flex items-center justify-center hover:bg-slate-100 active:scale-90 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {liquidationModality === 'PERSONALIZADO' && (
                    <div className="bg-brand-50/30 border border-brand-100 p-4 rounded-[20px] space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-brand-700 uppercase tracking-widest">MONTO LIBRE / MIXTO</p>
                          <p className="text-[9.5px] font-black text-slate-400 tracking-wide mt-0.5 uppercase">Abona un monto a elección</p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">S/</span>
                        <input
                          type="number"
                          step="0.10"
                          placeholder="0.00"
                          className="w-full bg-white border-2 border-slate-200 rounded-xl py-2.5 pl-8 pr-3 text-lg font-black outline-none focus:border-brand-500 transition-all text-slate-800 text-left"
                          value={liquidationCustomAmount}
                          onChange={(e) => setLiquidationCustomAmount(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex gap-1.5">
                        {[0.25, 0.5, 0.75].map((pct) => {
                          const amt = (liquidationBalance * pct).toFixed(2);
                          return (
                            <button
                              key={pct}
                              onClick={() => setLiquidationCustomAmount(amt)}
                              className="px-2 py-1.5 bg-white hover:bg-slate-50 text-[9px] text-slate-600 font-bold border border-slate-200 rounded-lg grow shadow-sm cursor-pointer transition-colors"
                            >
                              {(pct * 100)}% (S/ {amt})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Consumo total summary table */}
                  <div className="border border-slate-100 rounded-[20px] p-4 bg-slate-50/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado de la cuenta completa</p>
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between text-slate-500">
                        <span>Total consumido:</span>
                        <span className="font-mono font-bold">S/ {liquidationOrder.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2.5">
                        <span>Abonos / Pagos registrados:</span>
                        <span className="text-emerald-600 font-bold font-mono">- S/ {liquidationTotalPaid.toFixed(2)}</span>
                      </div>

                      {/* Breakdown of split payments for high transparency */}
                      {liquidationOrder.pagos && liquidationOrder.pagos.length > 0 && (
                        <div className="bg-slate-100/65 rounded-xl p-2.5 space-y-1.5 text-[10.5px] border border-slate-200/40">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Historial de Transacciones:</p>
                          {liquidationOrder.pagos.map((p, pIdx) => (
                            <div key={pIdx} className="flex justify-between items-center text-slate-650 font-mono tracking-tight leading-none">
                              <span className="capitalize font-bold flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  p.metodo === 'EFECTIVO' ? 'bg-emerald-500' :
                                  p.metodo === 'YAPE' ? 'bg-brand-500' :
                                  p.metodo === 'PLIN' ? 'bg-cyan-500' : 'bg-amber-500'
                                }`} />
                                Pago {pIdx + 1} ({p.metodo.toLowerCase()})
                              </span>
                              <span className="font-bold">S/ {p.monto.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between text-slate-800 pt-1.5 text-sm font-black uppercase">
                        <span>Saldo Pendiente Actual:</span>
                        <span className="font-mono text-emerald-700 font-bold">S/ {liquidationBalance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-auto border-t border-slate-100">
                  <div className="p-4 bg-brand-950 text-white rounded-[24px] flex justify-between items-center shadow-lg shadow-brand-100/10 border border-brand-900 relative overflow-hidden">
                    {/* Background design elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-600 rounded-full blur-2xl opacity-40 translate-x-8 -translate-y-8" />
                    
                    <div className="relative z-10">
                      <p className="text-[8px] font-black text-brand-200 uppercase tracking-[0.2em] mb-1">Monto de cobro actual</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-brand-300">S/</span>
                        <p className="text-2xl font-display font-black tracking-tight leading-none tabular-nums">{liquidationAmountToPay.toFixed(2)}</p>
                      </div>
                    </div>
                    <span className="relative z-10 text-[9px] font-black bg-brand-600 border border-brand-500 px-3 py-1.5 rounded-xl uppercase tracking-wider text-white shadow-sm shadow-brand-900/40">
                      Instancia Seleccionada
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Payment Method Integration */}
              <div className="w-full md:w-[390px] p-5 md:p-7 flex flex-col justify-between bg-slate-50/80 max-h-[45vh] md:max-h-[85vh] overflow-y-auto no-scrollbar border-t md:border-t-0 border-slate-100">
                <div className="space-y-4">
                  <div>
                    <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-0.5">
                      Método de Pago
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'EFECTIVO', label: 'Efectivo', activeColor: 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-100/30' },
                        { id: 'YAPE', label: 'Yape', activeColor: 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-100/30' },
                        { id: 'PLIN', label: 'Plin', activeColor: 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-100/30' },
                        { id: 'CREDITO', label: 'Fiar Cuenta', activeColor: 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-100/30' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setLiquidationMethod(item.id as any)}
                          className={`p-3.5 rounded-[20px] border-2 font-black uppercase text-[10px] tracking-wider text-center transition-all duration-150 flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                            liquidationMethod === item.id ? item.activeColor : `bg-white border-slate-150 text-slate-600 hover:border-slate-300 hover:bg-slate-50`
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash received sub-panel */}
                  {liquidationMethod === 'EFECTIVO' && (
                    <div className="bg-white border border-slate-150 p-4 rounded-[22px] space-y-3.5 shadow-sm">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-0.5">
                          Dinero Recibido
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">S/</span>
                          <input
                            autoFocus
                            type="number"
                            step="0.5"
                            placeholder="0.00"
                            className="w-full bg-slate-50/50 border-2 border-slate-200 rounded-xl py-2 pl-8 pr-3 text-lg font-black outline-none focus:bg-white focus:border-emerald-500 transition-all text-slate-800 text-left"
                            value={liquidationCashReceived}
                            onChange={(e) => setLiquidationCashReceived(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Cash quick buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <button
                          onClick={() => setLiquidationCashReceived(liquidationAmountToPay.toFixed(2))}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors border border-slate-200 cursor-pointer"
                        >
                          Cobro Exacto
                        </button>
                        {[10, 20, 50, 100, 200].map((bill) => (
                          <button
                            key={bill}
                            onClick={() => setLiquidationCashReceived(bill.toFixed(2))}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-lg transition-colors border border-emerald-100/50 cursor-pointer"
                          >
                            S/ {bill}
                          </button>
                        ))}
                      </div>

                      {/* Cash change computation */}
                      {(() => {
                        const valA = liquidationAmountToPay;
                        const valB = parseFloat(liquidationCashReceived) || 0;
                        const diff = valB - valA;
                        const isInsufficient = valB > 0 && valB < valA;
                        const isExact = valB === 0 || !liquidationCashReceived || Math.abs(diff) < 0.001;

                        return (
                          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 flex flex-col justify-center items-center text-center space-y-1">
                            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Vuelto a entregar</p>
                            {isInsufficient ? (
                              <p className="text-xs font-black text-rose-500 uppercase tracking-tight">Faltan S/ {Math.abs(diff).toFixed(2)}</p>
                            ) : isExact ? (
                              <p className="text-sm font-extrabold text-slate-600">S/ 0.00</p>
                            ) : (
                              <p className="text-xl font-display font-black text-emerald-600 underline decoration-emerald-250 decoration-2 underline-offset-4">S/ {diff.toFixed(2)}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Yape instructions */}
                  {liquidationMethod === 'YAPE' && (
                    <div className="bg-white border border-slate-150 p-5 rounded-[22px] text-center space-y-2.5 shadow-sm py-6">
                      <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mx-auto mb-1 border border-brand-100">
                        <Coins className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black text-brand-900 uppercase tracking-widest">PAGO POR YAPE</p>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Pídale al cliente escanear el código QR Yape o realizar el pago por transferencia.
                      </p>
                      <div className="bg-brand-50/50 py-1.5 px-3 rounded-xl font-mono text-[11px] text-brand-700 font-bold max-w-max mx-auto border border-brand-100">
                        Monto: S/ {liquidationAmountToPay.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {liquidationMethod === 'PLIN' && (
                    <div className="bg-white border border-slate-150 p-5 rounded-[22px] text-center space-y-2.5 shadow-sm py-6">
                      <div className="w-10 h-10 bg-cyan-50 text-cyan-700 rounded-xl flex items-center justify-center mx-auto mb-1 border border-cyan-100">
                        <Coins className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black text-cyan-900 uppercase tracking-widest">PAGO POR PLIN</p>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        Acepta pagos interbancarios mediante Plin. Valide la recepción en su banca móvil correspondiente.
                      </p>
                      <div className="bg-cyan-50/50 py-1.5 px-3 rounded-xl font-mono text-[11px] text-cyan-750 font-bold max-w-max mx-auto border border-cyan-100">
                        Monto: S/ {liquidationAmountToPay.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Fiar a Cuenta Customer list */}
                  {liquidationMethod === 'CREDITO' && (
                    <div className="bg-white border border-slate-150 p-4 rounded-[22px] space-y-3.5 shadow-sm flex flex-col max-h-[300px]">
                      <div>
                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Cliente Cuenta/Crédito</p>
                        <p className="text-[8.5px] text-slate-400 uppercase font-black tracking-wide">Selecciona cliente asociado</p>
                      </div>

                      {liquidationSelectedCustomer ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center transition-all">
                          <div>
                            <p className="text-xs font-black text-slate-800">{liquidationSelectedCustomer.nombre}</p>
                            <p className="text-[8.5px] text-slate-500 font-black uppercase tracking-widest mt-1">
                              Saldo actual: <span className="text-emerald-600 font-black">S/ {liquidationSelectedCustomer.saldo.toFixed(2)}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => setLiquidationSelectedCustomer(null)}
                            className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 flex-1 flex flex-col min-h-0">
                          <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-[11px] font-bold focus:border-brand-500 focus:bg-white outline-none transition-all"
                              placeholder="Buscar cliente por nombre..."
                              value={liquidationCustomerSearch}
                              onChange={(e) => setLiquidationCustomerSearch(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1 overflow-y-auto max-h-[140px] pr-1.5 no-scrollbar flex-1">
                            {customers
                              .filter(c => c.nombre.toLowerCase().includes(liquidationCustomerSearch.toLowerCase()))
                              .map(cust => (
                                <button
                                  key={cust.id}
                                  onClick={() => setLiquidationSelectedCustomer({
                                    id: cust.id,
                                    nombre: cust.nombre,
                                    saldo: cust.saldo
                                  })}
                                  className="w-full p-2.5 bg-white border border-slate-100 rounded-xl flex justify-between items-center hover:border-brand-200 hover:bg-brand-50/20 active:scale-95 transition-all text-left cursor-pointer"
                                >
                                  <div>
                                    <p className="text-[11px] font-black text-slate-700">{cust.nombre}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Saldo: S/ {cust.saldo.toFixed(1)}</p>
                                  </div>
                                  <span className="text-[8px] text-brand-600 font-black uppercase bg-brand-50 px-1.5 py-0.5 rounded-md">Asociar</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer validation trigger */}
                <div className="pt-4 md:pt-6 border-t border-slate-200 mt-4 space-y-3 shrink-0">
                  <div className="flex justify-between items-center text-[10px] px-1 font-black text-slate-400 uppercase tracking-widest">
                    <span>Monto a liquidar:</span>
                    <span className="font-extrabold text-slate-900 text-sm font-mono">S/ {liquidationAmountToPay.toFixed(2)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setLiquidationOrderId(null)}
                      className="py-3.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={executeLiquidationPayment}
                      disabled={
                        liquidationAmountToPay <= 0 ||
                        (liquidationMethod === 'CREDITO' && !liquidationSelectedCustomer) ||
                        (liquidationMethod === 'EFECTIVO' && parseFloat(liquidationCashReceived) > 0 && parseFloat(liquidationCashReceived) < liquidationAmountToPay)
                      }
                      className="py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 font-black uppercase text-[10px] tracking-widest text-white rounded-xl shadow-lg shadow-emerald-100/30 hover:shadow-emerald-150/40 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Procesar Pago
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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

        {efectivoModalFor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 md:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden mx-auto"
            >
              <div className="px-4 py-3.5 md:px-6 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Coins className="w-4 md:w-5 h-4 md:h-5 text-emerald-500" />
                    Pago en Efectivo
                  </h3>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {efectivoModalFor.cliente} • Ticket #{efectivoModalFor.id.split('-').pop()}
                  </p>
                </div>
                <button 
                  onClick={() => setEfectivoModalFor(null)} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4">
                {/* Monto a pagar */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                    Monto a Pagar
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-xs md:text-sm">S/</span>
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 md:py-2.5 pl-8 md:pl-9 pr-3 text-sm md:text-base font-extrabold outline-none focus:bg-white focus:border-brand-500 transition-all text-slate-800"
                      value={efectivoMontoAPagar}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setEfectivoMontoAPagar('');
                          return;
                        }
                        const numVal = parseFloat(val);
                        if (numVal > efectivoModalFor.balance) {
                          setEfectivoMontoAPagar(efectivoModalFor.balance.toFixed(2));
                        } else if (numVal < 0) {
                          setEfectivoMontoAPagar('0.00');
                        } else {
                          setEfectivoMontoAPagar(val);
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[8.5px] text-slate-400 font-extrabold uppercase px-0.5 mt-0.5">
                    <span>Saldo pendiente: S/ {efectivoModalFor.balance.toFixed(2)}</span>
                    <button 
                      onClick={() => setEfectivoMontoAPagar(efectivoModalFor.balance.toFixed(2))}
                      className="text-brand-600 hover:text-brand-700 font-black uppercase tracking-wider"
                    >
                      Pagar total
                    </button>
                  </div>
                </div>

                {/* Dinero Recibido */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                    Efectivo Recibido
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-xs md:text-sm">S/</span>
                    <input 
                      autoFocus
                      type="number"
                      step="0.5"
                      placeholder="0.00"
                      className="w-full bg-emerald-50/20 border-2 border-emerald-500/10 rounded-xl py-2.5 md:py-3 pl-8 md:pl-9 pr-3 text-base md:text-lg font-extrabold outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all text-slate-800 text-left"
                      value={efectivoDineroRecibido}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setEfectivoDineroRecibido('');
                        } else {
                          setEfectivoDineroRecibido(val);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Quick cash bills selection */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <button 
                      onClick={() => setEfectivoDineroRecibido(parseFloat(efectivoMontoAPagar || '0').toFixed(2))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] md:text-[9.5px] font-extrabold uppercase tracking-tight rounded-lg transition-colors border border-slate-200"
                    >
                      Exacto
                    </button>
                    {[10, 20, 50, 100, 200].map((bill) => (
                      <button
                        key={bill}
                        onClick={() => {
                          setEfectivoDineroRecibido(bill.toFixed(2));
                        }}
                        className="px-2.5 py-1 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-[9px] md:text-[9.5px] font-extrabold rounded-lg transition-colors border border-emerald-100"
                      >
                        S/ {bill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vuelto / Cambio */}
                {(() => {
                  const valA = parseFloat(efectivoMontoAPagar) || 0;
                  const valB = parseFloat(efectivoDineroRecibido) || 0;
                  const diff = valB - valA;
                  const isInsufficient = valB > 0 && valB < valA;
                  const isExact = valB === 0 || !efectivoDineroRecibido || Math.abs(diff) < 0.001;

                  return (
                    <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center space-y-0.5">
                      <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                        Vuelto a Entregar
                      </p>
                      
                      {isInsufficient ? (
                        <div className="space-y-0.5">
                          <p className="text-base md:text-lg font-sans font-extrabold text-rose-500 tracking-tight">
                            Dinero Insuficiente
                          </p>
                          <p className="text-[8.5px] md:text-[9px] font-black text-rose-400 uppercase tracking-tight">
                            Faltan S/ {Math.abs(diff).toFixed(2)}
                          </p>
                        </div>
                      ) : isExact ? (
                        <div className="space-y-0.5">
                          <p className="text-xl md:text-2xl font-sans font-extrabold text-slate-600 tracking-tight">
                            S/ 0.00
                          </p>
                          <p className="text-[8.5px] md:text-[9px] font-black text-slate-400 uppercase tracking-tight">
                            Monto exacto (No requiere vuelto)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-2xl md:text-3xl font-sans font-extrabold text-emerald-600 tracking-tight">
                            S/ {diff.toFixed(2)}
                          </p>
                          <p className="text-[8.5px] md:text-[9px] font-black text-emerald-500 uppercase tracking-wider">
                            Entregar vuelto al cliente
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button 
                    onClick={() => setEfectivoModalFor(null)}
                    className="py-2.5 md:py-3.5 bg-slate-100 text-slate-500 rounded-xl font-extrabold uppercase text-[10px] tracking-wider hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      const amount = parseFloat(efectivoMontoAPagar);
                      if (amount > 0) {
                        const finalAmount = Math.min(amount, efectivoModalFor.balance);
                        payOrder(efectivoModalFor.id, 'EFECTIVO', finalAmount);
                        setPartialAmounts(prev => {
                          const next = { ...prev };
                          delete next[efectivoModalFor.id];
                          return next;
                        });
                        setEfectivoModalFor(null);
                      }
                    }}
                    disabled={
                      !efectivoMontoAPagar || 
                      parseFloat(efectivoMontoAPagar) <= 0 || 
                      ((parseFloat(efectivoDineroRecibido) || 0) > 0 && (parseFloat(efectivoDineroRecibido) || 0) < (parseFloat(efectivoMontoAPagar) || 0))
                    }
                    className="py-2.5 md:py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-100 text-white rounded-xl font-extrabold uppercase text-[10px] tracking-wider shadow-md shadow-emerald-100/50 hover:shadow-emerald-200/50 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar Pago
                  </button>
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
           <table className="w-full text-left border-collapse min-w-[850px]">
             <thead>
               <tr className="bg-slate-50/60 border-b border-slate-100">
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pedido</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Mesa</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Comensal</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100/80 bg-slate-50/30">metodo</th>
                 <th className="px-4 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right border-l border-slate-100/80 bg-slate-50/30">parcial</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100/80 text-center">Total</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100/80 text-center">Estado</th>
                 <th className="px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100/80 text-center">hora de pago</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 animate-fade-in">
               {orderSummary.map((order) => {
                 const shortId = order.id.split('-').pop() || '';
                 const parsedNum = parseInt(shortId, 10);
                 const formattedId = !isNaN(parsedNum) ? String(parsedNum).padStart(3, '0') : shortId;

                 const totalQty = (order.items || []).reduce((acc, item) => acc + item.cantidad, 0);

                 const paymentsList = (order.pagos && order.pagos.length > 0)
                   ? order.pagos
                   : (order.estado === 'PAGADO'
                       ? [{ id: `fallback-${order.id}-pay`, metodo: order.metodoPago || 'EFECTIVO', monto: order.total, hora: order.hora }]
                       : order.estado === 'CREDITO'
                         ? [{ id: `fallback-${order.id}-cred`, metodo: 'CREDITO', monto: order.total, hora: order.hora }]
                         : [{ id: `fallback-${order.id}-open`, metodo: 'PENDIENTE', monto: 0, hora: '-' }]
                     );

                 return (
                   <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                     {/* Pedido */}
                     <td className="px-4 py-3 text-[11px] font-bold text-slate-500 tracking-wider font-mono text-center">
                       #{formattedId}
                     </td>

                     {/* Mesa */}
                     <td className="px-4 py-3 text-center">
                       <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100/80 text-xs font-display font-black text-slate-700 border border-slate-150">
                         {getMesaNumber(order.mesaId)}
                       </span>
                     </td>

                     {/* Comensal */}
                     <td className="px-5 py-3">
                       <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-800 uppercase truncate max-w-[155px]">
                           {order.cliente}
                         </span>
                         <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                           Por: {order.usuarioNombre || 'Administrador'}
                         </span>
                       </div>
                     </td>

                     {/* Cant. */}
                     <td className="px-4 py-3 text-center">
                       <span className="text-[11px] font-black text-slate-600 bg-slate-100/60 px-2.5 py-1 rounded-lg border border-slate-150/40 shadow-sm">
                         {totalQty}
                       </span>
                     </td>

                     {/* Metodo stacked row subdivision */}
                     <td className="p-0 border-l border-slate-100 bg-slate-50/10">
                       <div className="flex flex-col h-full divide-y divide-slate-100">
                         {paymentsList.map((p, idx) => (
                           <div key={p.id || idx} className="px-4 h-11 flex items-center justify-center">
                             <span className={`text-[9.5px] font-extrabold uppercase tracking-widest text-center min-w-[75px] ${getMetodoBadgeStyle(p.metodo)}`}>
                               {p.metodo.toLowerCase()}
                             </span>
                           </div>
                         ))}
                       </div>
                     </td>

                     {/* Parcial stacked row subdivision */}
                     <td className="p-0 border-l border-slate-100 bg-slate-50/10 text-right">
                       <div className="flex flex-col h-full divide-y divide-slate-100">
                         {paymentsList.map((p, idx) => (
                           <div key={p.id || idx} className="px-4 h-11 flex items-center justify-end text-xs font-mono font-bold text-slate-600 min-w-[70px]">
                             {p.monto.toFixed(2)}
                           </div>
                         ))}
                       </div>
                     </td>

                     {/* Total */}
                     <td className="px-5 py-3 text-xs font-display font-black text-slate-800 tracking-tight text-center border-l border-slate-100">
                       S/ {order.total.toFixed(2)}
                     </td>

                     {/* Estado */}
                     <td className="px-5 py-3 text-center border-l border-slate-100">
                       <span className={`text-[8.5px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest leading-none ${
                          order.estado === 'PAGADO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 
                          order.estado === 'CREDITO' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' : 
                          order.estado === 'CANCELADO' ? 'bg-rose-50 text-rose-500 border border-rose-100/50' : 
                          'bg-slate-100 text-slate-500 border border-slate-200/50'
                        }`}>
                         {order.estado === 'CREDITO' ? 'CRÉDITO' : order.estado}
                       </span>
                     </td>

                     {/* Hora de Pago */}
                     <td className="p-0 border-l border-slate-100 text-center">
                       <div className="flex flex-col h-full divide-y divide-slate-100">
                         {paymentsList.map((p, idx) => (
                           <div key={p.id || idx} className="px-4 h-11 flex items-center justify-center text-[10px] font-mono text-slate-400 font-bold min-w-[85px]">
                             {p.hora || order.hora || '-'}
                           </div>
                         ))}
                       </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>

           </table>
        </div>
      </div>
    </div>
  );
};
