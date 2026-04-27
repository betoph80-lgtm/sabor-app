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
  const { customers, addCustomer, updateCustomer, deleteCustomer, addTransaction, requestConfirmation } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  
  // Edit Customer States
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({ nombre: '', documento: '', telefono: '' });
  
  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({ nombre: '', documento: '', telefono: '' });
  
  // New Transaction Form State
  const [newTransaction, setNewTransaction] = useState({ type: 'DEPOSITO' as 'DEPOSITO' | 'PAGO_CREDITO', amount: 0, description: '' });

  const filteredCustomers = customers.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.documento?.includes(searchTerm)
  );

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
    // Refresh selected customer to show new transaction
    setSelectedCustomer(customers.find(c => c.id === selectedCustomer.id) || null);
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
    
    // Update local selected state
    setSelectedCustomer({
      ...selectedCustomer,
      ...editingData
    });
  };

  const handleDeleteCustomer = () => {
    if (!selectedCustomer) return;
    requestConfirmation(
      'Eliminar Cliente',
      `¿Deseas eliminar a ${selectedCustomer.nombre}? Se perderá todo su historial y saldo de S/ ${selectedCustomer.saldo.toFixed(2)}.`,
      () => {
        deleteCustomer(selectedCustomer.id);
        setSelectedCustomer(null);
      }
    );
  };

  return (
    <div className="p-3 md:p-8 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Estado de Cuenta</h2>
          <p className="text-slate-400 text-[11px] md:text-sm font-medium">Gestión de créditos y prepagos.</p>
        </div>
        <button 
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center justify-center gap-2 bg-violet-600 text-white px-6 py-3.5 md:py-3 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className={`lg:col-span-1 space-y-4 ${selectedCustomer ? 'hidden lg:block' : 'block'}`}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 md:py-3 pl-12 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[50vh] lg:max-h-[60vh] no-scrollbar">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <User className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-xs font-bold uppercase">No se encontraron clientes</p>
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full text-left p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${
                    selectedCustomer?.id === customer.id 
                      ? 'bg-violet-50 border-violet-500 shadow-md translate-x-1' 
                      : 'bg-white border-transparent hover:border-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black">
                      {customer.nombre[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm leading-tight">{customer.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{customer.documento || 'Sin doc.'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${customer.saldo >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      S/ {customer.saldo.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Saldo</p>
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
              className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col"
            >
              <div className="bg-slate-900 p-6 md:p-8 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                   <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="lg:hidden p-2 bg-white/10 rounded-xl mr-1"
                   >
                     <ArrowDownLeft className="w-5 h-5 rotate-45" />
                   </button>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-2xl font-black">
                    {selectedCustomer.nombre[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <form onSubmit={handleSaveEdit} className="space-y-2">
                        <input 
                          autoFocus
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-1 text-sm font-bold outline-none focus:border-white/40"
                          value={editingData.nombre}
                          onChange={e => setEditingData({...editingData, nombre: e.target.value})}
                        />
                        <div className="flex gap-2">
                           <input 
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1 text-[10px] font-bold outline-none focus:border-white/40"
                            placeholder="DNI/RUC"
                            value={editingData.documento}
                            onChange={e => setEditingData({...editingData, documento: e.target.value})}
                          />
                          <input 
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1 text-[10px] font-bold outline-none focus:border-white/40"
                            placeholder="Teléfono"
                            value={editingData.telefono}
                            onChange={e => setEditingData({...editingData, telefono: e.target.value})}
                          />
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl md:text-2xl font-black tracking-tight">{selectedCustomer.nombre}</h3>
                          <div className="flex gap-1">
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
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                           <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Receipt className="w-2.5 h-2.5 md:w-3 md:h-3" /> {selectedCustomer.documento || 'S/D'}
                           </span>
                           <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Wallet className="w-2.5 h-2.5 md:w-3 md:h-3" /> {selectedCustomer.telefono || 'S/T'}
                           </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-center sm:text-right w-full sm:w-auto p-4 sm:p-0 bg-white/5 sm:bg-transparent rounded-2xl border border-white/5 sm:border-0 flex flex-row sm:flex-col justify-between items-center sm:items-end">
                  {isEditing ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 sm:w-auto px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest"
                       >
                         Cancelar
                       </button>
                       <button 
                        onClick={handleSaveEdit}
                        className="flex-1 sm:w-auto px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
                       >
                         <Check className="w-3 h-3" /> Guardar
                       </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[9px] md:text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Saldo Actual</p>
                      <p className={`text-2xl md:text-3xl font-black ${selectedCustomer.saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        S/ {selectedCustomer.saldo.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-8 flex-1 flex flex-col space-y-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Movimientos</h4>
                   <button 
                    onClick={() => setShowAddTransaction(true)}
                    className="w-full sm:w-auto py-3 px-4 bg-violet-50 sm:bg-transparent rounded-xl text-[10px] md:text-xs font-black text-violet-600 uppercase tracking-widest hover:text-violet-700 transition-colors flex items-center justify-center gap-2"
                   >
                     <Plus className="w-3.5 h-3.5" /> Agregar Saldo / Pago
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                  {selectedCustomer.historial.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                      <p className="text-slate-300 font-black uppercase text-xs">No hay movimientos registrados</p>
                    </div>
                  ) : (
                    selectedCustomer.historial.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl transition-all hover:bg-slate-100 group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                             tx.tipo === 'CONSUMO' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {tx.tipo === 'CONSUMO' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{tx.descripcion}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{tx.fecha} • {tx.hora}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${tx.monto >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {tx.monto > 0 ? '+' : ''}{tx.monto.toFixed(2)}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">{tx.tipo}</p>
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
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Nuevo Cliente</h3>
                <button onClick={() => setShowAddCustomer(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nombre Completo</label>
                    <input 
                      required
                      type="text" 
                      value={newCustomer.nombre}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Documento (DNI/RUC)</label>
                    <input 
                      type="text" 
                      value={newCustomer.documento}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, documento: e.target.value }))}
                      placeholder="8 dígitos / 11 dígitos"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Teléfono</label>
                    <input 
                      type="text" 
                      value={newCustomer.telefono}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="999 999 999"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-violet-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all"
                >
                  Registrar Cliente
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
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Agregar Movimiento</h3>
                  <p className="text-[10px] font-black text-violet-500 tracking-widest uppercase">{selectedCustomer.nombre}</p>
                </div>
                <button onClick={() => setShowAddTransaction(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tipo de Movimiento</label>
                    <div className="grid grid-cols-2 gap-2">
                       <button
                        type="button"
                        onClick={() => setNewTransaction(prev => ({ ...prev, type: 'DEPOSITO' }))}
                        className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                          newTransaction.type === 'DEPOSITO' 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                       >
                         Saldo Adelanto
                       </button>
                       <button
                        type="button"
                        onClick={() => setNewTransaction(prev => ({ ...prev, type: 'PAGO_CREDITO' }))}
                        className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                          newTransaction.type === 'PAGO_CREDITO' 
                            ? 'bg-violet-50 border-violet-500 text-violet-600'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                       >
                         Pago de Crédito
                       </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Monto (S/)</label>
                    <input 
                      required
                      min="0.1"
                      step="0.1"
                      type="number" 
                      value={newTransaction.amount || ''}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nota / Descripción</label>
                    <input 
                      type="text" 
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Opcional..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-violet-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all"
                >
                  Registrar Movimiento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
