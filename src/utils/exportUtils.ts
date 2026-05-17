/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Order, Customer, Product } from '../types';

export const exportToExcel = (
  orders: Order[],
  customers: Customer[],
  products: Product[],
  selectedDate: string
) => {
  const wb = XLSX.utils.book_new();

  // 1. Pedidos (Orders)
  const ordersData = orders.map(order => {
    const itemsDescription = order.items.map(item => {
      const product = products.find(p => p.id === item.productoId);
      return `${item.cantidad}x ${product?.nombre || 'Desconocido'}`;
    }).join(', ');

    return {
      'ID Pedido': order.id,
      'Mesa': order.mesaId === '13' ? 'Para llevar' : `Mesa ${order.mesaId}`,
      'Cliente': order.cliente,
      'Total': order.total,
      'Estado': order.estado,
      'Método Pago': order.metodoPago || '-',
      'Detalle Items': itemsDescription,
      'Hora': order.hora
    };
  });
  const wsOrders = XLSX.utils.json_to_sheet(ordersData);
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Pedidos');

  // 2. Caja (Cash Summary)
  const efectivo = orders.filter(o => o.metodoPago === 'EFECTIVO' && o.estado === 'PAGADO').reduce((acc, o) => acc + o.total, 0);
  const yape = orders.filter(o => o.metodoPago === 'YAPE' && o.estado === 'PAGADO').reduce((acc, o) => acc + o.total, 0);
  const creditoVendido = orders.filter(o => o.estado === 'CREDITO').reduce((acc, o) => acc + o.total, 0);
  
  const customerPayments = customers.flatMap(c => 
    c.historial.filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
  ).reduce((acc, t) => acc + t.monto, 0);

  const cashData = [
    { 'Concepto': 'Efectivo en Ventas', 'Monto': efectivo },
    { 'Concepto': 'Yape en Ventas', 'Monto': yape },
    { 'Concepto': 'Cobros a Clientes (Abonos)', 'Monto': customerPayments },
    { 'Concepto': 'Total en Caja (Real)', 'Monto': efectivo + yape + customerPayments },
    { 'Concepto': 'Ventas a Crédito (Pendiente)', 'Monto': creditoVendido }
  ];
  const wsCash = XLSX.utils.json_to_sheet(cashData);
  XLSX.utils.book_append_sheet(wb, wsCash, 'Resumen Caja');

  // 3. Cuentas (Customer Transactions)
  const transactionsData = customers.flatMap(c => 
    c.historial.filter(t => t.fecha === selectedDate).map(t => ({
      'Cliente': c.nombre,
      'Tipo': t.tipo,
      'Monto': t.monto,
      'Descripción': t.descripcion,
      'Hora': t.hora
    }))
  );
  const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Cuentas_Clientes');

  // Generate and download
  XLSX.writeFile(wb, `Reporte_Sabor_Abanquino_${selectedDate.replace(/\//g, '-')}.xlsx`);
};
