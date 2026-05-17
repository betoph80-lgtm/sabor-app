/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Order, Product, Mesa, MenuItem, PRODUCTOS_BASE, MESAS, 
  OrderItem, ItemStatus, Customer, CustomerTransaction, 
  DailyCashControl, Payment 
} from './types';
import { db, auth } from './firebase';
import { 
  collection, doc, onSnapshot, setDoc, updateDoc, 
  deleteDoc, query, where, addDoc, getDocs, 
  getDoc, writeBatch, serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app we might show a toast, but here we'll just log and let react state handle it
}

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
  seedDatabase: () => Promise<void>;
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
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['MENÚ', 'EXTRA', 'BEBIDA']);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [currentMenu, setCurrentMenu] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashControls, setCashControls] = useState<DailyCashControl[]>([]);
  
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

  // 🔥 AUTH
  useEffect(() => {
    signInAnonymously(auth).catch(err => {
      console.error('Anonymous sign-in failed:', err);
    });
  }, []);

  // 🔥 REAL-TIME LISTENERS
  useEffect(() => {
    // 1. MESAS
    const unsubscribeMesas = onSnapshot(collection(db, 'mesas'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mesa));
      if (data.length === 0 && isTodaySelected) {
        // SEED MESAS
        MESAS.forEach(m => setDoc(doc(db, 'mesas', m.id), m));
      } else {
        setMesas(data.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })));
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'mesas'));

    // 2. PRODUCTOS
    const unsubscribeProducts = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      if (data.length === 0 && isTodaySelected) {
        // SEED PRODUCTS
        PRODUCTOS_BASE.forEach(p => setDoc(doc(db, 'productos', p.id), p));
      } else {
        setProducts(data);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'productos'));

    // 3. CATEGORÍAS
    const unsubscribeCategories = onSnapshot(collection(db, 'categorias'), (snapshot) => {
      if (snapshot.empty && isTodaySelected) {
        ['MENÚ', 'EXTRA', 'BEBIDA'].forEach(c => addDoc(collection(db, 'categorias'), { nombre: c }));
      } else {
        setCategories(snapshot.docs.map(doc => doc.data().nombre));
      }
    });

    // 4. CLIENTES
    const unsubscribeCustomers = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    return () => {
      unsubscribeMesas();
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeCustomers();
    };
  }, []);

  // FILTRADO POR FECHA (Real-time para la fecha seleccionada)
  useEffect(() => {
    // 5. PEDIDOS
    const qOrders = query(collection(db, 'pedidos'), where('fecha', '==', selectedDate));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data() } as Order)));
    });

    // 6. MENU DIARIO
    const qMenu = query(collection(db, 'menu_diario'), where('fecha', '==', selectedDate));
    const unsubscribeMenu = onSnapshot(qMenu, (snapshot) => {
      setCurrentMenu(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });

    // 7. CONTROL DE CAJA
    const qCash = query(collection(db, 'control_caja'), where('fecha', '==', selectedDate));
    const unsubscribeCash = onSnapshot(qCash, (snapshot) => {
      setCashControls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyCashControl)));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
      unsubscribeCash();
    };
  }, [selectedDate]);

  const currentCash = cashControls.find(c => c.fecha === selectedDate);

  // 🔥 MUTATIONS
  const addCategory = (name: string) => {
    if (!categories.includes(name.toUpperCase())) {
      addDoc(collection(db, 'categorias'), { nombre: name.toUpperCase() });
    }
  };

  const deleteCategory = (name: string) => {
    if (['MENÚ', 'EXTRA', 'BEBIDA'].includes(name)) return;
    requestConfirmation(
      'Eliminar Categoría',
      `¿Estás seguro de eliminar la categoría "${name}"?`,
      async () => {
        const q = query(collection(db, 'categorias'), where('nombre', '==', name));
        const snap = await getDocs(q);
        snap.forEach(d => deleteDoc(d.ref));
      }
    );
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setDoc(doc(db, 'productos', id), { ...product, id });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    updateDoc(doc(db, 'productos', id), updates);
  };

  const deleteProduct = (id: string) => {
    requestConfirmation(
      'Eliminar Producto',
      '¿Estás seguro de eliminar este producto?',
      () => deleteDoc(doc(db, 'productos', id))
    );
  };

  const createOrder = async (mesaId: string, cliente: string, itemData: Partial<OrderItem>[]) => {
    const dailyOrders = orders.filter(o => o.fecha === selectedDate);
    const lastNum = dailyOrders.reduce((max, o) => {
      const parts = o.id.split('-');
      const num = parseInt(parts[1]);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const orderId = `PEDIDO-${(lastNum + 1).toString().padStart(3, '0')}`;

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

    // Update stock and mark mesa
    const batch = writeBatch(db);
    batch.set(doc(db, 'pedidos', orderId), newOrder);
    batch.update(doc(db, 'mesas', mesaId), { estado: 'OCUPADA' });

    // Stock deduction
    newItems.forEach(item => {
      const menuI = currentMenu.find(m => m.productoId === item.productoId && m.fecha === selectedDate);
      if (menuI) {
        batch.update(doc(db, 'menu_diario', menuI.id), {
          stockActual: Math.max(0, menuI.stockActual - item.cantidad)
        });
      }
    });

    await batch.commit();
  };

  const updateItemStatus = (orderId: string, itemId: string, status: ItemStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const newItems = order.items.map(i => i.id === itemId ? { ...i, estado: status } : i);
    updateDoc(doc(db, 'pedidos', orderId), { items: newItems });
  };

  const deleteItemFromOrder = async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const itemToDelete = order.items.find(i => i.id === itemId);
    if (!itemToDelete) return;

    const newItems = order.items.filter(i => i.id !== itemId);
    const newTotal = newItems.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0);

    const batch = writeBatch(db);
    if (newItems.length === 0) {
      batch.delete(doc(db, 'pedidos', orderId));
      batch.update(doc(db, 'mesas', order.mesaId), { estado: 'LIBRE' });
    } else {
      batch.update(doc(db, 'pedidos', orderId), { items: newItems, total: newTotal });
    }

    // Return stock
    const menuI = currentMenu.find(m => m.productoId === itemToDelete.productoId && m.fecha === selectedDate);
    if (menuI) {
      batch.update(doc(db, 'menu_diario', menuI.id), {
        stockActual: menuI.stockActual + itemToDelete.cantidad
      });
    }

    await batch.commit();
  };

  const updateItemQuantity = async (orderId: string, itemId: string, newQty: number) => {
    if (newQty < 1) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const item = order.items.find(i => i.id === itemId);
    if (!item) return;

    const diff = newQty - item.cantidad;
    const newItems = order.items.map(i => i.id === itemId ? { ...i, cantidad: newQty } : i);
    const newTotal = newItems.reduce((acc, i) => acc + (i.precioUnitario * i.cantidad), 0);

    const batch = writeBatch(db);
    batch.update(doc(db, 'pedidos', orderId), { items: newItems, total: newTotal });

    const menuI = currentMenu.find(m => m.productoId === item.productoId && m.fecha === selectedDate);
    if (menuI) {
      batch.update(doc(db, 'menu_diario', menuI.id), {
        stockActual: Math.max(0, menuI.stockActual - diff)
      });
    }
    await batch.commit();
  };

  const openCash = (montoApertura: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newControl: DailyCashControl = {
      id,
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
    setDoc(doc(db, 'control_caja', id), newControl);
  };

  const closeCash = () => {
    if (!currentCash || currentCash.estado !== 'ABIERTA') return;
    requestConfirmation(
      'Cerrar Caja',
      `¿Estás seguro de cerrar la caja de hoy?`,
      () => {
        updateDoc(doc(db, 'control_caja', currentCash.id), {
          estado: 'CERRADA',
          horaCierre: new Date().toLocaleTimeString(),
          montoCierre: currentCash.montoApertura + currentCash.ingresosEfectivo + currentCash.ingresosYape
        });
      }
    );
  };

  const reopenCash = () => {
    if (!currentCash || currentCash.estado !== 'CERRADA') return;
    requestConfirmation(
      'Reabrir Caja',
      '¿Deseas reabrir la caja de hoy?',
      () => updateDoc(doc(db, 'control_caja', currentCash.id), {
        estado: 'ABIERTA',
        horaCierre: null,
        montoCierre: 0
      })
    );
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'saldo' | 'historial'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setDoc(doc(db, 'clientes', id), {
      ...customerData,
      id,
      saldo: 0,
      historial: []
    });
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    updateDoc(doc(db, 'clientes', id), updates);
  };

  const deleteCustomer = (id: string) => {
    deleteDoc(doc(db, 'clientes', id));
  };

  const addTransaction = (customerId: string, transactionData: Omit<CustomerTransaction, 'id' | 'fecha' | 'hora'>) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const newT: CustomerTransaction = {
      ...transactionData,
      id: Math.random().toString(36).substr(2, 9),
      fecha: selectedDate,
      hora: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };

    updateDoc(doc(db, 'clientes', customerId), {
      saldo: customer.saldo + newT.monto,
      historial: [newT, ...customer.historial]
    });
  };

  const payOrder = async (orderId: string, method: 'EFECTIVO' | 'YAPE' | 'CREDITO', amount: number, customerId?: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.estado === 'PAGADO') return;
    if (!currentCash || currentCash.estado !== 'ABIERTA') {
      alert(`Debe abrir la caja para la fecha ${selectedDate}`);
      return;
    }

    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      pedidoId: orderId,
      monto: amount,
      metodo: method,
      fecha: selectedDate,
      hora: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };

    const updatedPayments = [...(order.pagos || []), newPayment];
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.monto, 0);
    const isFullyPaid = totalPaid >= order.total - 0.01;
    
    const hasCredit = updatedPayments.some(p => p.metodo === 'CREDITO');
    const newState = isFullyPaid ? (hasCredit ? 'CREDITO' : 'PAGADO') : order.estado;

    const batch = writeBatch(db);
    batch.update(doc(db, 'pedidos', orderId), {
      estado: newState,
      pagos: updatedPayments
    });

    if (isFullyPaid) {
      batch.update(doc(db, 'mesas', order.mesaId), { estado: 'LIBRE' });
    }

    batch.update(doc(db, 'control_caja', currentCash.id), {
      ingresosEfectivo: currentCash.ingresosEfectivo + (method === 'EFECTIVO' ? amount : 0),
      ingresosYape: currentCash.ingresosYape + (method === 'YAPE' ? amount : 0),
      ingresosFiar: currentCash.ingresosFiar + (method === 'CREDITO' ? amount : 0),
    });

    if (method === 'CREDITO') {
      const cust = customerId ? customers.find(c => c.id === customerId) : customers.find(c => c.nombre.toLowerCase() === order.cliente.toLowerCase());
      if (cust) {
        const newT: CustomerTransaction = {
          id: Math.random().toString(36).substr(2, 9),
          tipo: 'CONSUMO',
          monto: -amount,
          descripcion: `Pago parcial (FIAR) en orden ${order.id}`,
          orderId: order.id,
          fecha: selectedDate,
          hora: new Date().toLocaleTimeString(),
          timestamp: Date.now()
        };
        batch.update(doc(db, 'clientes', cust.id), {
          saldo: cust.saldo + newT.monto,
          historial: [newT, ...cust.historial]
        });
      }
    }

    await batch.commit();
  };

  const addItemsToOrder = async (orderId: string, itemData: Partial<OrderItem>[]) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

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
    const batch = writeBatch(db);

    batch.update(doc(db, 'pedidos', orderId), {
      items: [...order.items, ...newItems],
      total: order.total + addedTotal
    });

    newItems.forEach(item => {
      const menuI = currentMenu.find(m => m.productoId === item.productoId && m.fecha === selectedDate);
      if (menuI) {
        batch.update(doc(db, 'menu_diario', menuI.id), {
          stockActual: Math.max(0, menuI.stockActual - item.cantidad)
        });
      }
    });

    await batch.commit();
  };

  const updateOrderInfo = (orderId: string, updates: Partial<Order>) => {
    updateDoc(doc(db, 'pedidos', orderId), updates);
  };

  const updateMenuItemStock = (productId: string, stockInicial: number, stockActual?: number) => {
    const exists = currentMenu.find(m => m.productoId === productId && m.fecha === selectedDate);
    if (!exists) {
      const id = Math.random().toString(36).substr(2, 9);
      setDoc(doc(db, 'menu_diario', id), {
        id,
        productoId: productId,
        stockInicial,
        stockActual: stockActual !== undefined ? stockActual : stockInicial,
        estado: true,
        fecha: selectedDate
      });
    } else {
      updateDoc(doc(db, 'menu_diario', exists.id), {
        stockInicial,
        stockActual: stockActual !== undefined ? stockActual : stockInicial
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const batch = writeBatch(db);
    batch.delete(doc(db, 'pedidos', orderId));
    batch.update(doc(db, 'mesas', order.mesaId), { estado: 'LIBRE' });

    order.items.forEach(item => {
      const menuI = currentMenu.find(m => m.productoId === item.productoId && m.fecha === selectedDate);
      if (menuI) {
        batch.update(doc(db, 'menu_diario', menuI.id), {
          stockActual: menuI.stockActual + item.cantidad
        });
      }
    });

    await batch.commit();
  };

  const resetStock = async () => {
    const batch = writeBatch(db);
    
    // Reset orders
    orders.forEach(o => batch.delete(doc(db, 'pedidos', o.id)));
    
    // Reset mesas
    mesas.forEach(m => batch.update(doc(db, 'mesas', m.id), { estado: 'LIBRE' }));
    
    // Reset menu items
    currentMenu.forEach(m => batch.update(doc(db, 'menu_diario', m.id), { stockActual: m.stockInicial }));

    await batch.commit();
  };

  const addMesa = (id: string, nombre: string) => {
    setDoc(doc(db, 'mesas', id), { id, nombre, estado: 'LIBRE' });
  };

  const deleteMesa = (id: string) => {
    requestConfirmation('Eliminar Mesa', '¿Estás seguro?', () => deleteDoc(doc(db, 'mesas', id)));
  };

  const seedDatabase = async () => {
    const batch = writeBatch(db);
    
    // Seed Mesas
    MESAS.forEach(m => {
      batch.set(doc(db, 'mesas', m.id), m);
    });

    // Seed Products
    PRODUCTOS_BASE.forEach(p => {
      batch.set(doc(db, 'productos', p.id), p);
    });

    // Seed Categories
    ['MENÚ', 'EXTRA', 'BEBIDA'].forEach(c => {
      const docId = c.toLowerCase().replace(/\s/g, '_');
      batch.set(doc(db, 'categorias', docId), { nombre: c });
    });

    await batch.commit();
  };

  const toggleProductInMenu = (productId: string) => {
    const exists = currentMenu.find(m => m.productoId === productId && m.fecha === selectedDate);
    if (exists) {
      deleteDoc(doc(db, 'menu_diario', exists.id));
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      setDoc(doc(db, 'menu_diario', id), {
        id,
        productoId: productId,
        stockInicial: 25,
        stockActual: 25,
        estado: true,
        fecha: selectedDate
      });
    }
  };

  return (
    <AppContext.Provider value={{
      role, setRole, orders, setOrders, products, categories, addCategory, deleteCategory, addProduct, updateProduct, deleteProduct, currentMenu, mesas, setMesas,
      createOrder, updateItemStatus, deleteItemFromOrder, updateItemQuantity, payOrder, addItemsToOrder, updateOrderInfo, updateMenuItemStock, deleteOrder, resetStock, addMesa, deleteMesa, toggleProductInMenu,
      customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, addTransaction,
      cashControls, openCash, closeCash, reopenCash, currentCash,
      confirmAction, requestConfirmation, closeConfirmation,
      selectedDate, setSelectedDate, isTodaySelected,
      seedDatabase
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel}/>
      <div className="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-slate-100">
        <div className="space-y-4 text-center">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">{message}</p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button onClick={onCancel} className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
            <button onClick={onConfirm} className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-100">Confirmar</button>
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
