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
  payOrder: (orderId: string, payWithCredit?: boolean, customerId?: string) => void;
  addItemsToOrder: (orderId: string, items: Partial<OrderItem>[]) => void;
  updateOrderInfo: (orderId: string, updates: Partial<Order>) => void;
  updateMenuItemStock: (productId: string, stockInicial: number, stockActual?: number) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState('MESERO');
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
  const [orderCounter, setOrderCounter] = useState(() => {
    const saved = localStorage.getItem('order_counter');
    const savedDate = localStorage.getItem('order_counter_date');
    const today = new Date().toLocaleDateString();

    if (saved && savedDate === today) {
      return parseInt(saved, 10);
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('order_counter', orderCounter.toString());
    localStorage.setItem('order_counter_date', new Date().toLocaleDateString());
  }, [orderCounter]);

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
    return PRODUCTOS_BASE.map(p => ({
      id: `menu-${p.id}`,
      productoId: p.id,
      stockInicial: 0,
      stockActual: 0,
      fecha: new Date().toISOString().split('T')[0]
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
    const nextCount = orderCounter + 1;
    setOrderCounter(nextCount);
    const orderId = `PEDIDO-${nextCount.toString().padStart(3, '0')}`;

    const newItems: OrderItem[] = itemData.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      productoId: item.productoId!,
      cantidad: item.cantidad || 1,
      precioUnitario: products.find(p => p.id === item.productoId)?.precio || 0,
      estado: 'PEDIDO',
      horaPedido: new Date().toLocaleTimeString(),
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
      fecha: new Date().toLocaleDateString(),
      hora: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };

    // Deduct stock
    setCurrentMenu(prev => prev.map(m => {
      const orderItem = newItems.find(oi => oi.productoId === m.productoId);
      if (orderItem) {
        return { ...m, stockActual: Math.max(0, m.stockActual - orderItem.cantidad) };
      }
      return m;
    }));

    setOrders(prev => [...prev, newOrder]);
    setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, estado: 'OCUPADA' } : m));
  };

  const updateItemStatus = (orderId: string, itemId: string, status: ItemStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
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
        if (order.id !== orderId) return order;
        
        const itemToDelete = order.items.find(i => i.id === itemId);
        if (!itemToDelete) return order;

        const product = products.find(p => p.id === itemToDelete.productoId);
        const refundAmount = (product?.precio || 0) * itemToDelete.cantidad;

        // Return stock
        setCurrentMenu(mPrev => mPrev.map(m => 
          m.productoId === itemToDelete.productoId 
            ? { ...m, stockActual: m.stockActual + itemToDelete.cantidad } 
            : m
        ));

        return {
          ...order,
          items: order.items.filter(i => i.id !== itemId),
          total: Math.max(0, order.total - refundAmount)
        };
      }).filter(order => order.items.length > 0);

      // Reset mesa if no more active orders for it
      const mesaId = prev.find(o => o.id === orderId)?.mesaId;
      if (mesaId && !updatedOrders.some(o => o.mesaId === mesaId && o.estado === 'ABIERTO')) {
        setMesas(mPrev => mPrev.map(m => m.id === mesaId ? { ...m, estado: 'LIBRE' } : m));
      }

      return updatedOrders;
    });
  };

  const updateItemQuantity = (orderId: string, itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      
      const item = order.items.find(i => i.id === itemId);
      if (!item) return order;

      const product = products.find(p => p.id === item.productoId);
      const diff = newQty - item.cantidad;
      const priceChange = (product?.precio || 0) * diff;

      // Adjust stock
      setCurrentMenu(mPrev => mPrev.map(m => 
        m.productoId === item.productoId 
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
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
      };

      return {
        ...customer,
        saldo: customer.saldo + newTransaction.monto,
        historial: [newTransaction, ...customer.historial]
      };
    }));
  };

  const payOrder = (orderId: string, payWithCredit: boolean = false, customerId?: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.estado !== 'ABIERTO') return;

    // 1. Libramos la mesa
    setMesas(mPrev => mPrev.map(m => m.id === order.mesaId ? { ...m, estado: 'LIBRE' } : m));

    // 2. Procesamos transacción si es crédito
    if (payWithCredit) {
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
      ? { ...o, estado: payWithCredit ? 'CREDITO' : 'PAGADO' } 
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
      ...item
    }));

    const addedTotal = newItems.reduce((acc, current) => acc + (current.precioUnitario * current.cantidad), 0);

    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
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
      const orderItem = newItems.find(oi => oi.productoId === m.productoId);
      if (orderItem) {
        return { ...m, stockActual: Math.max(0, m.stockActual - orderItem.cantidad) };
      }
      return m;
    }));
  };

  const updateOrderInfo = (orderId: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, ...updates } : order
    ));
  };

  const updateMenuItemStock = (productId: string, stockInicial: number, stockActual?: number) => {
    setCurrentMenu(prev => prev.map(m => {
      if (m.productoId === productId) {
        return { 
          ...m, 
          stockInicial, 
          stockActual: stockActual !== undefined ? stockActual : stockInicial 
        };
      }
      return m;
    }));
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => {
      const orderToDelete = prev.find(o => o.id === orderId);
      if (!orderToDelete) return prev;

      // 1. Return stock for all items in the deleted order
      setCurrentMenu(mPrev => mPrev.map(m => {
        const itemsOfThisProduct = orderToDelete.items.filter(i => i.productoId === m.productoId);
        if (itemsOfThisProduct.length > 0) {
          const qtyToReturn = itemsOfThisProduct.reduce((acc, current) => acc + current.cantidad, 0);
          return { ...m, stockActual: m.stockActual + qtyToReturn };
        }
        return m;
      }));

      // 2. Free mesa if it was active
      if (orderToDelete.estado === 'ABIERTO') {
        setMesas(mesasPrev => mesasPrev.map(m => 
          m.id === orderToDelete.mesaId ? { ...m, estado: 'LIBRE' } : m
        ));
      }

      // 3. Remove the order
      return prev.filter(o => o.id !== orderId);
    });
  };

  const resetStock = () => {
    // 1. Clear daily localStorage items synchronously
    localStorage.removeItem('orders');
    localStorage.removeItem('order_counter');
    localStorage.removeItem('order_counter_date');
    localStorage.removeItem('currentMenu');
    localStorage.removeItem('mesas');
    
    // Reset customers (clear history and balance)
    const resetCustomers = customers.map(c => ({ ...c, saldo: 0, historial: [] }));
    localStorage.setItem('customers', JSON.stringify(resetCustomers));
    
    // Also clear any other potential daily keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('order') || key.includes('menu') || key.includes('mesa'))) {
            localStorage.removeItem(key);
            i--; // Adjust index after removal
        }
    }

    console.log('Jornada reset. Reloading...');

    // 2. Clear states in memory
    setOrders([]);
    setOrderCounter(0);
    setMesas(MESAS);
    setCurrentMenu(prev => prev.map(m => ({ ...m, stockInicial: 0, stockActual: 0 })));
    setCustomers(resetCustomers);
    
    // 3. Force reload to ensure everything starts from clean state
    window.location.reload();
  };

  const addMesa = (id: string, nombre: string) => {
    setMesas(prev => [...prev, { id, nombre, estado: 'LIBRE' }]);
  };

  const toggleProductInMenu = (productId: string) => {
    setCurrentMenu(prev => {
      const exists = prev.find(m => m.productoId === productId);
      if (exists) {
        return prev.filter(m => m.productoId !== productId);
      }
      return [...prev, {
        id: `menu-${productId}`,
        productoId: productId,
        stockInicial: 25,
        stockActual: 25,
        fecha: new Date().toISOString().split('T')[0]
      }];
    });
  };

  return (
    <AppContext.Provider value={{
      role, setRole, orders, setOrders, products, addProduct, updateProduct, deleteProduct, currentMenu, mesas, setMesas,
      createOrder, updateItemStatus, deleteItemFromOrder, updateItemQuantity, payOrder, addItemsToOrder, updateOrderInfo, updateMenuItemStock, deleteOrder, resetStock, addMesa, toggleProductInMenu,
      customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, addTransaction,
      confirmAction, requestConfirmation, closeConfirmation
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
