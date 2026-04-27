/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, Product, Mesa, MenuItem, PRODUCTOS_BASE, MESAS, OrderItem, ItemStatus, Customer, CustomerTransaction, TransactionType } from './types';

interface AppContextType {
  role: string;
  setRole: (role: string) => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
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
  payOrder: (orderId: string, method: 'EFECTIVO' | 'YAPE' | 'CREDITO', customerId?: string) => void;
  addItemsToOrder: (orderId: string, items: Partial<OrderItem>[]) => void;
  updateOrderInfo: (orderId: string, updates: Partial<Order>) => void;
  updateMenuItemStock: (productId: string, stockInicial: number, stockActual?: number, stockMinimo?: number) => void;
  deleteOrder: (orderId: string) => void;
  resetStock: () => void;
  addMesa: (id: string, nombre: string) => void;
  toggleProductInMenu: (productId: string) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  addCustomer: (customer: Omit<Customer, 'id' | 'saldo' | 'historial'>) => void;
  updateCustomer: (id: string, customer: Partial<Omit<Customer, 'id' | 'saldo' | 'historial'>>) => void;
  deleteCustomer: (id: string) => void;
  addTransaction: (customerId: string, transaction: Omit<CustomerTransaction, 'id' | 'fecha' | 'hora'>) => void;
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
  const [role, setRole] = useState('MESERO');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString());
  const isTodaySelected = selectedDate === new Date().toLocaleDateString();
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
  const [mesas, setMesas] = useState<Mesa[]>(() => {
    const saved = localStorage.getItem('mesas');
    return saved ? JSON.parse(saved) : MESAS;
  });
  const [currentMenu, setCurrentMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('currentMenu');
    if (saved) return JSON.parse(saved);
    // Initial menu for today only
    const today = new Date().toLocaleDateString();
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

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

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

  const payOrder = (orderId: string, method: 'EFECTIVO' | 'YAPE' | 'CREDITO', customerId?: string) => {
    const order = orders.find(o => o.id === orderId && o.fecha === selectedDate);
    if (!order || order.estado !== 'ABIERTO') return;

    // 1. Libramos la mesa check removed as it is derived from orders
    
    // 2. Procesamos transacción si es crédito
    if (method === 'CREDITO') {
      const customer = customerId 
        ? customers.find(c => c.id === customerId)
        : customers.find(c => c.nombre.toLowerCase() === order.cliente.toLowerCase());
        
      if (customer) {
        addTransaction(customer.id, {
          tipo: 'CONSUMO',
          monto: -order.total,
          descripcion: `Consumo en orden ${order.id}`,
          orderId: order.id
        });
      }
    }

    // 3. Actualizamos estado del pedido
    setOrders(prev => prev.map(o => o.id === orderId 
      ? { ...o, estado: method === 'CREDITO' ? 'CREDITO' : 'PAGADO', metodoPago: method } 
      : o
    ));
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

  const updateMenuItemStock = (productId: string, stockInicial: number, stockActual?: number, stockMinimo?: number) => {
    setCurrentMenu(prev => {
      const exists = prev.find(m => m.productoId === productId && m.fecha === selectedDate);
      if (!exists) {
        // If it doesn't exist for this date, create it
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          productoId: productId,
          stockInicial,
          stockActual: stockActual !== undefined ? stockActual : stockInicial,
          stockMinimo: stockMinimo !== undefined ? stockMinimo : 0,
          estado: true,
          fecha: selectedDate
        }];
      }
      return prev.map(m => {
        if (m.productoId === productId && m.fecha === selectedDate) {
          return { 
            ...m, 
            stockInicial, 
            stockActual: stockActual !== undefined ? stockActual : stockInicial,
            stockMinimo: stockMinimo !== undefined ? stockMinimo : m.stockMinimo
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
      role, setRole, orders, setOrders, products, addProduct, updateProduct, deleteProduct, currentMenu, mesas, setMesas,
      createOrder, updateItemStatus, deleteItemFromOrder, updateItemQuantity, payOrder, addItemsToOrder, updateOrderInfo, updateMenuItemStock, deleteOrder, resetStock, addMesa, toggleProductInMenu,
      customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, addTransaction,
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
