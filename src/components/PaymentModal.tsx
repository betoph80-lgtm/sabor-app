/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext.tsx';
import { X, Search, Coins, Calculator, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface PaymentModalProps {
  orderId: string;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ orderId, onClose }) => {
  const { orders, payOrder, products, customers, mesas } = useApp();

  const [modality, setModality] = useState<'COMPLETO' | 'EQUITATIVO' | 'POR_PLATO' | 'PERSONALIZADO'>('COMPLETO');
  const [splitCount, setSplitCount] = useState<number>(2);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<'EFECTIVO' | 'YAPE' | 'PLIN' | 'CREDITO'>('EFECTIVO');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; nombre: string; saldo: number } | null>(null);

  const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId]);

  const mesaLabel = useMemo(() => {
    if (!order) return '';
    if (order.mesaId === '13') return 'Para Llevar';
    const foundMesa = mesas.find(m => m.id === order.mesaId);
    return foundMesa ? foundMesa.nombre : `Mesa ${order.mesaId}`;
  }, [order, mesas]);

  const totalPaid = useMemo(() => {
    return (order?.pagos || []).reduce((acc, p) => acc + p.monto, 0);
  }, [order]);

  const balance = useMemo(() => {
    return order ? Math.max(0, order.total - totalPaid) : 0;
  }, [order, totalPaid]);

  const amountToPay = useMemo(() => {
    let amt = 0;
    if (modality === 'COMPLETO') {
      amt = balance;
    } else if (modality === 'EQUITATIVO') {
      amt = balance / Math.max(1, splitCount);
    } else if (modality === 'POR_PLATO') {
      amt = order?.items.reduce((acc, item) => {
        const selectedQty = selectedItems[item.id] || 0;
        return acc + (selectedQty * item.precioUnitario);
      }, 0) || 0;
    } else if (modality === 'PERSONALIZADO') {
      amt = parseFloat(customAmount) || 0;
    }
    return Math.min(amt, balance);
  }, [modality, balance, splitCount, order, selectedItems, customAmount]);

  useEffect(() => {
    if (order) {
      setModality('COMPLETO');
      setSplitCount(2);
      setMethod('EFECTIVO');
      setCashReceived('');
      setCustomAmount('');
      setCustomerSearch('');
      setSelectedCustomer(null);
      const initQtys: Record<string, number> = {};
      order.items.forEach(item => {
        initQtys[item.id] = 0;
      });
      setSelectedItems(initQtys);
    }
  }, [orderId]);

  if (!order) return null;

  const handleExecutePayment = async () => {
    if (amountToPay <= 0) return;

    let targetCustomerId: string | undefined = undefined;
    if (method === 'CREDITO') {
      if (!selectedCustomer) {
        alert('Por favor, selecciona un cliente para fiar a cuenta.');
        return;
      }
      targetCustomerId = selectedCustomer.id;
    }

    try {
      await payOrder(order.id, method, amountToPay, targetCustomerId);

      const updatedOrder = orders.find(o => o.id === order.id);
      const newTotalPaid = [...(updatedOrder?.pagos || []), { id: 'temp', metodo: method, monto: amountToPay }].reduce((acc, p) => acc + p.monto, 0);
      const newBalance = Math.max(0, (updatedOrder?.total || 0) - newTotalPaid);

      if (newBalance <= 0.01) {
        onClose();
      } else {
        setCashReceived('');
        if (modality === 'POR_PLATO') {
          const resetQtys: Record<string, number> = {};
          order.items.forEach(item => {
            resetQtys[item.id] = 0;
          });
          setSelectedItems(resetQtys);
        } else if (modality === 'EQUITATIVO') {
          setSplitCount(prev => Math.max(1, prev - 1));
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Error al registrar el pago: ' + (err.message || String(err)));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 md:px-8 md:py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-display font-black text-sm md:text-base">
              S/
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Cobro de Pedido
                </span>
                <span className="text-[10px] md:text-[11px] font-mono font-bold text-slate-400">
                  #{order.id.split('-').pop()}
                </span>
              </div>
              <h3 className="text-base md:text-xl font-display font-black text-slate-900 uppercase tracking-tight">
                {mesaLabel} • {order.cliente || 'CONSUMIDOR FINAL'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 md:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col md:flex-row overflow-y-auto no-scrollbar flex-1">
          {/* LEFT COLUMN: Modality & Amount Selection */}
          <div className="flex-1 p-5 md:p-7 space-y-5 border-b md:border-b-0 md:border-r border-slate-100">
            <div>
              <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-0.5">
                Modalidad de Cobro
              </p>
              <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                {[
                  { id: 'COMPLETO', label: 'Completo', desc: 'Pago total' },
                  { id: 'EQUITATIVO', label: 'Dividido', desc: 'Partes iguales' },
                  { id: 'POR_PLATO', label: 'Por Plato', desc: 'Suma platos' },
                  { id: 'PERSONALIZADO', label: 'Monto Libre', desc: 'Monto mixto' }
                ].map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => setModality(mod.id as any)}
                    className={`p-2.5 rounded-[18px] border-2 flex flex-col items-center justify-center text-center transition-all active:scale-95 duration-150 cursor-pointer ${
                      modality === mod.id
                        ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-100/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50/10'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-tight leading-none mb-1 truncate w-full">{mod.label}</span>
                    <span className={`text-[6.5px] font-black uppercase tracking-widest leading-none truncate w-full ${modality === mod.id ? 'text-brand-100' : 'text-slate-400'}`}>
                      {mod.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Modality Details Block */}
            {modality === 'COMPLETO' && (
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

            {modality === 'EQUITATIVO' && (
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
                      onClick={() => setSplitCount(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-150 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-90 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-display font-black text-slate-800 text-sm">{splitCount}</span>
                    <button
                      onClick={() => setSplitCount(prev => Math.min(10, prev + 1))}
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
                    S/ {(balance / Math.max(1, splitCount)).toFixed(2)} <span className="text-[10px] text-slate-450 lowercase font-bold font-sans">c/u</span>
                  </p>
                </div>
              </div>
            )}

            {modality === 'POR_PLATO' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SELECCIONAR PLATOS A COBRAR</p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        const qtys: Record<string, number> = {};
                        order.items.forEach(item => {
                          qtys[item.id] = item.cantidad;
                        });
                        setSelectedItems(qtys);
                      }}
                      className="text-[9px] font-black text-brand-600 hover:text-brand-700 uppercase tracking-widest cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={() => {
                        const qtys: Record<string, number> = {};
                        order.items.forEach(item => {
                          qtys[item.id] = 0;
                        });
                        setSelectedItems(qtys);
                      }}
                      className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                
                <div className="border border-slate-100 divide-y divide-slate-100/80 rounded-[20px] overflow-hidden max-h-[180px] overflow-y-auto no-scrollbar bg-slate-50/50">
                  {order.items.map((item) => {
                    const p = products.find(prod => prod.id === item.productoId);
                    const currentQtySelected = selectedItems[item.id] || 0;
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
                              onClick={() => setSelectedItems(prev => ({
                                ...prev,
                                [item.id]: Math.max(0, currentQtySelected - 1)
                              }))}
                              className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-150 text-slate-700 text-xs font-black shadow-sm flex items-center justify-center hover:bg-slate-100 active:scale-90 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-bold text-slate-800 select-none">{currentQtySelected}</span>
                            <button
                              onClick={() => setSelectedItems(prev => ({
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

            {modality === 'PERSONALIZADO' && (
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
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-1.5">
                  {[0.25, 0.5, 0.75].map((pct) => {
                    const amt = (balance * pct).toFixed(2);
                    return (
                      <button
                        key={pct}
                        onClick={() => setCustomAmount(amt)}
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
            <div className="border border-slate-100 rounded-[20px] p-4 bg-slate-50/50 space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado de la cuenta completa</p>
              <div className="space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Total consumido:</span>
                  <span className="font-mono font-bold">S/ {order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2">
                  <span>Abonos / Pagos registrados:</span>
                  <span className="text-emerald-600 font-bold font-mono">- S/ {totalPaid.toFixed(2)}</span>
                </div>

                {order.pagos && order.pagos.length > 0 && (
                  <div className="bg-slate-100/65 rounded-xl p-2.5 space-y-1 text-[10.5px] border border-slate-200/40 my-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Historial de Transacciones:</p>
                    {order.pagos.map((p, pIdx) => (
                      <div key={pIdx} className="flex justify-between items-center text-slate-600 font-mono tracking-tight leading-none">
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
                <div className="flex justify-between text-slate-800 pt-1 text-sm font-black uppercase">
                  <span>Saldo Pendiente Actual:</span>
                  <span className="font-mono text-emerald-700 font-bold">S/ {balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-brand-950 text-white rounded-[24px] flex justify-between items-center shadow-lg border border-brand-900 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[8px] font-black text-brand-200 uppercase tracking-[0.2em] mb-1">Monto de cobro actual</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-brand-300">S/</span>
                  <p className="text-2xl font-display font-black tracking-tight leading-none tabular-nums">{amountToPay.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Payment Method Integration */}
          <div className="w-full md:w-[390px] p-5 md:p-7 flex flex-col justify-between bg-slate-50/80 border-t md:border-t-0 border-slate-100">
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
                      onClick={() => setMethod(item.id as any)}
                      className={`p-3.5 rounded-[20px] border-2 font-black uppercase text-[10px] tracking-wider text-center transition-all duration-150 flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                        method === item.id ? item.activeColor : `bg-white border-slate-150 text-slate-600 hover:border-slate-300 hover:bg-slate-50`
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash received sub-panel */}
              {method === 'EFECTIVO' && (
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
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cash quick buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      onClick={() => setCashReceived(amountToPay.toFixed(2))}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    >
                      Cobro Exacto
                    </button>
                    {[10, 20, 50, 100, 200].map((bill) => (
                      <button
                        key={bill}
                        onClick={() => setCashReceived(bill.toFixed(2))}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-lg transition-colors border border-emerald-100/50 cursor-pointer"
                      >
                        S/ {bill}
                      </button>
                    ))}
                  </div>

                  {/* Cash change computation */}
                  {(() => {
                    const valA = amountToPay;
                    const valB = parseFloat(cashReceived) || 0;
                    const diff = valB - valA;
                    const isInsufficient = valB > 0 && valB < valA;
                    const isExact = valB === 0 || !cashReceived || Math.abs(diff) < 0.001;

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
              {method === 'YAPE' && (
                <div className="bg-white border border-slate-150 p-5 rounded-[22px] text-center space-y-2.5 shadow-sm py-6">
                  <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mx-auto mb-1 border border-brand-100">
                    <Coins className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-black text-brand-900 uppercase tracking-widest">PAGO POR YAPE</p>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Pídale al cliente escanear el código QR Yape o realizar el pago por transferencia.
                  </p>
                  <div className="bg-brand-50/50 py-1.5 px-3 rounded-xl font-mono text-[11px] text-brand-700 font-bold max-w-max mx-auto border border-brand-100">
                    Monto: S/ {amountToPay.toFixed(2)}
                  </div>
                </div>
              )}

              {method === 'PLIN' && (
                <div className="bg-white border border-slate-150 p-5 rounded-[22px] text-center space-y-2.5 shadow-sm py-6">
                  <div className="w-10 h-10 bg-cyan-50 text-cyan-700 rounded-xl flex items-center justify-center mx-auto mb-1 border border-cyan-100">
                    <Coins className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-black text-cyan-900 uppercase tracking-widest">PAGO POR PLIN</p>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Acepta pagos interbancarios mediante Plin. Valide la recepción en su banca móvil correspondiente.
                  </p>
                  <div className="bg-cyan-50/50 py-1.5 px-3 rounded-xl font-mono text-[11px] text-cyan-800 font-bold max-w-max mx-auto border border-cyan-100">
                    Monto: S/ {amountToPay.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Fiar a Cuenta Customer list */}
              {method === 'CREDITO' && (
                <div className="bg-white border border-slate-150 p-4 rounded-[22px] space-y-3.5 shadow-sm flex flex-col max-h-[280px]">
                  <div>
                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Cliente Cuenta/Crédito</p>
                    <p className="text-[8.5px] text-slate-400 uppercase font-black tracking-wide">Selecciona cliente asociado</p>
                  </div>

                  {selectedCustomer ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center transition-all">
                      <div>
                        <p className="text-xs font-black text-slate-800">{selectedCustomer.nombre}</p>
                        <p className="text-[8.5px] text-slate-500 font-black uppercase tracking-widest mt-1">
                          Saldo actual: <span className="text-emerald-600 font-black">S/ {selectedCustomer.saldo.toFixed(2)}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
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
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1 overflow-y-auto max-h-[130px] pr-1.5 no-scrollbar flex-1">
                        {customers
                          .filter(c => c.nombre.toLowerCase().includes(customerSearch.toLowerCase()))
                          .map(cust => (
                            <button
                              key={cust.id}
                              onClick={() => setSelectedCustomer({
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

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-200 mt-4 space-y-3 shrink-0">
              <div className="flex justify-between items-center text-[10px] px-1 font-black text-slate-400 uppercase tracking-widest">
                <span>Monto a liquidar:</span>
                <span className="font-extrabold text-slate-900 text-sm font-mono">S/ {amountToPay.toFixed(2)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onClose}
                  className="py-3.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleExecutePayment}
                  disabled={
                    amountToPay <= 0 ||
                    (method === 'CREDITO' && !selectedCustomer) ||
                    (method === 'EFECTIVO' && parseFloat(cashReceived) > 0 && parseFloat(cashReceived) < amountToPay)
                  }
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-emerald-100 active:scale-95 cursor-pointer"
                >
                  Cobrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
