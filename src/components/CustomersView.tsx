/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { User, Plus, Search, Receipt, Wallet, ArrowUpRight, ArrowDownLeft, X, Edit2, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer } from '../types';

export const CustomersView: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, addTransaction, deleteTransaction, updateTransaction, requestConfirmation, isTodaySelected, selectedDate } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  
  // Helper to compare dates in DD/MM/YYYY format
  const toSortableDate = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length < 3) return 0;
    // YYYYMMDD
    return parseInt(parts[2] + parts[1].padStart(2, '0') + parts[0].padStart(2, '0'));
  };

  const selectedDateVal = toSortableDate(selectedDate);

  const getCustomerSaldoAtDate = (customer: Customer) => {
    return (customer.historial || []).reduce((acc, tx) => {
      if (toSortableDate(tx.fecha) <= selectedDateVal) {
        return acc + tx.monto;
      }
      return acc;
    }, 0);
  };

  const filteredCustomers = (customers || []).filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.documento?.includes(searchTerm)
  );

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;
  
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  
  // Edit Customer States
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({ nombre: '', documento: '', telefono: '' });
  
  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({ nombre: '', documento: '', telefono: '' });
  
  // New Transaction Form State
  const [newTransaction, setNewTransaction] = useState({ 
    type: 'DEPOSITO' as 'DEPOSITO' | 'PAGO_CREDITO', 
    amount: 0, 
    description: '',
    metodoPago: 'EFECTIVO' as 'EFECTIVO' | 'YAPE'
  });

  // Edit Transaction State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxData, setEditTxData] = useState({ amount: 0, description: '' });

  const handleStartEditTx = (tx: any) => {
    setEditingTxId(tx.id);
    setEditTxData({ amount: Math.abs(tx.monto), description: tx.descripcion });
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.nombre) return;
    addCustomer(newCustomer);
    setNewCustomer({ nombre: '', documento: '', telefono: '' });
    setShowAddCustomer(false);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || newTransaction.amount <= 0) return;
    addTransaction(selectedCustomer.id, {
      tipo: newTransaction.type as any,
      monto: newTransaction.amount,
      descripcion: newTransaction.description || (newTransaction.type === 'DEPOSITO' ? 'Depósito de saldo' : 'Pago de deuda'),
      metodoPago: newTransaction.metodoPago
    });
    setNewTransaction({ type: 'DEPOSITO', amount: 0, description: '', metodoPago: 'EFECTIVO' });
    setShowAddTransaction(false);
  };

  const handleStartEdit = () => {
    if (!selectedCustomer) return;
    setEditingData({
      nombre: selectedCustomer.nombre,
      documento: selectedCustomer.documento || '',
      telefono: selectedCustomer.telefono || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !editingData.nombre) return;
    
    updateCustomer(selectedCustomer.id, editingData);
    setIsEditing(false);
  };

  const handleDeleteCustomer = () => {
    if (!selectedCustomer) return;
    requestConfirmation(
      'Eliminar Cliente',
      `¿Deseas eliminar a ${selectedCustomer.nombre}? Se perderá todo su historial y saldo de S/ ${selectedCustomer.saldo.toFixed(2)}.`,
      () => {
        deleteCustomer(selectedCustomer.id);
        setSelectedCustomerId(null);
      }
    );
  };

  return (
    <div className="p-2 md:p-8 space-y-4 md:space-y-6 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 pb-1 md:pb-2">
        <div className="text-center sm:text-left">
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-900 tracking-tight leading-tight">Clientes & Cuentas</h2>
          <p className="text-slate-500 text-[11px] md:text-sm font-medium">Gestión de saldos y créditos.</p>
        </div>
        <button 
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl md:rounded-[24px] font-black uppercase text-[10px] md:text-[11px] tracking-widest transition-all active:scale-95 bg-brand-600 text-white soft-shadow hover:bg-brand-700"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Registrar Cliente
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Customer List */}
        <div className={`lg:col-span-1 space-y-4 md:space-y-6 ${selectedCustomer ? 'hidden lg:block' : 'block'}`}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-2xl md:rounded-[28px] py-3 md:py-4 pl-10 md:pl-14 pr-6 text-xs md:text-sm font-bold soft-shadow focus:border-brand-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2 md:space-y-3 overflow-y-auto max-h-[50vh] lg:max-h-[65vh] no-scrollbar pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 md:py-20 bg-white rounded-3xl md:rounded-[40px] border border-slate-100 soft-shadow">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-6 h-6 md:w-8 md:h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Sin resultados</p>
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full text-left p-3.5 md:p-5 rounded-2xl md:rounded-[32px] border transition-all flex items-center justify-between group h-20 md:h-24 ${
                    selectedCustomerId === customer.id 
                      ? 'bg-brand-50 border-brand-100 soft-shadow ring-2 ring-brand-50/50' 
                      : 'bg-white border-transparent hover:border-slate-100 soft-shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-display font-bold text-base md:text-lg transition-colors ${
                       selectedCustomerId === customer.id ? 'bg-white text-brand-600 soft-shadow' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {customer.nombre[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-slate-900 group-hover:text-brand-700 transition-colors truncate text-sm md:text-base">{customer.nombre}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{customer.documento || 'ID no reg.'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base md:text-lg font-display font-bold ${getCustomerSaldoAtDate(customer) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      S/ {getCustomerSaldoAtDate(customer).toFixed(2)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Details and History */}
        <div className={`lg:col-span-2 ${selectedCustomer ? 'block' : 'hidden lg:block'}`}>
          {selectedCustomer ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[40px] border border-slate-100 soft-shadow overflow-hidden h-full flex flex-col"
            >
               <div className="bg-slate-900 p-6 md:p-10 text-white flex flex-col sm:flex-row justify-between items-center gap-6 md:gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
                
                <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto relative z-10">
                   <button 
                    onClick={() => setSelectedCustomerId(null)}
                    className="lg:hidden p-2.5 bg-white/10 rounded-xl mr-1"
                   >
                     <ArrowDownLeft className="w-4 h-4 rotate-45" />
                   </button>
                  <div className="w-14 h-14 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl md:rounded-[28px] flex items-center justify-center text-xl md:text-2xl font-display font-bold border border-white/10 shrink-0">
                    {selectedCustomer.nombre[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <form onSubmit={handleSaveEdit} className="space-y-3">
                        <div className="flex flex-col gap-2">
                          <input 
                            autoFocus
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-white/40 backdrop-blur-sm"
                            value={editingData.nombre}
                            placeholder="Nombre..."
                            onChange={e => setEditingData({...editingData, nombre: e.target.value})}
                          />
                          <div className="flex gap-2">
                            <input 
                              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:border-white/40 backdrop-blur-sm"
                              value={editingData.documento}
                              placeholder="Doc..."
                              onChange={e => setEditingData({...editingData, documento: e.target.value})}
                            />
                            <input 
                              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:border-white/40 backdrop-blur-sm"
                              value={editingData.telefono}
                              placeholder="Tel..."
                              onChange={e => setEditingData({...editingData, telefono: e.target.value})}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => setIsEditing(false)}
                              className="flex-1 py-1.5 bg-white/10 text-white/60 rounded-lg text-[10px] font-black uppercase hover:bg-white/20"
                            >
                              Cancelar
                            </button>
                            <button 
                              type="submit"
                              className="flex-[2] py-1.5 bg-brand-500 text-white rounded-lg text-[10px] font-black uppercase hover:bg-brand-600 shadow-lg shadow-brand-900/20"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl md:text-3xl font-display font-bold tracking-tight truncate leading-tight">{selectedCustomer.nombre}</h3>
                          <div className="flex gap-1 ml-auto sm:ml-0 shrink-0">
                            <button 
                              onClick={handleStartEdit}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                              title="Editar cliente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={handleDeleteCustomer}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-rose-400"
                              title="Eliminar cliente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1 mt-1 md:mt-2">
                           <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                              <Receipt className="w-3 md:w-3.5 h-3 md:h-3.5 text-brand-500" /> {selectedCustomer.documento || 'N/A'}
                           </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-center sm:text-right w-full sm:w-auto p-4 md:p-6 sm:p-0 bg-white/5 sm:bg-transparent rounded-2xl md:rounded-[32px] border border-white/5 sm:border-0 flex flex-row sm:flex-col justify-between items-center sm:items-end relative z-10 leading-none">
                  {!isEditing && (
                    <>
                      <p className="text-[8px] md:text-[10px] font-bold text-brand-400 uppercase tracking-[0.3em] mb-1 sm:mb-2 italic">Balance Actual</p>
                      <p className={`text-3xl md:text-5xl font-display font-bold tracking-tighter ${getCustomerSaldoAtDate(selectedCustomer) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        S/ {getCustomerSaldoAtDate(selectedCustomer).toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-10 flex-1 flex flex-col space-y-4 md:space-y-8 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 md:gap-6">
                   <h4 className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Historial</h4>
                   <button 
                    onClick={() => setShowAddTransaction(true)}
                    className="w-full sm:w-auto py-3 md:py-4 px-6 md:px-8 bg-brand-50 rounded-xl md:rounded-[20px] text-[10px] md:text-[11px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 transition-colors flex items-center justify-center gap-2 border border-brand-100/50"
                   >
                     <Plus className="w-3.5 h-3.5" /> Movimiento
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 md:space-y-4">
                  {selectedCustomer.historial.filter(tx => toSortableDate(tx.fecha) <= selectedDateVal).length === 0 ? (
                    <div className="text-center py-12 md:py-20 bg-slate-50/50 rounded-2xl md:rounded-[40px] border-2 border-dashed border-slate-100">
                      <p className="text-slate-300 font-bold uppercase text-[9px] md:text-[10px] tracking-widest italic">Sin movimientos registrados</p>
                    </div>
                  ) : (
                    [...selectedCustomer.historial]
                      .filter(tx => toSortableDate(tx.fecha) <= selectedDateVal)
                      .sort((a, b) => {
                        const dateA = toSortableDate(a.fecha);
                        const dateB = toSortableDate(b.fecha);
                        if (dateA !== dateB) return dateB - dateA;
                        return (b.timestamp || 0) - (a.timestamp || 0);
                      })
                      .map(tx => {
                        const canEditDelete = tx.fecha === selectedDate;
                        const isEditingTx = editingTxId === tx.id;

                        if (isEditingTx) {
                          return (
                            <div key={tx.id} className="p-4 md:p-6 bg-brand-50 rounded-2xl md:rounded-[32px] border border-brand-200 soft-shadow space-y-4">
                              <div className="flex gap-4">
                                <div className="flex-1 space-y-1">
                                  <label className="text-[8px] font-bold text-brand-600 uppercase tracking-widest pl-1">Monto</label>
                                  <input 
                                    type="number"
                                    value={editTxData.amount}
                                    onChange={e => setEditTxData({...editTxData, amount: parseFloat(e.target.value) || 0})}
                                    className="w-full bg-white border border-brand-100 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                                  />
                                </div>
                                <div className="flex-[2] space-y-1">
                                  <label className="text-[8px] font-bold text-brand-600 uppercase tracking-widest pl-1">Descripción</label>
                                  <input 
                                    type="text"
                                    value={editTxData.description}
                                    onChange={e => setEditTxData({...editTxData, description: e.target.value})}
                                    className="w-full bg-white border border-brand-100 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setEditingTxId(null)}
                                  className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  onClick={() => {
                                    const newMonto = tx.tipo === 'CONSUMO' ? -editTxData.amount : editTxData.amount;
                                    updateTransaction(selectedCustomer.id, tx.id, { 
                                      monto: newMonto, 
                                      descripcion: editTxData.description 
                                    });
                                    setEditingTxId(null);
                                  }}
                                  className="flex-[2] py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={tx.id} className="flex items-center justify-between p-4 md:p-6 bg-slate-50/50 hover:bg-slate-50 rounded-2xl md:rounded-[32px] border border-slate-100/50 transition-all group soft-shadow-sm">
                            <div className="flex items-center gap-4 md:gap-6">
                              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
                                tx.tipo === 'CONSUMO' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                              }`}>
                                {tx.tipo === 'CONSUMO' ? <ArrowUpRight className="w-4 h-4 md:w-6 md:h-6" /> : <ArrowDownLeft className="w-4 h-4 md:w-6 md:h-6" />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm md:text-base leading-tight uppercase tracking-tight">{tx.descripcion}</p>
                                <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{tx.fecha} • {tx.hora}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {tx.metodoPago && (
                                <span className="text-[7px] md:text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                  {tx.metodoPago}
                                </span>
                              )}
                              {canEditDelete && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleStartEditTx(tx)}
                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-brand-500 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      requestConfirmation(
                                        'Eliminar Movimiento',
                                        `¿Deseas eliminar este registro de S/ ${Math.abs(tx.monto).toFixed(2)}?`,
                                        () => deleteTransaction(selectedCustomer.id, tx.id)
                                      );
                                    }}
                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              <div className="text-right shrink-0">
                                <p className={`text-base md:text-xl font-display font-bold tracking-tight ${tx.monto >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {tx.monto > 0 ? '+' : ''}{tx.monto.toFixed(2)}
                                </p>
                                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{tx.tipo}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 text-slate-300 p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[40px] flex items-center justify-center mb-4">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Seleccione un cliente</h3>
              <p className="max-w-xs text-sm font-medium mt-2 leading-relaxed italic">
                Elija un cliente de la lista para ver su historial de movimientos y estado de cuenta.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAddCustomer && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-display font-bold text-slate-900 tracking-tight leading-none">Nuevo Cliente</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Registro de identidad</p>
                </div>
                <button onClick={() => setShowAddCustomer(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                    <input 
                      required
                      type="text" 
                      value={newCustomer.nombre}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Identificación del comensal"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Documento</label>
                      <input 
                        type="text" 
                        value={newCustomer.documento}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, documento: e.target.value }))}
                        placeholder="DNI / RUC"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Teléfono</label>
                      <input 
                        type="text" 
                        value={newCustomer.telefono}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="Contacto"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4.5 bg-brand-600 text-white font-bold uppercase tracking-[0.2em] text-[11px] rounded-[24px] soft-shadow hover:bg-brand-700 transition-all active:scale-95"
                >
                  Registrar nuevo perfil
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddTransaction && selectedCustomer && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-display font-bold text-slate-900 tracking-tight leading-none">Nuevo Movimiento</h3>
                  <p className="text-[10px] font-bold text-brand-600 tracking-[0.3em] uppercase mt-2 italic">{selectedCustomer.nombre}</p>
                </div>
                <button onClick={() => setShowAddTransaction(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-100">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Categoría de operación</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button
                        type="button"
                        onClick={() => setNewTransaction(prev => ({ ...prev, type: 'DEPOSITO' }))}
                        className={`py-4 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all soft-shadow-sm flex items-center justify-center gap-2 ${
                          newTransaction.type === 'DEPOSITO' 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                            : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                        }`}
                       >
                         <ArrowDownLeft className="w-3 h-3" /> Abono Recibido
                       </button>
                       <button
                        type="button"
                        onClick={() => setNewTransaction(prev => ({ ...prev, type: 'PAGO_CREDITO' }))}
                        className={`py-4 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all soft-shadow-sm flex items-center justify-center gap-2 ${
                          newTransaction.type === 'PAGO_CREDITO' 
                            ? 'bg-brand-50 border-brand-600 text-brand-700'
                            : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                        }`}
                       >
                         <Check className="w-3 h-3" /> Cancelar Deuda
                       </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button
                        type="button"
                        onClick={() => setNewTransaction(prev => ({ ...prev, metodoPago: 'EFECTIVO' }))}
                        className={`py-3.5 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all soft-shadow-sm flex items-center justify-center gap-2 ${
                          newTransaction.metodoPago === 'EFECTIVO' 
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                        }`}
                       >
                         Efectivo
                       </button>
                       <button
                        type="button"
                        onClick={() => setNewTransaction(prev => ({ ...prev, metodoPago: 'YAPE' }))}
                        className={`py-3.5 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all soft-shadow-sm flex items-center justify-center gap-2 ${
                          newTransaction.metodoPago === 'YAPE' 
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                        }`}
                       >
                         Yape
                       </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Monto en Soles (S/)</label>
                    <input 
                      required
                      min="0.1"
                      step="0.1"
                      type="number" 
                      value={newTransaction.amount || ''}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 font-display font-bold text-lg outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Concepto o Referencia</label>
                    <input 
                      type="text" 
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detalle opcional..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 font-bold text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4.5 bg-brand-600 text-white font-bold uppercase tracking-[0.2em] text-[11px] rounded-[24px] soft-shadow hover:bg-brand-700 transition-all active:scale-95"
                >
                  Registrar movimiento contable
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
