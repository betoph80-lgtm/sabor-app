/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'ADMIN' | 'MESERO' | 'COCINA' | 'CAJA';

export type ItemStatus = 'PEDIDO' | 'EN_PREPARACION' | 'LISTO' | 'SERVIDO';

export type OrderStatus = 'ABIERTO' | 'PAGADO' | 'CANCELADO' | 'CREDITO';

export type TransactionType = 'DEPOSITO' | 'CONSUMO' | 'PAGO_CREDITO';

export interface CustomerTransaction {
  id: string;
  fecha: string;
  hora: string;
  timestamp?: number;
  tipo: TransactionType;
  monto: number; // Positivo para depósitos/pagos, negativo para consumos (o manejar con tipo)
  descripcion: string;
  orderId?: string;
}

export interface Customer {
  id: string;
  nombre: string;
  documento?: string; // DNI, RUC
  telefono?: string;
  saldo: number; // Positivo es saldo a favor, negativo es deuda
  historial: CustomerTransaction[];
}

export interface Product {
  id: string;
  nombre: string;
  categoria: 'MENÚ' | 'EXTRA' | 'BEBIDA';
  tipo?: 'SOPA' | 'SEGUNDO'; // Para el menú de 9 soles
  precio: number;
  imagen?: string;
}

export interface MenuItem {
  id: string;
  productoId: string;
  stockInicial: number;
  stockActual: number;
  stockMinimo?: number;
  estado: boolean;
  fecha: string;
}

export interface OrderItem {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  estado: ItemStatus;
  notas?: string;
  horaPedido: string;
  timestampPedido: number;
}

export interface Order {
  id: string;
  mesaId: string;
  cliente: string;
  items: OrderItem[];
  estado: OrderStatus;
  total: number;
  metodoPago?: 'EFECTIVO' | 'YAPE' | 'CREDITO';
  usuarioId: string;
  fecha: string;
  hora: string;
  timestamp: number;
}

export interface Mesa {
  id: string;
  nombre: string;
  estado: 'LIBRE' | 'OCUPADA' | 'RESERVADA';
}

export const PRODUCTOS_BASE: Product[] = [
  { id: 's1', nombre: 'Sopa del Día', categoria: 'MENÚ', tipo: 'SOPA', precio: 0 },
  { id: 'm1', nombre: 'Lomo Saltado', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 },
  { id: 'm2', nombre: 'Pollo al Horno', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 },
  { id: 'm3', nombre: 'Ceviche', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 },
  { id: 'm4', nombre: 'Seco de Res', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9 },
  { id: 'e1', nombre: 'Chicharrón de Cerdo', categoria: 'EXTRA', precio: 20 },
  { id: 'e2', nombre: 'Cuy al Horno', categoria: 'EXTRA', precio: 25 },
  { id: 'b1', nombre: 'Inca Kola 500ml', categoria: 'BEBIDA', precio: 3.5 },
  { id: 'b2', nombre: 'Chicha Morada Jarra', categoria: 'BEBIDA', precio: 10 },
];

export const MESAS: Mesa[] = Array.from({ length: 12 }, (_, i) => ({
  id: `${i + 1}`,
  nombre: `Mesa ${String(i + 1).padStart(2, '0')}`,
  estado: 'LIBRE',
}));

MESAS.push({ id: '13', nombre: 'Para llevar', estado: 'LIBRE' });
