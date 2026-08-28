/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Minus, X, User, FileText, Sparkles, Check, Trash2, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderItem, Product, MenuItem, Mesa } from '../types';

const QUICK_NOTE_SUGGESTIONS = [
  'Sin Cebolla',
  'Sin Ají / Rocoto',
  'Poco Arroz',
  'Bien Cocido',
  'Término Medio',
  'Ensalada Aparte',
  'Para Llevar',
  'Extra Salsa',
  'Helada',
  'Sin Helar'
];

export const OrderModal: React.FC<{
  onClose: () => void;
  onAdd: (items: Partial<OrderItem>[], clienteName: string) => void;
  products: Product[];
  currentMenu: MenuItem[];
  mesaId: string;
  mesaName: string;
  initialClienteName?: string;
  title?: string;
  mesas?: Mesa[];
  initialItems?: OrderItem[];
  onSaveEdit?: (
    quantities: { [productId: string]: number },
    notes: { [productId: string]: string },
    clienteName: string,
    mesaId: string
  ) => void;
}> = ({
  onClose,
  onAdd,
  products,
  currentMenu,
  mesaId,
  mesaName,
  initialClienteName = '',
  title = 'Nuevo Pedido',
  mesas,
  initialItems,
  onSaveEdit,
}) => {
  const [selectedMesaId, setSelectedMesaId] = useState(mesaId);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>(() => {
    if (initialItems) {
      const qtys: { [key: string]: number } = {};
      initialItems.forEach(item => {
        qtys[item.productoId] = (qtys[item.productoId] || 0) + item.cantidad;
      });
      return qtys;
    }
    return {};
  });

  const [notes, setNotes] = useState<{ [key: string]: string }>(() => {
    if (initialItems) {
      const nts: { [key: string]: string } = {};
      initialItems.forEach(item => {
        if (item.notas) {
          nts[item.productoId] = item.notas;
        }
      });
      return nts;
    }
    return {};
  });

  const [clienteName, setClienteName] = useState(initialClienteName);

  // State for the dedicated Note/Detail popup
  const [noteModalProduct, setNoteModalProduct] = useState<Product | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  const openNoteModal = (product: Product) => {
    setNoteModalProduct(product);
    setTempNoteText(notes[product.id] || '');
  };

  const handleSaveNote = () => {
    if (!noteModalProduct) return;
    const trimmed = tempNoteText.trim();
    setNotes(prev => ({
      ...prev,
      [noteModalProduct.id]: trimmed
    }));
    setNoteModalProduct(null);
  };

  const handleClearNote = () => {
    if (!noteModalProduct) return;
    setNotes(prev => {
      const copy = { ...prev };
      delete copy[noteModalProduct.id];
      return copy;
    });
    setTempNoteText('');
    setNoteModalProduct(null);
  };

  const toggleSuggestion = (suggestion: string) => {
    if (!tempNoteText) {
      setTempNoteText(suggestion);
      return;
    }
    if (tempNoteText.includes(suggestion)) {
      // Remove it
      const regex = new RegExp(`(^|,\\s*)${suggestion}`, 'gi');
      let updated = tempNoteText.replace(regex, '').replace(/^,\s*/, '').trim();
      setTempNoteText(updated);
    } else {
      // Append it
      setTempNoteText(`${tempNoteText}, ${suggestion}`);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const nextVal = current + delta;
      if (delta > 0) {
        const menuI = currentMenu.find(m => m.productoId === id);
        const initialQty = initialItems
          ? initialItems.filter(item => item.productoId === id).reduce((acc, item) => acc + item.cantidad, 0)
          : 0;
        const extraQtyNeeded = nextVal - initialQty;
        if (extraQtyNeeded > 0 && menuI && menuI.stockActual < extraQtyNeeded) {
          alert(`¡ATENCIÓN! No hay stock suficiente para este producto. Stock disponible extra: ${menuI.stockActual}`);
          return prev;
        }
      }
      return {
        ...prev,
        [id]: Math.max(0, nextVal)
      };
    });
  };

  const handleInputChange = (id: string, value: string) => {
    if (value === '') {
      setQuantities(prev => ({ ...prev, [id]: 0 }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;

    const menuI = currentMenu.find(m => m.productoId === id);
    const initialQty = initialItems
      ? initialItems.filter(item => item.productoId === id).reduce((acc, item) => acc + item.cantidad, 0)
      : 0;
    const extraQtyNeeded = parsed - initialQty;
    if (extraQtyNeeded > 0 && menuI && menuI.stockActual < extraQtyNeeded) {
      alert(`¡ATENCIÓN! No hay stock suficiente para este producto. Stock disponible extra: ${menuI.stockActual}`);
      setQuantities(prev => ({ ...prev, [id]: initialQty + (menuI.stockActual > 0 ? menuI.stockActual : 0) }));
      return;
    }
    setQuantities(prev => ({ ...prev, [id]: parsed }));
  };

  const handleAdd = () => {
    if (onSaveEdit) {
      onSaveEdit(quantities, notes, clienteName, selectedMesaId);
    } else {
      const items = Object.keys(quantities)
        .filter(id => quantities[id] > 0)
        .map(id => ({
          productoId: id,
          cantidad: quantities[id],
          notas: notes[id] || ''
        }));

      if (items.length === 0) {
        alert('Debe seleccionar al menos un producto para registrar el pedido.');
        return;
      }

      // Real-time stock verification inside modal
      const insufficientStock: string[] = [];
      for (const item of items) {
        const menuI = currentMenu.find(m => m.productoId === item.productoId);
        const product = products.find(p => p.id === item.productoId);
        if (menuI && menuI.stockActual < item.cantidad) {
          insufficientStock.push(`- ${product?.nombre || 'Producto'}: Solicitado ${item.cantidad}, Disponible: ${menuI.stockActual}`);
        }
      }

      if (insufficientStock.length > 0) {
        alert(`¡ATENCIÓN! No hay stock suficiente para confirmar este pedido:\n\n${insufficientStock.join('\n')}\n\nPor favor, ajuste las cantidades.`);
        return;
      }

      onAdd(items, clienteName);
    }
  };

  // Categories list
  const categories = Array.from(new Set(products.map(p => p.categoria))) as string[];

  // Custom sorting to keep MENU first, then others
  const sortedCategories = categories.sort((a, b) => {
    if (a === 'MENÚ') return -1;
    if (b === 'MENÚ') return 1;
    return a.localeCompare(b);
  });

  const totalSelected = Object.keys(quantities).reduce((acc, id) => acc + quantities[id], 0);
  const isNameChanged = clienteName.trim() !== initialClienteName.trim();
  const isMesaChanged = selectedMesaId !== mesaId;

  let isQtyOrNotesChanged = false;
  if (initialItems) {
    const allPIds = Array.from(new Set([
      ...initialItems.map(i => i.productoId),
      ...Object.keys(quantities)
    ]));
    for (const pId of allPIds) {
      const initQ = initialItems.filter(i => i.productoId === pId).reduce((acc, i) => acc + i.cantidad, 0);
      const initNote = initialItems.find(i => i.productoId === pId)?.notas || '';
      const currQ = quantities[pId] || 0;
      const currNote = notes[pId] || '';
      if (initQ !== currQ || (currQ > 0 && initNote !== currNote)) {
        isQtyOrNotesChanged = true;
        break;
      }
    }
  } else {
    isQtyOrNotesChanged = totalSelected > 0;
  }

  const hasAnyItems = Object.keys(quantities).some(id => quantities[id] > 0);
  const canConfirm = hasAnyItems && (
    !initialItems
    || isNameChanged
    || isMesaChanged
    || isQtyOrNotesChanged
  );

  const renderProductRow = (p: Product) => {
    const qty = quantities[p.id] || 0;
    const menuI = currentMenu.find(m => m.productoId === p.id);
    const hasCustomPrice = menuI && menuI.precioPersonalizado !== undefined;
    const displayedPrice = hasCustomPrice ? menuI.precioPersonalizado! : p.precio;
    const itemNote = notes[p.id];

    return (
      <div
        key={p.id}
        className={`flex items-center justify-between gap-2.5 sm:gap-3 py-2.5 px-3 sm:px-3.5 rounded-2xl border-2 transition-all duration-300 ${
          qty > 0
            ? 'bg-brand-50/70 border-brand-500 ring-4 ring-brand-50/80 shadow-md shadow-brand-50/20'
            : 'bg-slate-50/60 border-slate-100/50 hover:bg-slate-100/50 hover:border-slate-200/60'
        }`}
      >
        {/* Left: Thumbnail & Details */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center relative">
            {p.imagen ? (
              <img 
                src={p.imagen} 
                alt={p.nombre} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-xs font-black ${
                p.categoria === 'MENÚ' ? 'bg-brand-100 text-brand-700' :
                p.categoria === 'EXTRA' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {p.categoria[0]}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-display font-black text-sm sm:text-base uppercase tracking-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none transition-colors duration-200 ${
                qty > 0 ? 'text-brand-900' : 'text-slate-800'
              }`}>
                {p.nombre}
              </span>
              {hasCustomPrice && <span className="text-brand-600 text-[10px] font-black" title="Precio adaptado hoy">★</span>}
            </div>

            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-600">
                S/ {displayedPrice.toFixed(2)}
              </span>

              {menuI && (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-extrabold uppercase tracking-wide border ${
                  menuI.stockActual === 0
                    ? 'bg-rose-50 text-rose-500 border-rose-100/50'
                    : menuI.stockActual < 5
                      ? 'bg-amber-50 text-amber-600 border-amber-100/50'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                }`}>
                  Stock: {menuI.stockActual}
                </span>
              )}
            </div>

            {/* Note badge preview under product name on mobile if note exists */}
            {qty > 0 && itemNote && (
              <button
                type="button"
                onClick={() => openNoteModal(p)}
                className="mt-1 inline-flex items-center gap-1.5 text-[10.5px] sm:text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-lg max-w-[220px] truncate hover:bg-amber-100 transition-colors"
                title="Editar detalle"
              >
                <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">{itemNote}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Quantity controls + Detail Button */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Note Button (Only when item is selected, saving horizontal space) */}
          {qty > 0 && (
            <button
              type="button"
              onClick={() => openNoteModal(p)}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 border ${
                itemNote
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                  : 'bg-white hover:bg-brand-50 border-slate-200 hover:border-brand-300 text-slate-600 hover:text-brand-700 shadow-xs'
              }`}
              title={itemNote ? `Detalle: ${itemNote}` : "Añadir detalle / nota para cocina"}
            >
              <FileText className={`w-4 h-4 ${itemNote ? 'text-amber-600' : 'text-brand-600'}`} />
              <span className="hidden xs:inline">{itemNote ? 'Nota' : '+ Detalle'}</span>
            </button>
          )}

          {/* Stepper with larger tap buttons & larger font-mono numbers */}
          <div className="flex items-center bg-white rounded-xl p-0.5 shrink-0 border border-slate-200/80 shadow-xs transition-all duration-300 hover:border-brand-300">
            <button
              type="button"
              onClick={() => updateQuantity(p.id, -1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-transform bg-transparent cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={qty === 0 ? '' : qty}
              onChange={(e) => handleInputChange(p.id, e.target.value)}
              className="font-mono font-black text-slate-900 w-8 sm:w-9 text-center text-sm sm:text-base outline-none bg-transparent"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => updateQuantity(p.id, 1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center active:scale-95 transition-transform shadow-xs hover:bg-brand-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 pt-1 sm:pt-4">
      <motion.div
        initial={{ y: '20px', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-2xl sm:rounded-[32px] rounded-b-[24px] sm:rounded-t-[32px] shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden relative"
      >
        {/* Header - Compact & Sticky */}
        <div className="flex justify-between items-center bg-white px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 tracking-tight leading-none">{title}</h3>
              {mesas && onSaveEdit ? (
                <div className="flex items-center gap-1 bg-brand-50 border border-brand-100/50 rounded-lg px-2.5 py-1 select-none">
                  <span className="text-brand-500 text-[10px] font-black uppercase">Mesa:</span>
                  <select
                    value={selectedMesaId}
                    onChange={(e) => setSelectedMesaId(e.target.value)}
                    className="bg-transparent text-brand-700 text-[11px] font-extrabold uppercase outline-none cursor-pointer"
                  >
                    {mesas
                      .filter(m => {
                        if (m.id === '13') return false;
                        if (m.estado === 'OCUPADA' && m.id !== mesaId) return false;
                        return true;
                      })
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    {mesaId === '13' && (
                      <option value="13">
                        Para Llevar
                      </option>
                    )}
                  </select>
                </div>
              ) : (
                <span className="text-brand-700 text-[11px] sm:text-xs font-black uppercase tracking-wider bg-brand-50 border border-brand-200/60 px-2.5 py-1 rounded-lg">{mesaName}</span>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 sm:p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors border border-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable Body: Customer name & Products List */}
        <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-3 space-y-3 sm:space-y-3.5 no-scrollbar">
          
          {/* Customer name box - Ultra Compact */}
          <div className="bg-slate-50/80 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-xl flex items-center justify-center text-brand-600 shrink-0 border border-slate-200/60 shadow-xs">
                <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={clienteName}
                  onChange={(e) => setClienteName(e.target.value)}
                  placeholder="Identificar pedido / Nombre del comensal..."
                  className="w-full bg-white border border-slate-200/80 rounded-xl py-2 px-3 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* Products by Category */}
          {sortedCategories.map(cat => {
            const catProducts = products.filter(p =>
              p.categoria === cat && (
                currentMenu.some(m => m.productoId === p.id) ||
                (initialItems && initialItems.some(item => item.productoId === p.id))
              )
            );

            if (catProducts.length === 0) return null;

            if (cat === 'MENÚ') {
              const soups = catProducts.filter(p => p.tipo === 'SOPA');
              const mains = catProducts.filter(p => p.tipo === 'SEGUNDO');

              return (
                <React.Fragment key={cat}>
                  <section className="space-y-1.5">
                    <h4 className="text-xs sm:text-xs font-black text-slate-600 uppercase tracking-widest px-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                      Entrada (Menú)
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {soups.map(p => (
                        <div key={p.id}>
                          {renderProductRow(p)}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs sm:text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                        Segundos del Menú
                      </h4>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {mains.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                    </div>
                  </section>
                </React.Fragment>
              );
            }

            return (
              <section key={cat} className="space-y-1.5">
                <h4 className="text-xs sm:text-xs font-black text-slate-600 uppercase tracking-widest px-1 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  {cat}
                </h4>
                <div className="flex flex-col gap-1.5">
                  {catProducts.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                </div>
              </section>
            );
          })}
        </div>

        {/* ALWAYS VISIBLE FIXED FOOTER ACTIONS */}
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-200/80 shrink-0 flex gap-2.5 sm:gap-3 shadow-lg z-30">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 sm:py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-display font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl sm:rounded-2xl border border-rose-200/70 transition-all active:scale-95 text-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canConfirm}
            className="flex-[2] py-3.5 sm:py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-500 font-display font-black uppercase tracking-wider text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-sm disabled:opacity-40 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 transition-all active:scale-95 text-center cursor-pointer"
          >
            {onSaveEdit ? 'Guardar Cambios' : (totalSelected > 0 ? `Confirmar Pedido (${totalSelected})` : 'Confirmar Pedido')}
          </button>
        </div>

        {/* MODAL DE DETALLE / NOTA PARA COCINA */}
        <AnimatePresence>
          {noteModalProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-md sm:rounded-[28px] rounded-t-[28px] p-5 sm:p-6 space-y-4 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-slate-900 text-sm sm:text-base uppercase tracking-tight">
                        Detalle para Cocina
                      </h4>
                      <p className="text-[11px] font-extrabold text-brand-600 uppercase">
                        {noteModalProduct.nombre}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoteModalProduct(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick 1-tap chips */}
                <div>
                  <label className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    Atajos Rápidos (Toca para agregar):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_NOTE_SUGGESTIONS.map(chip => {
                      const isSelected = tempNoteText.toLowerCase().includes(chip.toLowerCase());
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleSuggestion(chip)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-100 border-amber-300 text-amber-900 font-extrabold shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{chip}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textarea for custom notes */}
                <div>
                  <label className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-wider block mb-1">
                    Nota o Instrucción Específica:
                  </label>
                  <textarea
                    rows={3}
                    value={tempNoteText}
                    onChange={(e) => setTempNoteText(e.target.value)}
                    placeholder="Ej. Sin cebolla, bien dorado, ensalada sin vinagreta..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                    autoFocus
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {tempNoteText && (
                    <button
                      type="button"
                      onClick={handleClearNote}
                      className="px-3.5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpiar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-display font-black uppercase text-xs sm:text-sm tracking-wider transition-all active:scale-95 shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Guardar Detalle
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};

