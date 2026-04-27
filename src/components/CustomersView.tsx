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
  const { customers, addCustomer, updateCustomer, deleteCustomer, addTransaction, requestConfirmation, isTodaySelected, selectedDate } = useApp();
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
    return customer.historial.reduce((acc, tx) => {
      if (toSortableDate(tx.fecha) <= selectedDateVal) {
        return acc + tx.monto;
      }
      return acc;
    }, 0);
  };

  const filteredCustomers = customers.filter(c => 
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
  const [newTransaction, setNewTransaction] = useState({ type: 'DEPOSITO' as 'DEPOSITO' | 'PAGO_CREDITO', amount: 0, description: '' });

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
      descripcion: newTransaction.description || (newTransaction.type === 'DEPOSITO' ? 'Depósito de saldo' : 'Pago de deuda')
    });
    setNewTransaction({ type: 'DEPOSITO', amount: 0, description: '' });
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
    <div className="p-3 md:p-8 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Finanzas de Clientes</h2>
          <p className="text-slate-500 text-sm">Control de saldos, créditos y prepagos.</p>
        </div>
        <button 
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center justify-center gap-3 px-8 py-4 rounded-[24px] font-bold uppercase text-[11px] tracking-widest transition-all active:scale-95 bg-brand-600 text-white soft-shadow hover:bg-brand-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Customer List */}
        <div className={`lg:col-span-1 space-y-6 ${selectedCustomer ? 'hidden lg:block' : 'block'}`}>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o DNI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-[28px] py-4 pl-14 pr-6 text-sm font-bold soft-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[50vh] lg:max-h-[65vh] no-scrollbar pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100 soft-shadow">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sin resultados</p>
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full text-left p-5 rounded-[32px] border transition-all flex items-center justify-between group h-24 ${
                    selectedCustomerId === customer.id 
                      ? 'bg-brand-50 border-brand-100 soft-shadow ring-4 ring-brand-50/50' 
                      : 'bg-white border-transparent hover:border-slate-100 soft-shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-lg transition-colors ${
                       selectedCustomerId === customer.id ? 'bg-white text-brand-600 soft-shadow' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {customer.nombre[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-display font-bold text-slate-900 group-hover:text-brand-700 transition-colors">{customer.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{customer.documento || 'No identificado'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-display font-bold ${getCustomerSaldoAtDate(customer) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      S/ {getCustomerSaldoAtDate(customer).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Saldo Disp.</p>
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
              <div className="bg-slate-900 p-8 md:p-10 text-white flex flex-col sm:flex-row justify-between items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
                
                <div className="flex items-center gap-6 w-full sm:w-auto relative z-10">
                   <button 
                    onClick={() => setSelectedCustomerId(null)}
                    className="lg:hidden p-3 bg-white/10 rounded-2xl mr-1"
                   >
                     <ArrowDownLeft className="w-5 h-5 rotate-45" />
                   </button>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-[28px] flex items-center justify-center text-2xl font-display font-bold border border-white/10">
                    {selectedCustomer.nombre[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <form onSubmit={handleSaveEdit} className="space-y-3">
                        <input 
                          autoFocus
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-base font-bold outline-none focus:border-white/40 backdrop-blur-sm"
                          value={editingData.nombre}
                          onChange={e => setEditingData({...editingData, nombre: e.target.value})}
                        />
                        <div className="flex gap-3">
                           <input 
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-white/40"
                            placeholder="DNI/RUC"
                            value={editingData.documento}
                            onChange={e => setEditingData({...editingData, documento: e.target.value})}
                          />
                          <input 
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-white/40"
                            placeholder="Teléfono"
                            value={editingData.telefono}
                            onChange={e => setEditingData({...editingData, telefono: e.target.value})}
                          />
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl md:text-3xl font-display font-bold tracking-tight">{selectedCustomer.nombre}</h3>
                          <div className="flex gap-1.5 ml-auto sm:ml-0">
                            <button 
                              onClick={handleStartEdit}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={handleDeleteCustomer}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Receipt className="w-3.5 h-3.5 text-brand-500" /> {selectedCustomer.documento || 'No Identificado'}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Wallet className="w-3.5 h-3.5 text-brand-500" /> {selectedCustomer.telefono || 'Sin número'}
                           </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-center sm:text-right w-full sm:w-auto p-6 sm:p-0 bg-white/5 sm:bg-transparent rounded-[32px] border border-white/5 sm:border-0 flex flex-row sm:flex-col justify-between items-center sm:items-end relative z-10">
                  {isEditing ? (
                    <div className="flex gap-3 w-full sm:w-auto">
                       <button 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 sm:w-auto px-6 py-3 bg-slate-800 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors"
                       >
                         Cancelar
                       </button>
                       <button 
                        onClick={handleSaveEdit}
                        className="flex-1 sm:w-auto px-6 py-3 bg-brand-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 soft-shadow hover:bg-brand-600"
                       >
                         <Check className="w-4 h-4" /> Guardar
                       </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.3em] mb-2 leading-none">Balance al {selectedDate}</p>
                      <p className={`text-4xl md:text-5xl font-display font-bold tracking-tighter ${getCustomerSaldoAtDate(selectedCustomer) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        S/ {getCustomerSaldoAtDate(selectedCustomer).toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-8 md:p-10 flex-1 flex flex-col space-y-8 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                   <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Historial de Operaciones</h4>
                   <button 
                    onClick={() => setShowAddTransaction(true)}
                    className="w-full sm:w-auto py-4 px-8 bg-brand-50 rounded-[20px] text-[11px] font-bold text-brand-600 uppercase tracking-widest hover:text-brand-700 transition-colors flex items-center justify-center gap-3 border border-brand-100/50"
                   >
                     <Plus className="w-4 h-4" /> Nuevo Movimiento
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  {selectedCustomer.historial.filter(tx => tx.fecha === selectedDate).length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
                      <p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">No hay registros para {selectedDate}</p>
                    </div>
                  ) : (
                    selectedCustomer.historial
                      .filter(tx => tx.fecha === selectedDate)
                      .map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 rounded-[32px] border border-slate-100/50 transition-all group soft-shadow-sm">
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                             tx.tipo === 'CONSUMO' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {tx.tipo === 'CONSUMO' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-base">{tx.descripcion}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{tx.fecha} • {tx.hora}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-display font-bold tracking-tight ${tx.monto >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {tx.monto > 0 ? '+' : ''}{tx.monto.toFixed(2)}
                          </p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{tx.tipo}</span>
                        </div>
                      </div>
                    ))
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
