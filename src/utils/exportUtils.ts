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

    let paymentMethodDisplay = order.metodoPago || (order.estado === 'ABIERTO' ? 'PENDIENTE' : 'EFECTIVO');
    if (order.pagos && order.pagos.length > 0) {
      if (order.pagos.length === 1) {
        paymentMethodDisplay = order.pagos[0].metodo;
      } else {
        paymentMethodDisplay = `MIXTO (${order.pagos.map(p => `${p.metodo}: S/ ${p.monto.toFixed(2)}`).join(', ')})`;
      }
    }

    return {
      'ID Pedido': order.id,
      'Mesa': order.mesaId === '13' ? 'Para llevar' : `Mesa ${order.mesaId}`,
      'Cliente': order.cliente,
      'Total': order.total,
      'Estado': order.estado,
      'Método Pago': paymentMethodDisplay,
      'Detalle Items': itemsDescription,
      'Hora': order.hora
    };
  });
  const wsOrders = XLSX.utils.json_to_sheet(ordersData);
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Pedidos');

  // 2. Caja (Cash Summary)
  const allPayments = orders.flatMap(o => o.pagos || []);
  const efectivo = allPayments.length > 0
    ? allPayments.filter(p => p.metodo === 'EFECTIVO').reduce((acc, p) => acc + p.monto, 0)
    : orders.filter(o => o.metodoPago === 'EFECTIVO' && o.estado === 'PAGADO').reduce((acc, o) => acc + o.total, 0);

  const yape = allPayments.length > 0
    ? allPayments.filter(p => p.metodo === 'YAPE' || p.metodo === 'PLIN').reduce((acc, p) => acc + p.monto, 0)
    : orders.filter(o => (o.metodoPago === 'YAPE' || o.metodoPago === 'PLIN') && o.estado === 'PAGADO').reduce((acc, o) => acc + o.total, 0);

  const tarjeta = allPayments.filter(p => p.metodo === 'TARJETA').reduce((acc, p) => acc + p.monto, 0);

  const creditoVendido = allPayments.length > 0
    ? allPayments.filter(p => p.metodo === 'CREDITO').reduce((acc, p) => acc + p.monto, 0)
    : orders.filter(o => o.estado === 'CREDITO' || o.metodoPago === 'CREDITO').reduce((acc, o) => acc + o.total, 0);
  
  const customerPayments = customers.flatMap(c => 
    c.historial.filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
  ).reduce((acc, t) => acc + t.monto, 0);

  const cashData = [
    { 'Concepto': 'Efectivo en Ventas', 'Monto': efectivo },
    { 'Concepto': 'Yape / Plin en Ventas', 'Monto': yape },
    { 'Concepto': 'Tarjeta en Ventas', 'Monto': tarjeta },
    { 'Concepto': 'Cobros a Clientes (Abonos Cuentas)', 'Monto': customerPayments },
    { 'Concepto': 'Total en Caja (Efectivo + Digital + Abonos)', 'Monto': efectivo + yape + tarjeta + customerPayments },
    { 'Concepto': 'Ventas a Crédito / Fiado (Pendiente Cobro)', 'Monto': creditoVendido }
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
