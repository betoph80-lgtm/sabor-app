/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppIdentity {
  nombre: string;
  nombreCorto: string;
  eslogan: string;
  logoUrl: string;
}

export type Role = 'ADMIN' | 'MESERO' | 'COCINA' | 'CAJA' | 'PEDIDOS' | 'CUENTAS';

export type AdminSubView = 'DASHBOARD' | 'APERTURA_CIERRE' | 'PANEL' | 'PRODUCTOS' | 'CATEGORIAS' | 'USUARIOS' | 'MESAS' | 'IDENTIDAD' | 'REPORTES' | 'CONTABILIDAD';

export interface AppUser {
  id: string;
  usuario: string; // Nombre de usuario para login
  nombre: string;  // Nombre para mostrar
  role: Role;
  pin: string;     // Usado como contraseña
  email?: string;
}

export const USUARIOS_BASE: AppUser[] = [
  { id: 'u1', usuario: 'admin', nombre: 'Administrador', role: 'ADMIN', pin: '1234' },
  { id: 'u2', usuario: 'mesero', nombre: 'Mesero Beta', role: 'MESERO', pin: '0000' },
  { id: 'u3', usuario: 'cocina', nombre: 'Cocinero Alfa', role: 'COCINA', pin: '1111' },
  { id: 'u4', usuario: 'caja', nombre: 'Cajero Gamma', role: 'CAJA', pin: '2222' },
];

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
  metodoPago?: 'EFECTIVO' | 'YAPE';
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
  categoria: string;
  tipo?: string; 
  precio: number;
  imagen?: string;
}

export const DEFAULT_CATEGORIES = ['MENÚ', 'EXTRA', 'BEBIDA'];
export const MENU_TYPES = ['SOPA', 'SEGUNDO'];

export interface MenuItem {
  id: string;
  productoId: string;
  stockInicial: number;
  stockActual: number;
  estado: boolean;
  fecha: string;
  precioPersonalizado?: number;
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
  usuarioId?: string;
  usuarioNombre?: string;
  timestampServido?: number;
}

export interface Payment {
  id: string;
  pedidoId: string;
  monto: number;
  metodo: 'EFECTIVO' | 'YAPE' | 'CREDITO' | 'PLIN';
  usuarioNombre?: string;
  fecha: string;
  hora: string;
  timestamp: number;
}

export type CashControlStatus = 'ABIERTA' | 'CERRADA';

export interface DailyCashControl {
  id: string;
  fecha: string;
  montoApertura: number;
  ingresosEfectivo: number;
  ingresosYape: number;
  ingresosFiar: number; // Créditos otorgados hoy
  montoCierre: number;
  efectivoFisico?: number;
  diferencia?: number;
  estado: CashControlStatus;
  horaApertura: string;
  horaCierre?: string;
  usuarioId: string;
}

export interface Order {
  id: string;
  mesaId: string;
  cliente: string;
  items: OrderItem[];
  estado: OrderStatus;
  total: number;
  metodoPago?: 'EFECTIVO' | 'YAPE' | 'CREDITO'; // Maintain for legacy/single payments
  pagos?: Payment[];
  usuarioId: string;
  usuarioNombre?: string;
  fecha: string;
  hora: string;
  timestamp: number;
}

export interface Mesa {
  id: string;
  nombre: string;
  estado: 'LIBRE' | 'OCUPADA' | 'RESERVADA';
  sillas?: number;
}

export const PRODUCTOS_BASE: Product[] = [
  { id: 's1', nombre: 'Sopa del Día', categoria: 'MENÚ', tipo: 'SOPA', precio: 0, imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&auto=format&fit=crop&q=80' },
  { id: 'm1', nombre: 'Lomo Saltado', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9, imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80' },
  { id: 'm2', nombre: 'Pollo al Horno', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9, imagen: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&auto=format&fit=crop&q=80' },
  { id: 'm3', nombre: 'Ceviche', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9, imagen: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&auto=format&fit=crop&q=80' },
  { id: 'm4', nombre: 'Seco de Res', categoria: 'MENÚ', tipo: 'SEGUNDO', precio: 9, imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80' },
  { id: 'e1', nombre: 'Chicharrón de Cerdo', categoria: 'EXTRA', precio: 20, imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80' },
  { id: 'e2', nombre: 'Cuy al Horno', categoria: 'EXTRA', precio: 25 },
  { id: 'b1', nombre: 'Inca Kola 500ml', categoria: 'BEBIDA', precio: 3.5, imagen: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80' },
  { id: 'b2', nombre: 'Chicha Morada Jarra', categoria: 'BEBIDA', precio: 10, imagen: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80' },
];

export const MESAS: Mesa[] = Array.from({ length: 12 }, (_, i) => ({
  id: `${i + 1}`,
  nombre: `Mesa ${String(i + 1).padStart(2, '0')}`,
  estado: 'LIBRE',
}));

MESAS.push({ id: '13', nombre: 'Para Llevar', estado: 'LIBRE' });

// ==========================================
// 🇵🇪 PLAN CONTABLE GENERAL EMPRESARIAL (PCGE) & SUNAT
// ==========================================

export interface AccountingEntryRow {
  cuenta: string; // Ej: 1212, 40111, 70121, 1011, 1041, 6011, 4212, etc.
  denominacion: string;
  debe: number;
  haber: number;
}

export interface AccountingEntry {
  id: string;
  fecha: string;
  glosa: string;
  libroSugerido: 'REGISTRO_VENTAS' | 'REGISTRO_COMPRAS' | 'LIBRO_DIARIO' | 'LIBRO_CAJA_BANCOS';
  filas: AccountingEntryRow[];
  totalDebe: number;
  totalHaber: number;
  tipoOperacion: 'VENTA' | 'COMPRA' | 'COBRANZA' | 'PAGO_GASTO' | 'APERTURA' | 'AJUSTE';
  referenciaId?: string; // ID de orden o compra
  timestamp: number;
}

export interface TaxSummary {
  baseImponible: number;
  igv: number;
  total: number;
  tasaIgv: number; // 0.18 por defecto
  esInafecto?: boolean;
  esExonerado?: boolean;
  detraccion?: {
    aplica: boolean;
    tasa: number; // Ej: 0.04, 0.10, 0.12
    monto: number;
    concepto: string;
  };
}

export interface PurchaseRecord {
  id: string;
  fecha: string;
  proveedor: string;
  rucProveedor: string;
  tipoComprobante: 'FACTURA' | 'BOLETA' | 'RECIBO_HONORARIOS' | 'TICKET';
  serieNumero: string;
  baseImponible: number;
  igv: number;
  total: number;
  categoria: 'INSUMOS_ALIMENTOS' | 'BEBIDAS' | 'SERVICIOS_BASICOS' | 'ALQUILER' | 'TRANSPORTE' | 'MANTENIMIENTO' | 'OTROS';
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'CREDITO';
  detraccionAplica?: boolean;
  tasaDetraccion?: number;
  montoDetraccion?: number;
  bancarizado?: boolean; // Obligatorio si total > S/ 2,000 o $500
  observaciones?: string;
  timestamp: number;
}

export interface FiscalConfig {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionFiscal: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  regimenTributario: 'MYPE_TRIBUTARIO' | 'REGIMEN_GENERAL' | 'REGIMEN_ESPECIAL';
  tasaRentaMensual: number; // 0.01 (1.0% RMT) o 0.015 (1.5% RG)
  uitVigente: number; // 2024: S/ 5,150
  tasaIgv: number; // 0.18
  serieBoleta: string; // Ej: B001
  serieFactura: string; // Ej: F001
}

