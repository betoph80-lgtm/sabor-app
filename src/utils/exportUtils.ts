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

    const totalPedido = order.items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
    const totalPagado = (order.pagos || []).reduce((acc, p) => acc + p.monto, 0);
    const metodosUtilizados = Array.from(new Set((order.pagos || []).map(p => p.metodo))).join(' + ') || order.metodoPago || '-';

    return {
      'ID Pedido': order.id,
      'Mesa': order.mesaId === '13' ? 'Para llevar' : `Mesa ${order.mesaId}`,
      'Cliente': order.cliente,
      'Total Pedido': totalPedido,
      'Total Pagado': totalPagado,
      'Saldo': totalPedido - totalPagado,
      'Estado': order.estado,
      'Métodos Pago': metodosUtilizados,
      'Detalle Items': itemsDescription,
      'Hora': order.hora
    };
  });
  const wsOrders = XLSX.utils.json_to_sheet(ordersData);
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Pedidos');

  // 2. Desglose de Pagos (NUEVO)
  const paymentsData = orders.flatMap(order => 
    (order.pagos || []).map(p => ({
      'ID Pedido': order.id,
      'Cliente': order.cliente,
      'Método': p.metodo,
      'Monto': p.monto,
      'Hora': p.hora,
      'Detalle': p.metodo === 'CREDITO' ? 'Cargado a cuenta' : 'Pago directo'
    }))
  );
  const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Desglose_Pagos');

  // 3. Caja (Resumen Consolidado)
  let efectivo = 0;
  let yape = 0;
  let creditoVendido = 0;

  orders.forEach(o => {
    (o.pagos || []).forEach(p => {
      if (p.metodo === 'EFECTIVO') efectivo += p.monto;
      else if (p.metodo === 'YAPE') yape += p.monto;
      else if (p.metodo === 'CREDITO') creditoVendido += p.monto;
    });
  });
  
  const customerPayments = customers.flatMap(c => 
    c.historial.filter(t => t.fecha === selectedDate && (t.tipo === 'DEPOSITO' || t.tipo === 'PAGO_CREDITO'))
  ).reduce((acc, t) => acc + t.monto, 0);

  const cashData = [
    { 'Concepto': 'Efectivo en Ventas (Abonos)', 'Monto': efectivo },
    { 'Concepto': 'Yape en Ventas (Abonos)', 'Monto': yape },
    { 'Concepto': 'Cobros a Clientes (Pagos de Deudas)', 'Monto': customerPayments },
    { 'Concepto': 'Total en Caja (Efectivo + Yape)', 'Monto': efectivo + yape + customerPayments },
    { 'Concepto': 'Ventas a Crédito (Pendiente)', 'Monto': creditoVendido }
  ];
  const wsCash = XLSX.utils.json_to_sheet(cashData);
  XLSX.utils.book_append_sheet(wb, wsCash, 'Resumen Caja');

  // 4. Cuentas (Customer Transactions)
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
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Movimientos_Clientes');

  // Generate and download
  XLSX.writeFile(wb, `Reporte_Sabor_Abanquino_${selectedDate.replace(/\//g, '-')}.xlsx`);
};
