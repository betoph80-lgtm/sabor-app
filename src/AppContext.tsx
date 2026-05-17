/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, Product, Mesa, MenuItem, PRODUCTOS_BASE, MESAS, OrderItem, ItemStatus, Customer, CustomerTransaction, TransactionType, DailyCashControl, CashControlStatus, Payment } from './types';

interface AppContextType {
  role: string;
  setRole: (role: string) => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
  categories: string[];
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  currentMenu: MenuItem[];
  mesas: Mesa[];
  setMesas: React.Dispatch<React.SetStateAction<Mesa[]>>;
  createOrder: (mesaId: string, cliente: string, items: Partial<OrderItem>[]) => void;
  updateItemStatus: (orderId: string, itemId: string, status: ItemStatus) => void;
  deleteItemFromOrder: (orderId: string, itemId: string) => void;
  updateItemQuantity: (orderId: string, itemId: string, newQty: number) => void;
  payOrder: (orderId: string, method: 'EFECTIVO' | 'YAPE' | 'CREDITO', amount: number, customerId?: string) => void;
  addItemsToOrder: (orderId: string, items: Partial<OrderItem>[]) => void;
  updateOrderInfo: (orderId: string, updates: Partial<Order>) => void;
  updateMenuItemStock: (productId: string, stockInicial: number, stockActual?: number) => void;
  deleteOrder: (orderId: string) => void;
  resetStock: () => void;
  addMesa: (id: string, nombre: string) => void;
  deleteMesa: (id: string) => void;
  toggleProductInMenu: (productId: string) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  addCustomer: (customer: Omit<Customer, 'id' | 'saldo' | 'historial'>) => void;
  updateCustomer: (id: string, customer: Partial<Omit<Customer, 'id' | 'saldo' | 'historial'>>) => void;
  deleteCustomer: (id: string) => void;
  addTransaction: (customerId: string, transaction: Omit<CustomerTransaction, 'id' | 'fecha' | 'hora'>) => void;
  cashControls: DailyCashControl[];
  openCash: (montoApertura: number) => void;
  closeCash: () => void;
  reopenCash: () => void;
  currentCash: DailyCashControl | undefined;
  confirmAction: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmation: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isTodaySelected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const formatDate = (date: Date) => {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const [role, setRole] = useState('MESERO');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const isTodaySelected = selectedDate === formatDate(new Date());
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const requestConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmAction({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        closeConfirmation();
      },
      onCancel: () => closeConfirmation()
    });
  };

  const closeConfirmation = () => {
    setConfirmAction(prev => ({ ...prev, isOpen: false }));
  };
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : PRODUCTOS_BASE;
  });
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('categories');
    return saved ? JSON.parse(saved) : ['MENÚ', 'EXTRA', 'BEBIDA'];
  });

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  const addCategory = (name: string) => {
    if (!categories.includes(name.toUpperCase())) {
      setCategories(prev => [...prev, name.toUpperCase()]);
    }
  };

  const deleteCategory = (name: string) => {
    if (['MENÚ', 'EXTRA', 'BEBIDA'].includes(name)) return; // Prevent deleting defaults
    requestConfirmation(
      'Eliminar Categoría',
      `¿Estás seguro de eliminar la categoría "${name}"? Los platos asociados se mantendrán pero su categoría deberá ser actualizada.`,
      () => {
        setCategories(prev => prev.filter(c => c !== name));
      }
    );
  };
  const [mesas, setMesas] = useState<Mesa[]>(() => {
    const saved = localStorage.getItem('mesas');
    return saved ? JSON.parse(saved) : MESAS;
  });
  const [currentMenu, setCurrentMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('currentMenu');
    if (saved) return JSON.parse(saved);
    // Initial menu for today only
    const today = formatDate(new Date());
    return PRODUCTOS_BASE.map(p => ({
      id: Math.random().toString(36).substr(2, 9),
      productoId: p.id,
      stockInicial: p.categoria === 'MENÚ' ? 25 : 0,
      stockActual: p.categoria === 'MENÚ' ? 25 : 0,
      estado: true,
      fecha: today
    }));
  });

  useEffect(() => {
    localStorage.setItem('orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('mesas', JSON.stringify(mesas));
  }, [mesas]);

  useEffect(() => {
    localStorage.setItem('currentMenu', JSON.stringify(currentMenu));
  }, [currentMenu]);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setCurrentMenu(prev => prev.map(m => m.productoId === id ? { ...m, ...updates } : m));
  };

  const deleteProduct = (id: string) => {
    requestConfirmation(
      'Eliminar Producto',
      '¿Estás seguro de eliminar este producto? Se quitará de la base de datos y del menú diario.',
      () => {
        setProducts(prev => prev.filter(p => p.id !== id));
        setCurrentMenu(prev => prev.filter(m => m.productoId !== id));
      }
    );
  };

  const createOrder = (mesaId: string, cliente: string, itemData: Partial<OrderItem>[]) => {
    const dailyOrders = orders.filter(o => o.fecha === selectedDate);
    const lastNum = dailyOrders.reduce((max, o) => {
      const num = parseInt(o.id.split('-')[1]);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const nextCount = lastNum + 1;
    const orderId = `PEDIDO-${nextCount.toString().padStart(3, '0')}`;

    const newItems: OrderItem[] = itemData.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      productoId: item.productoId!,
      cantidad: item.cantidad || 1,
      precioUnitario: products.find(p => p.id === item.productoId)?.precio || 0,
      estado: 'PEDIDO',
      horaPedido: new Date().toLocaleTimeString(),
      timestampPedido: Date.now(),
      ...item
    }));

    const total = newItems.reduce((acc, current) => acc + (current.precioUnitario * current.cantidad), 0);

    const newOrder: Order = {
      id: orderId,
      mesaId,
      cliente,
      items: newItems,
      estado: 'ABIERTO',
      total,
      pagos: [],
      usuarioId: 'user-1',
      fecha: selectedDate,
      hora: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };

    // Deduct stock
    setCurrentMenu(prev => prev.map(m => {
      if (m.fecha !== selectedDate) return m;
      const orderItem = newItems.find(oi => oi.productoId === m.productoId);
      if (orderItem) {
        return { ...m, stockActual: Math.max(0, m.stockActual - orderItem.cantidad) };
      }
      return m;
    }));

    setOrders(prev => [...prev, newOrder]);
  };

  const updateItemStatus = (orderId: string, itemId: string, status: ItemStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId && order.fecha === selectedDate) {
        return {
          ...order,
          items: order.items.map(item => item.id === itemId ? { ...item, estado: status } : item)
        };
      }
      return order;
    }));
  };

  const deleteItemFromOrder = (orderId: string, itemId: string) => {
    setOrders(prev => {
      const updatedOrders = prev.map(order => {
        if (order.id !== orderId || order.fecha !== selectedDate) return order;
        
        const itemToDelete = order.items.find(i => i.id === itemId);
        if (!itemToDelete) return order;

        const product = products.find(p => p.id === itemToDelete.productoId);
        const refundAmount = (product?.precio || 0) * itemToDelete.cantidad;

        // Return stock
        setCurrentMenu(mPrev => mPrev.map(m => 
          (m.productoId === itemToDelete.productoId && m.fecha === selectedDate)
            ? { ...m, stockActual: m.stockActual + itemToDelete.cantidad } 
            : m
        ));

        return {
          ...order,
          items: order.items.filter(i => i.id !== itemId),
          total: Math.max(0, order.total - refundAmount)
        };
      }).filter(order => order.items.length > 0);

      // Reset mesa check was here
      return updatedOrders;
    });
  };

  const updateItemQuantity = (orderId: string, itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId || order.fecha !== selectedDate) return order;
      
      const item = order.items.find(i => i.id === itemId);
      if (!item) return order;

      const product = products.find(p => p.id === item.productoId);
      const diff = newQty - item.cantidad;
      const priceChange = (product?.precio || 0) * diff;

      // Adjust stock
      setCurrentMenu(mPrev => mPrev.map(m => 
        (m.productoId === item.productoId && m.fecha === selectedDate)
          ? { ...m, stockActual: Math.max(0, m.stockActual - diff) } 
          : m
      ));

      return {
        ...order,
        items: order.items.map(i => i.id === itemId ? { ...i, cantidad: newQty } : i),
        total: order.total + priceChange
      };
    }));
  };

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [cashControls, setCashControls] = useState<DailyCashControl[]>(() => {
    const saved = localStorage.getItem('cashControls');
    return saved ? JSON.parse(saved) : [];
  });

  const currentCash = cashControls.find(c => c.fecha === selectedDate);

  useEffect(() => {
    localStorage.setItem('cashControls', JSON.stringify(cashControls));
  }, [cashControls]);

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  const openCash = (montoApertura: number) => {
    const exists = cashControls.find(c => c.fecha === selectedDate);
    
    if (exists) {
      if (exists.estado === 'ABIERTA') return;
      // Permite re-aperturar si estaba cerrada
      setCashControls(prev => prev.map(c => {
        if (c.id === exists.id) {
          return {
            ...c,
            estado: 'ABIERTA',
            montoApertura,
            horaApertura: new Date().toLocaleTimeString(),
            horaCierre: undefined,
            montoCierre: 0
          };
        }
        return c;
      }));
      return;
    }

    const newControl: DailyCashControl = {
      id: Math.random().toString(36).substr(2, 9),
      fecha: selectedDate,
      montoApertura,
      ingresosEfectivo: 0,
      ingresosYape: 0,
      ingresosFiar: 0,
      montoCierre: 0,
      estado: 'ABIERTA',
      horaApertura: new Date().toLocaleTimeString(),
      usuarioId: 'admin-1'
    };
    setCashControls(prev => [...prev, newControl]);
  };

  const closeCash = () => {
    if (!currentCash || currentCash.estado !== 'ABIERTA') return;
    
    requestConfirmation(
      'Cerrar Caja',
      `¿Estás seguro de cerrar la caja de hoy? Total Efectivo: S/ ${currentCash.ingresosEfectivo.toFixed(2)}, Total Yape: S/ ${currentCash.ingresosYape.toFixed(2)}.`,
      () => {
        setCashControls(prev => prev.map(c => {
          if (c.id === currentCash.id) {
            return {
              ...c,
              estado: 'CERRADA',
              horaCierre: new Date().toLocaleTimeString(),
              montoCierre: c.montoApertura + c.ingresosEfectivo + c.ingresosYape
            };
          }
          return c;
        }));
      }
    );
  };

  const reopenCash = () => {
    const exists = cashControls.find(c => c.fecha === selectedDate);
    if (!exists || exists.estado !== 'CERRADA') return;

    requestConfirmation(
      'Reabrir Caja',
      `¿Deseas reabrir la caja de hoy (${selectedDate})? Esto permitirá registrar nuevos pagos y pedidos.`,
      () => {
        setCashControls(prev => prev.map(c => {
          if (c.id === exists.id) {
            return {
              ...c,
              estado: 'ABIERTA',
              horaCierre: undefined,
              montoCierre: 0
            };
          }
          return c;
        }));
      }
    );
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'saldo' | 'historial'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: Math.random().toString(36).substr(2, 9),
      saldo: 0,
      historial: []
    };
    setCustomers(prev => [...prev, newCustomer]);
  };

  const updateCustomer = (id: string, updates: Partial<Omit<Customer, 'id' | 'saldo' | 'historial'>>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addTransaction = (customerId: string, transactionData: Omit<CustomerTransaction, 'id' | 'fecha' | 'hora'>) => {
    setCustomers(prev => prev.map(customer => {
      if (customer.id !== customerId) return customer;

      // Prevent duplicate transaction for the same order
      if (transactionData.orderId && customer.historial.some(t => t.orderId === transactionData.orderId)) {
        return customer;
      }

      const newTransaction: CustomerTransaction = {
        ...transactionData,
        id: Math.random().toString(36).substr(2, 9),
        fecha: selectedDate,
        hora: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
      };

      return {
        ...customer,
        saldo: customer.saldo + newTransaction.monto,
        historial: [newTransaction, ...customer.historial]
      };
    }));
  };

  const payOrder = (orderId: string, method: 'EFECTIVO' | 'YAPE' | 'CREDITO', amount: number, customerId?: string) => {
    const order = orders.find(o => o.id === orderId && o.fecha === selectedDate);
    if (!order || order.estado === 'PAGADO' || order.estado === 'CREDITO') return;
    
    const cashForDate = cashControls.find(c => c.fecha === selectedDate);
    if (!cashForDate || cashForDate.estado !== 'ABIERTA') {
      alert(`Debe abrir la caja para la fecha ${selectedDate} antes de registrar pagos.`);
      return;
    }

    if (amount <= 0) return;

    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      pedidoId: orderId,
      monto: amount,
      metodo: method,
      fecha: selectedDate,
      hora: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };

    const currentPayments = order.pagos || [];
    const updatedPayments = [...currentPayments, newPayment];
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.monto, 0);

    // Actualizar Control de Caja
    if (currentCash) {
      setCashControls(prev => prev.map(c => {
        if (c.id === currentCash.id) {
          return {
            ...c,
            ingresosEfectivo: c.ingresosEfectivo + (method === 'EFECTIVO' ? amount : 0),
            ingresosYape: c.ingresosYape + (method === 'YAPE' ? amount : 0),
            ingresosFiar: c.ingresosFiar + (method === 'CREDITO' ? amount : 0),
          };
        }
        return c;
      }));
    }

    // 1. Procesamos transacción si el método es CRÉDITO para este pago parcial
    if (method === 'CREDITO') {
      const customer = customerId 
        ? customers.find(c => c.id === customerId)
        : customers.find(c => c.nombre.toLowerCase() === order.cliente.toLowerCase());
        
      if (customer) {
        addTransaction(customer.id, {
          tipo: 'CONSUMO',
          monto: -amount,
          descripcion: `Pago parcial (FIAR) en orden ${order.id}`,
          orderId: order.id
        });
      }
    }

    // 2. Actualizamos el pedido
    setOrders(prev => prev.map(o => {
      if (o.id === orderId && o.fecha === selectedDate) {
        // Si el total pagado alcanza o supera el total de la orden, cerramos la cuenta
        const isFullyPaid = totalPaid >= order.total - 0.01; // Tolerancia de decimales
        
        let newState = o.estado;
        if (isFullyPaid) {
          // Si hay algún pago a crédito, marcamos como CRÉDITO, si no, PAGADO.
          // Pero el usuario pidió que si se paga todo se mueva a histórico.
          // En la lógica original, si era crédito se marcaba como CREDITO.
          // Vamos a mantener la lógica: si el último pago fue CRÉDITO and it's fully paid, or if any payment is credit?
          // Usually, if it has credit, the whole order is marked as CREDITO for reporting.
          const hasCredit = updatedPayments.some(p => p.metodo === 'CREDITO');
          newState = hasCredit ? 'CREDITO' : 'PAGADO';
        }

        return { 
          ...o, 
          estado: newState, 
          pagos: updatedPayments,
          metodoPago: isFullyPaid ? method : o.metodoPago // Maintain for legacy
        };
      }
      return o;
    }));
  };

  const addItemsToOrder = (orderId: string, itemData: Partial<OrderItem>[]) => {
    const newItems: OrderItem[] = itemData.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      productoId: item.productoId!,
      cantidad: item.cantidad || 1,
      precioUnitario: products.find(p => p.id === item.productoId)?.precio || 0,
      estado: 'PEDIDO',
      horaPedido: new Date().toLocaleTimeString(),
      timestampPedido: Date.now(),
      ...item
    }));

    const addedTotal = newItems.reduce((acc, current) => acc + (current.precioUnitario * current.cantidad), 0);

    setOrders(prev => prev.map(order => {
      if (order.id === orderId && order.fecha === selectedDate) {
        return {
          ...order,
          items: [...order.items, ...newItems],
          total: order.total + addedTotal
        };
      }
      return order;
    }));

    // Deduct stock
    setCurrentMenu(prev => prev.map(m => {
      if (m.fecha !== selectedDate) return m;
      const orderItem = newItems.find(oi => oi.productoId === m.productoId);
      if (orderItem) {
        return { ...m, stockActual: Math.max(0, m.stockActual - orderItem.cantidad) };
      }
      return m;
    }));
  };

  const updateOrderInfo = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(order => 
      (order.id === orderId && order.fecha === selectedDate) ? { ...order, ...updates } : order
    ));
  };

  const updateMenuItemStock = (productId: string, stockInicial: number, stockActual?: number) => {
    setCurrentMenu(prev => {
      const exists = prev.find(m => m.productoId === productId && m.fecha === selectedDate);
      if (!exists) {
        // If it doesn't exist for this date, create it
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          productoId: productId,
          stockInicial,
          stockActual: stockActual !== undefined ? stockActual : stockInicial,
          estado: true,
          fecha: selectedDate
        }];
      }
      return prev.map(m => {
        if (m.productoId === productId && m.fecha === selectedDate) {
          return { 
            ...m, 
            stockInicial, 
            stockActual: stockActual !== undefined ? stockActual : stockInicial
          };
        }
        return m;
      });
    });
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => {
      const orderToDelete = prev.find(o => o.id === orderId && o.fecha === selectedDate);
      if (!orderToDelete) return prev;

      // 1. Return stock for all items in the deleted order
      setCurrentMenu(mPrev => mPrev.map(m => {
        if (m.fecha !== selectedDate) return m;
        const itemsOfThisProduct = orderToDelete.items.filter(i => i.productoId === m.productoId);
        if (itemsOfThisProduct.length > 0) {
          const qtyToReturn = itemsOfThisProduct.reduce((acc, current) => acc + current.cantidad, 0);
          return { ...m, stockActual: m.stockActual + qtyToReturn };
        }
        return m;
      }));

      // 2. Remove the order
      return prev.filter(o => o.id !== orderId);
    });
  };

  const resetStock = () => {
    // 1. Filter out orders for the selected date
    setOrders(prev => prev.filter(o => o.fecha !== selectedDate));
    
    // 2. Clear order-related transactions from customer history for the selected date
    setCustomers(prev => prev.map(customer => {
      const filteredHistorial = customer.historial.filter(t => 
        !(t.fecha === selectedDate && t.tipo === 'CONSUMO')
      );
      
      // Recalculate balance based on remaining transactions
      const newSaldo = filteredHistorial.reduce((acc, t) => acc + t.monto, 0);
      
      return {
        ...customer,
        historial: filteredHistorial,
        saldo: newSaldo
      };
    }));

    // 3. Reset mesas state to initial (all LIBRE)
    setMesas(MESAS);

    console.log(`Jornada del ${selectedDate} reiniciada en memoria.`);
  };

  const addMesa = (id: string, nombre: string) => {
    setMesas(prev => [...prev, { id, nombre, estado: 'LIBRE' }]);
  };

  const deleteMesa = (id: string) => {
    requestConfirmation(
      'Eliminar Mesa',
      '¿Estás seguro de eliminar esta mesa? Los pedidos activos podrían quedar huérfanos.',
      () => {
        setMesas(prev => prev.filter(m => m.id !== id));
      }
    );
  };

  const toggleProductInMenu = (productId: string) => {
    setCurrentMenu(prev => {
      const exists = prev.find(m => m.productoId === productId && m.fecha === selectedDate);
      if (exists) {
        return prev.filter(m => !(m.productoId === productId && m.fecha === selectedDate));
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        productoId: productId,
        stockInicial: 25,
        stockActual: 25,
        estado: true,
        fecha: selectedDate
      }];
    });
  };

  return (
    <AppContext.Provider value={{
      role, setRole, orders, setOrders, products, categories, addCategory, deleteCategory, addProduct, updateProduct, deleteProduct, currentMenu, mesas, setMesas,
      createOrder, updateItemStatus, deleteItemFromOrder, updateItemQuantity, payOrder, addItemsToOrder, updateOrderInfo, updateMenuItemStock, deleteOrder, resetStock, addMesa, deleteMesa, toggleProductInMenu,
      customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, addTransaction,
      cashControls, openCash, closeCash, reopenCash, currentCash,
      confirmAction, requestConfirmation, closeConfirmation,
      selectedDate, setSelectedDate, isTodaySelected
    }}>
      {children}
      <ConfirmModal 
        isOpen={confirmAction.isOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        onConfirm={confirmAction.onConfirm}
        onCancel={confirmAction.onCancel}
      />
    </AppContext.Provider>
  );
};

const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onCancel}
      />
      <div 
        className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 slide-in-from-bottom-10 duration-300"
      >
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{message}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={onCancel}
              className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
