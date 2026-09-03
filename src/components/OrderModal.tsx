/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  const [activeTab, setActiveTab] = useState<string>('ALL');

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
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.categoria))) as string[], [products]);

  // Custom sorting to keep MENU first, then others
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a === 'MENÚ') return -1;
      if (b === 'MENÚ') return 1;
      return a.localeCompare(b);
    });
  }, [categories]);

  // Products available in currentMenu or initialItems
  const availableProducts = useMemo(() => {
    return products.filter(p =>
      currentMenu.some(m => m.productoId === p.id) ||
      (initialItems && initialItems.some(item => item.productoId === p.id))
    );
  }, [products, currentMenu, initialItems]);

  const menuProducts = useMemo(() => availableProducts.filter(p => p.categoria === 'MENÚ'), [availableProducts]);
  const soups = useMemo(() => menuProducts.filter(p => p.tipo === 'SOPA'), [menuProducts]);
  const mains = useMemo(() => menuProducts.filter(p => p.tipo === 'SEGUNDO'), [menuProducts]);
  const otherMenu = useMemo(() => menuProducts.filter(p => p.tipo !== 'SOPA' && p.tipo !== 'SEGUNDO'), [menuProducts]);

  const otherCategories = useMemo(() => sortedCategories.filter(c => c !== 'MENÚ'), [sortedCategories]);

  // Minimalist Category Tabs (Fichas) calculation with real-time selection counters
  const categoryTabs = useMemo(() => {
    const tabs: { id: string; label: string; count: number; totalAvailable: number }[] = [];

    // Ficha 'TODOS'
    const totalCount = Object.keys(quantities).reduce((acc, id) => {
      const isAvail = availableProducts.some(p => p.id === id);
      return isAvail ? acc + (quantities[id] || 0) : acc;
    }, 0);

    tabs.push({
      id: 'ALL',
      label: 'Todos',
      count: totalCount,
      totalAvailable: availableProducts.length,
    });

    // Ficha Entradas (si hay sopas/entradas disponibles)
    if (soups.length > 0) {
      tabs.push({
        id: 'ENTRADA',
        label: 'Entradas',
        count: soups.reduce((acc, p) => acc + (quantities[p.id] || 0), 0),
        totalAvailable: soups.length,
      });
    }

    // Ficha Segundos (si hay segundos disponibles)
    if (mains.length > 0) {
      tabs.push({
        id: 'SEGUNDO',
        label: 'Segundos',
        count: mains.reduce((acc, p) => acc + (quantities[p.id] || 0), 0),
        totalAvailable: mains.length,
      });
    }

    // Ficha Menú (si hay ítems de menú sin tipo específico)
    if (otherMenu.length > 0) {
      tabs.push({
        id: 'MENU_OTROS',
        label: 'Menú',
        count: otherMenu.reduce((acc, p) => acc + (quantities[p.id] || 0), 0),
        totalAvailable: otherMenu.length,
      });
    } else if (menuProducts.length > 0 && soups.length === 0 && mains.length === 0) {
      tabs.push({
        id: 'MENÚ',
        label: 'Menú',
        count: menuProducts.reduce((acc, p) => acc + (quantities[p.id] || 0), 0),
        totalAvailable: menuProducts.length,
      });
    }

    // Fichas para otras categorías (Bebidas, Extras, Postres, etc.)
    otherCategories.forEach(cat => {
      const catProds = availableProducts.filter(p => p.categoria === cat);
      if (catProds.length > 0) {
        let label = cat;
        if (cat.toUpperCase() === 'BEBIDA') label = 'Bebidas';
        else if (cat.toUpperCase() === 'EXTRA') label = 'Extras';
        else if (cat.toUpperCase() === 'POSTRE') label = 'Postres';

        tabs.push({
          id: cat,
          label,
          count: catProds.reduce((acc, p) => acc + (quantities[p.id] || 0), 0),
          totalAvailable: catProds.length,
        });
      }
    });

    return tabs;
  }, [availableProducts, soups, mains, otherMenu, menuProducts, otherCategories, quantities]);

  const currentActiveTab = categoryTabs.some(t => t.id === activeTab) ? activeTab : 'ALL';

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
        className={`flex items-center justify-between gap-2.5 sm:gap-3 py-2 px-3 rounded-2xl border-2 transition-all duration-300 ${
          qty > 0
            ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 ring-4 ring-brand-50/80 dark:ring-brand-950/40 shadow-md shadow-brand-50/20'
            : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-100/50 dark:border-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 hover:border-slate-200/60 dark:hover:border-slate-600'
        }`}
      >
        {/* Left: Thumbnail & Details */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
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
              <div className={`w-full h-full flex items-center justify-center text-[10px] font-black ${
                p.categoria === 'MENÚ' ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300' :
                p.categoria === 'EXTRA' ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                {p.categoria[0]}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-display font-bold text-xs uppercase tracking-tight truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none transition-colors duration-200 ${
                qty > 0 ? 'text-brand-900 dark:text-brand-200 font-extrabold' : 'text-slate-800 dark:text-slate-100'
              }`}>
                {p.nombre}
              </span>
              {hasCustomPrice && <span className="text-brand-600 dark:text-brand-400 text-[9px] font-black" title="Precio adaptado hoy">★</span>}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                S/ {displayedPrice.toFixed(2)}
              </span>

              {menuI && (
                <span className={`px-1.5 py-0.2 rounded-md text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider border ${
                  menuI.stockActual === 0
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/50'
                    : menuI.stockActual < 5
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/50'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/50'
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
                className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 px-2 py-0.5 rounded-lg max-w-[200px] truncate hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                title="Editar detalle"
              >
                <FileText className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{itemNote}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Quantity controls + Detail Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Note Button (Only when item is selected, saving horizontal space) */}
          {qty > 0 && (
            <button
              type="button"
              onClick={() => openNoteModal(p)}
              className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 border cursor-pointer ${
                itemNote
                  ? 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/50 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 text-slate-600 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-300 shadow-xs'
              }`}
              title={itemNote ? `Detalle: ${itemNote}` : "Añadir detalle / nota para cocina"}
            >
              <FileText className={`w-3.5 h-3.5 ${itemNote ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'}`} />
              <span className="hidden xs:inline">{itemNote ? 'Nota' : '+ Detalle'}</span>
            </button>
          )}

          {/* Stepper */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-0.5 shrink-0 border border-slate-200/70 dark:border-slate-700 shadow-sm transition-all duration-300 hover:border-brand-300">
            <button
              type="button"
              onClick={() => updateQuantity(p.id, -1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-transform bg-transparent cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={qty === 0 ? '' : qty}
              onChange={(e) => handleInputChange(p.id, e.target.value)}
              className="font-display font-black text-slate-800 dark:text-slate-100 w-7 sm:w-8 text-center text-xs sm:text-sm outline-none bg-transparent"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => updateQuantity(p.id, 1)}
              className="w-7 h-7 rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 pt-1 sm:pt-4">
      <motion.div
        initial={{ y: '20px', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl sm:rounded-[32px] rounded-b-[24px] sm:rounded-t-[32px] shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden relative border border-slate-100 dark:border-slate-800"
      >
        {/* Header - Compact & Sticky */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-2.5 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-none">{title}</h3>
              {mesas && onSaveEdit ? (
                <div className="flex items-center gap-1 bg-brand-50 dark:bg-brand-950/60 border border-brand-100/50 dark:border-brand-900/50 rounded-lg px-2 py-0.5 select-none">
                  <span className="text-brand-500 text-[8px] font-black uppercase">Mesa:</span>
                  <select
                    value={selectedMesaId}
                    onChange={(e) => setSelectedMesaId(e.target.value)}
                    className="bg-transparent text-brand-700 dark:text-brand-300 text-[9px] font-extrabold uppercase outline-none cursor-pointer"
                  >
                    {mesas
                      .filter(m => {
                        if (m.id === '13') return false;
                        if (m.estado === 'OCUPADA' && m.id !== mesaId) return false;
                        return true;
                      })
                      .map(m => (
                        <option key={m.id} value={m.id} className="dark:bg-slate-900 dark:text-slate-200">
                          {m.nombre}
                        </option>
                      ))}
                    {mesaId === '13' && (
                      <option value="13" className="dark:bg-slate-900 dark:text-slate-200">
                        Para Llevar
                      </option>
                    )}
                  </select>
                </div>
              ) : (
                <span className="text-brand-700 dark:text-brand-300 text-[9px] font-black uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800/60 px-2 py-0.5 rounded-md">{mesaName}</span>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-500 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400 dark:text-slate-300" />
          </button>
        </div>

        {/* Fixed Sub-header: Comensal & Minimalist Fichas (Categorías) */}
        <div className="bg-slate-50/70 dark:bg-slate-800/50 px-3 sm:px-6 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
          {/* Customer name box - Ultra Compact */}
          <div className="bg-white dark:bg-slate-800 p-1.5 sm:p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-brand-50 dark:bg-brand-950/60 rounded-lg flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0 border border-brand-100/50 dark:border-brand-900/50">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  id="input-comensal-nombre"
                  type="text"
                  value={clienteName}
                  onChange={(e) => setClienteName(e.target.value)}
                  placeholder="Identificar pedido / Nombre del comensal..."
                  className="w-full bg-transparent border-none py-1 px-1 font-bold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Minimalist Category Tabs / Fichas */}
          {categoryTabs.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
              {categoryTabs.map(tab => {
                const isActive = currentActiveTab === tab.id;
                const hasSelection = tab.count > 0;

                return (
                  <button
                    key={tab.id}
                    id={`tab-categoria-${tab.id.toLowerCase()}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-brand-600 dark:bg-brand-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {hasSelection && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[17px] text-center leading-tight ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-emerald-500 text-white shadow-2xs'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Body: Products List */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-2.5 space-y-2.5 sm:space-y-3 no-scrollbar">
          {/* Empty menu warning if no products matched */}
          {availableProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-800/80 my-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xl font-bold">
                ⚠️
              </div>
              <h4 className="font-display font-black text-amber-950 dark:text-amber-200 uppercase text-xs sm:text-sm">
                Falta elegir el menú del día
              </h4>
              <p className="text-amber-800 dark:text-amber-300 text-xs font-medium max-w-sm">
                No hay platos habilitados en el menú para esta fecha. Active los platos en Almuerzos en Venta para poder realizar pedidos.
              </p>
            </div>
          )}

          {/* RENDER PRODUCTS ACCORDING TO ACTIVE TAB */}
          {availableProducts.length > 0 && (
            <>
              {/* CASE 1: 'ALL' TAB */}
              {currentActiveTab === 'ALL' && (
                <>
                  {soups.length > 0 && (
                    <section className="space-y-1">
                      <h4 className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                        Entrada (Menú)
                      </h4>
                      <div className="flex flex-col gap-1">
                        {soups.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                      </div>
                    </section>
                  )}

                  {mains.length > 0 && (
                    <section className="space-y-1">
                      <h4 className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                        Segundos del Menú
                      </h4>
                      <div className="flex flex-col gap-1">
                        {mains.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                      </div>
                    </section>
                  )}

                  {otherMenu.length > 0 && (
                    <section className="space-y-1">
                      <h4 className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                        Menú
                      </h4>
                      <div className="flex flex-col gap-1">
                        {otherMenu.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                      </div>
                    </section>
                  )}

                  {otherCategories.map(cat => {
                    const catProducts = availableProducts.filter(p => p.categoria === cat);
                    if (catProducts.length === 0) return null;

                    return (
                      <section key={cat} className="space-y-1">
                        <h4 className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          {cat}
                        </h4>
                        <div className="flex flex-col gap-1">
                          {catProducts.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                        </div>
                      </section>
                    );
                  })}
                </>
              )}

              {/* CASE 2: SINGLE CATEGORY TAB SELECTED (Ultra-compact view, no long scrolling!) */}
              {currentActiveTab === 'ENTRADA' && (
                <section className="space-y-1">
                  <div className="flex flex-col gap-1">
                    {soups.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                  </div>
                </section>
              )}

              {currentActiveTab === 'SEGUNDO' && (
                <section className="space-y-1">
                  <div className="flex flex-col gap-1">
                    {mains.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                  </div>
                </section>
              )}

              {currentActiveTab === 'MENU_OTROS' && (
                <section className="space-y-1">
                  <div className="flex flex-col gap-1">
                    {otherMenu.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                  </div>
                </section>
              )}

              {currentActiveTab === 'MENÚ' && (
                <section className="space-y-1">
                  <div className="flex flex-col gap-1">
                    {menuProducts.map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                  </div>
                </section>
              )}

              {otherCategories.includes(currentActiveTab) && (
                <section className="space-y-1">
                  <div className="flex flex-col gap-1">
                    {availableProducts
                      .filter(p => p.categoria === currentActiveTab)
                      .map(p => <div key={p.id}>{renderProductRow(p)}</div>)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* ALWAYS VISIBLE FIXED FOOTER ACTIONS */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2.5 sm:px-6 sm:py-3.5 border-t border-slate-200/80 dark:border-slate-800 shrink-0 flex gap-2 sm:gap-3 shadow-lg z-30">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 sm:py-3.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-display font-black uppercase tracking-wider text-[10px] sm:text-xs rounded-xl sm:rounded-2xl border border-rose-200/70 dark:border-rose-900/70 transition-all active:scale-95 text-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canConfirm}
            className="flex-[2] py-3 sm:py-3.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-500 font-display font-black uppercase tracking-wider text-[10px] sm:text-xs rounded-xl sm:rounded-2xl shadow-sm disabled:opacity-40 disabled:border-slate-200 dark:disabled:border-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all active:scale-95 text-center cursor-pointer"
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
                className="bg-white dark:bg-slate-900 w-full max-w-md sm:rounded-[28px] rounded-t-[28px] p-5 sm:p-6 space-y-4 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/60">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-slate-900 dark:text-white text-sm sm:text-base uppercase tracking-tight">
                        Detalle para Cocina
                      </h4>
                      <p className="text-[11px] font-extrabold text-brand-600 dark:text-brand-400 uppercase">
                        {noteModalProduct.nombre}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoteModalProduct(null)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick 1-tap chips */}
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider block mb-1.5">
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
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-extrabold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
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
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider block mb-1">
                    Nota o Instrucción Específica:
                  </label>
                  <textarea
                    rows={3}
                    value={tempNoteText}
                    onChange={(e) => setTempNoteText(e.target.value)}
                    placeholder="Ej. Sin cebolla, bien dorado, ensalada sin vinagreta..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                    autoFocus
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {tempNoteText && (
                    <button
                      type="button"
                      onClick={handleClearNote}
                      className="px-3.5 py-3 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpiar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-display font-black uppercase text-xs tracking-wider transition-all active:scale-95 shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
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

