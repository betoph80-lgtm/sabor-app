/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Motor Contable & Tributario para Perú (PCGE 2019 & Normativa SUNAT)
 */

import { Order, PurchaseRecord, AccountingEntry, FiscalConfig, TaxSummary } from '../types';

export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  ruc: '20608945123',
  razonSocial: 'SABOR ABANQUINO S.A.C.',
  nombreComercial: 'Sabor Abanquino - Gastronomía & Tradición',
  direccionFiscal: 'Av. Las Américas N° 450, Abancay, Apurímac',
  departamento: 'Apurímac',
  provincia: 'Abancay',
  distrito: 'Abancay',
  ubigeo: '030101',
  regimenTributario: 'MYPE_TRIBUTARIO',
  tasaRentaMensual: 0.01, // 1.0% Régimen MYPE Tributario (hasta 300 UIT)
  uitVigente: 5150, // 2024
  tasaIgv: 0.18, // 18% (16% IGV + 2% IPM)
  serieBoleta: 'B001',
  serieFactura: 'F001'
};

/**
 * Desglose tributario exacto según SUNAT (Base Imponible e IGV del 18%)
 */
export const calculateTaxBreakdown = (
  total: number, 
  tasaIgv: number = 0.18, 
  esInafecto: boolean = false
): TaxSummary => {
  if (esInafecto || tasaIgv === 0) {
    return {
      baseImponible: Number(total.toFixed(2)),
      igv: 0.00,
      total: Number(total.toFixed(2)),
      tasaIgv: 0,
      esInafecto: true
    };
  }

  const baseImponible = Number((total / (1 + tasaIgv)).toFixed(2));
  const igv = Number((total - baseImponible).toFixed(2));

  return {
    baseImponible,
    igv,
    total: Number(total.toFixed(2)),
    tasaIgv
  };
};

/**
 * Validador de Bancarización Obligatoria (D.Leg 1529 / Ley 30730)
 * Límite legal en Perú: S/ 2,000.00 o USD $500.00
 */
export const checkBancarizacion = (montoTotalSoles: number): { obligatoria: boolean; mensaje: string } => {
  const LIMITE_BANCARIZACION = 2000;
  if (montoTotalSoles >= LIMITE_BANCARIZACION) {
    return {
      obligatoria: true,
      mensaje: `⚠️ BANCARIZACIÓN OBLIGATORIA: El monto (S/ ${montoTotalSoles.toFixed(2)}) es mayor o igual a S/ 2,000. Debe utilizarse un medio de pago bancario (Transferencia, Cheque o Tarjeta) para sustentar costo/gasto y crédito fiscal ante SUNAT.`
    };
  }
  return {
    obligatoria: false,
    mensaje: 'Monto menor a S/ 2,000. Pago en efectivo admitido.'
  };
};

/**
 * Validador de Detracciones SPOT (Sistema de Pago de Obligaciones Tributarias)
 */
export const checkDetraccion = (
  categoria: string, 
  montoTotal: number
): { aplica: boolean; tasa: number; monto: number; concepto: string; advertencia?: string } => {
  // Transporte de bienes > S/ 400.00 -> 4%
  if (categoria === 'TRANSPORTE' && montoTotal > 400) {
    const tasa = 0.04;
    const monto = Number((montoTotal * tasa).toFixed(2));
    return {
      aplica: true,
      tasa,
      monto,
      concepto: 'Transporte de Bienes (SPOT 4%)',
      advertencia: `⚠️ OPERACIÓN SUJETA A DETRACCIÓN: Transporte superior a S/ 400. Detraer el 4% (S/ ${monto.toFixed(2)}) y depositar en la cuenta Banco de la Nación del proveedor.`
    };
  }

  // Mantenimiento y Servicios varios > S/ 700.00 -> 12% (o 10% según anexo 3)
  if (categoria === 'MANTENIMIENTO' && montoTotal > 700) {
    const tasa = 0.12;
    const monto = Number((montoTotal * tasa).toFixed(2));
    return {
      aplica: true,
      tasa,
      monto,
      concepto: 'Mantenimiento y Reparaciones (SPOT 12%)',
      advertencia: `⚠️ OPERACIÓN SUJETA A DETRACCIÓN: Servicio de mantenimiento superior a S/ 700. Detraer el 12% (S/ ${monto.toFixed(2)}) al Banco de la Nación.`
    };
  }

  // Alquiler de Inmuebles empresariales > S/ 700.00 -> 10%
  if (categoria === 'ALQUILER' && montoTotal > 700) {
    const tasa = 0.10;
    const monto = Number((montoTotal * tasa).toFixed(2));
    return {
      aplica: true,
      tasa,
      monto,
      concepto: 'Arrendamiento de Bienes Muebles/Inmuebles (SPOT 10%)',
      advertencia: `⚠️ OPERACIÓN SUJETA A DETRACCIÓN: Arrendamiento superior a S/ 700. Detraer el 10% (S/ ${monto.toFixed(2)}).`
    };
  }

  return { aplica: false, tasa: 0, monto: 0, concepto: '' };
};

/**
 * Convierte montos numéricos a formato literal formal para Facturas y Boletas SUNAT
 * Ej: 45.50 -> "CUARENTA Y CINCO CON 50/100 SOLES"
 */
export const numberToSpanishWords = (amount: number): string => {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const diez_a_diecinueve = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const entero = Math.floor(amount);
  const centavos = Math.round((amount - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0') + '/100 SOLES';

  if (entero === 0) return `CERO CON ${centavosStr}`;
  if (entero === 100) return `CIEN CON ${centavosStr}`;

  const convertGroup = (n: number): string => {
    let output = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) output += centenas[c] + ' ';

    if (d === 1) {
      output += diez_a_diecinueve[u] + ' ';
    } else if (d === 2 && u > 0) {
      output += 'VEINTI' + unidades[u] + ' ';
    } else {
      if (d > 0) output += decenas[d] + (u > 0 ? ' Y ' : ' ');
      if (u > 0) output += unidades[u] + ' ';
    }
    return output.trim();
  };

  let result = '';
  if (entero >= 1000) {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    if (miles === 1) {
      result += 'MIL ';
    } else {
      result += convertGroup(miles) + ' MIL ';
    }
    if (resto > 0) {
      result += convertGroup(resto) + ' ';
    }
  } else {
    result = convertGroup(entero) + ' ';
  }

  return `${result.trim()} CON ${centavosStr}`;
};

/**
 * Genera el Asiento Contable individual por venta (PCGE 2019)
 */
export const generateSingleSaleAccountingEntry = (order: Order): AccountingEntry => {
  const breakdown = calculateTaxBreakdown(order.total, 0.18);
  const shortId = order.id.split('-').pop() || order.id;

  const filas = [
    {
      cuenta: '1212',
      denominacion: 'Facturas, boletas y otros comprobantes por cobrar - Emitidas en cartera',
      debe: order.total,
      haber: 0.00
    },
    {
      cuenta: '40111',
      denominacion: 'IGV - Cuenta propia (18%)',
      debe: 0.00,
      haber: breakdown.igv
    },
    {
      cuenta: '70121',
      denominacion: 'Venta de mercaderías - Platos y alimentos preparados',
      debe: 0.00,
      haber: breakdown.baseImponible
    }
  ];

  return {
    id: `ASIENTO-VTA-${order.id}`,
    fecha: order.fecha,
    glosa: `Por la venta y emisión de comprobante de pedido #${shortId} a favor de ${order.cliente.toUpperCase()}`,
    libroSugerido: 'REGISTRO_VENTAS',
    filas,
    totalDebe: order.total,
    totalHaber: order.total,
    tipoOperacion: 'VENTA',
    referenciaId: order.id,
    timestamp: order.timestamp || Date.now()
  };
};

/**
 * Genera el Asiento Contable Consolidado del Día (PCGE 2019)
 * Incluye:
 * 1. Provisión de Ventas (1212 vs 40111 y 70121)
 * 2. Cobranza e Ingreso a Caja/Billeteras (1011 Efectivo, 1041 Yape/Plin vs 1212)
 */
export const generateDailyConsolidatedAccountingEntry = (
  orders: Order[],
  selectedDate: string
): { asientoVentas: AccountingEntry; asientoCobranza: AccountingEntry; resumen: any } => {
  const dailyOrders = orders.filter(o => o.fecha === selectedDate && o.estado !== 'CANCELADO');
  const totalVentas = dailyOrders.reduce((acc, o) => acc + o.total, 0);
  const breakdown = calculateTaxBreakdown(totalVentas, 0.18);

  // Pagos realizados
  const allPayments = dailyOrders.flatMap(o => o.pagos || []);
  
  let efectivo = allPayments.filter(p => p.metodo === 'EFECTIVO').reduce((acc, p) => acc + p.monto, 0);
  let yapePlin = allPayments.filter(p => p.metodo === 'YAPE' || p.metodo === 'PLIN').reduce((acc, p) => acc + p.monto, 0);
  let credito = allPayments.filter(p => p.metodo === 'CREDITO').reduce((acc, p) => acc + p.monto, 0);

  // Fallback para órdenes sin desglose de pagos explícito
  if (allPayments.length === 0 && totalVentas > 0) {
    efectivo = dailyOrders.filter(o => o.metodoPago === 'EFECTIVO' && o.estado === 'PAGADO').reduce((acc, o) => acc + o.total, 0);
    yapePlin = dailyOrders.filter(o => o.metodoPago === 'YAPE' && o.estado === 'PAGADO').reduce((acc, o) => acc + o.total, 0);
    credito = dailyOrders.filter(o => o.estado === 'CREDITO').reduce((acc, o) => acc + o.total, 0);
  }

  const totalCobrado = efectivo + yapePlin;

  // Asiento 1: Ventas del Día (Registro de Ventas / Libro Diario)
  const asientoVentas: AccountingEntry = {
    id: `ASIENTO-VTA-DIA-${selectedDate.replace(/\//g, '')}`,
    fecha: selectedDate,
    glosa: `Por las ventas del día ${selectedDate} según Registro de Ventas e Ingresos (Boletas y Tickets de Consumo)`,
    libroSugerido: 'REGISTRO_VENTAS',
    filas: [
      {
        cuenta: '1212',
        denominacion: 'Facturas, boletas y otros comprobantes por cobrar - Emitidas en cartera',
        debe: totalVentas,
        haber: 0.00
      },
      {
        cuenta: '40111',
        denominacion: 'Tributos por pagar - IGV Cuenta Propia (18%)',
        debe: 0.00,
        haber: breakdown.igv
      },
      {
        cuenta: '70121',
        denominacion: 'Venta de mercaderías - Alimentos y Bebidas del Restaurante',
        debe: 0.00,
        haber: breakdown.baseImponible
      }
    ],
    totalDebe: totalVentas,
    totalHaber: totalVentas,
    tipoOperacion: 'VENTA',
    timestamp: Date.now()
  };

  // Asiento 2: Cobranzas y Destino a Caja / Billeteras Digitales
  const asientoCobranzaFilas = [];
  if (efectivo > 0) {
    asientoCobranzaFilas.push({
      cuenta: '1011',
      denominacion: 'Caja - Efectivo y Moneda Nacional en Restaurante',
      debe: efectivo,
      haber: 0.00
    });
  }
  if (yapePlin > 0) {
    asientoCobranzaFilas.push({
      cuenta: '1041',
      denominacion: 'Cuentas corrientes / Billeteras Digitales (Yape / Plin)',
      debe: yapePlin,
      haber: 0.00
    });
  }
  if (asientoCobranzaFilas.length === 0) {
    asientoCobranzaFilas.push({
      cuenta: '1011',
      denominacion: 'Caja - Efectivo',
      debe: 0.00,
      haber: 0.00
    });
  }

  asientoCobranzaFilas.push({
    cuenta: '1212',
    denominacion: 'Facturas, boletas y otros comprobantes por cobrar - Cancelación de cobros',
    debe: 0.00,
    haber: totalCobrado
  });

  const asientoCobranza: AccountingEntry = {
    id: `ASIENTO-COB-DIA-${selectedDate.replace(/\//g, '')}`,
    fecha: selectedDate,
    glosa: `Por la cobranza de las ventas del día ${selectedDate} ingresadas a Caja Efectivo y Billeteras Digitales`,
    libroSugerido: 'LIBRO_CAJA_BANCOS',
    filas: asientoCobranzaFilas,
    totalDebe: totalCobrado,
    totalHaber: totalCobrado,
    tipoOperacion: 'COBRANZA',
    timestamp: Date.now()
  };

  return {
    asientoVentas,
    asientoCobranza,
    resumen: {
      totalVentas,
      baseImponible: breakdown.baseImponible,
      igv: breakdown.igv,
      efectivo,
      yapePlin,
      credito,
      totalCobrado,
      cantidadComprobantes: dailyOrders.length
    }
  };
};

/**
 * Genera el Asiento Contable de Compra / Gasto (PCGE 2019)
 */
export const generatePurchaseAccountingEntry = (purchase: PurchaseRecord): AccountingEntry => {
  let cuentaGasto = '6011';
  let denominacionGasto = 'Mercaderías / Insumos de Alimentos y Carnes';

  if (purchase.categoria === 'BEBIDAS') {
    cuentaGasto = '6011';
    denominacionGasto = 'Mercaderías - Bebidas, Aguas y Gaseosas';
  } else if (purchase.categoria === 'SERVICIOS_BASICOS') {
    cuentaGasto = '6361';
    denominacionGasto = 'Servicios prestados por terceros - Luz, Agua y Gas';
  } else if (purchase.categoria === 'ALQUILER') {
    cuentaGasto = '6351';
    denominacionGasto = 'Servicios prestados por terceros - Alquiler de Inmueble';
  } else if (purchase.categoria === 'TRANSPORTE') {
    cuentaGasto = '6311';
    denominacionGasto = 'Servicios de transporte y fletes de mercadería';
  } else if (purchase.categoria === 'MANTENIMIENTO') {
    cuentaGasto = '6321';
    denominacionGasto = 'Mantenimiento y reparaciones del restaurante';
  }

  const filas = [
    {
      cuenta: cuentaGasto,
      denominacion: denominacionGasto,
      debe: purchase.baseImponible,
      haber: 0.00
    },
    {
      cuenta: '40111',
      denominacion: 'Tributos por pagar - IGV Crédito Fiscal (18%)',
      debe: purchase.igv,
      haber: 0.00
    },
    {
      cuenta: '4212',
      denominacion: 'Cuentas por pagar comerciales - Proveedores emitidas',
      debe: 0.00,
      haber: purchase.total
    }
  ];

  return {
    id: `ASIENTO-COMPRA-${purchase.id}`,
    fecha: purchase.fecha,
    glosa: `Por la compra de ${purchase.categoria.toLowerCase()} según ${purchase.tipoComprobante} ${purchase.serieNumero} de ${purchase.proveedor.toUpperCase()}`,
    libroSugerido: 'REGISTRO_COMPRAS',
    filas,
    totalDebe: purchase.total,
    totalHaber: purchase.total,
    tipoOperacion: 'COMPRA',
    referenciaId: purchase.id,
    timestamp: purchase.timestamp || Date.now()
  };
};

/**
 * Exportador de Registro de Ventas Oficial Formato PLE SUNAT 14.1 (Archivo TXT)
 * Estructura estándar exigida por la SUNAT para Libros Electrónicos
 */
export const generateSunatPleVentasTxt = (
  orders: Order[], 
  fiscalConfig: FiscalConfig, 
  periodo: string // YYYYMM00
): { filename: string; content: string } => {
  // Nombre estándar PLE: LE + RUC + AÑO + MES + 00 + 140100 + 00 + 1 + 1 + 1 + 1 .txt
  const ruc = fiscalConfig.ruc || '20608945123';
  const cleanPeriod = periodo.replace(/\D/g, '').padEnd(6, '0').substring(0, 6) + '00';
  const filename = `LE${ruc}${cleanPeriod}140100001111.txt`;

  const lines = orders.map((order, index) => {
    const correlativo = (index + 1).toString().padStart(6, '0');
    const [d, m, y] = order.fecha.split('/');
    const fechaEmision = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    
    const breakdown = calculateTaxBreakdown(order.total, 0.18);
    const shortId = order.id.split('-').pop() || '1';
    const numComp = shortId.padStart(8, '0');
    const docCliente = order.cliente.toUpperCase().includes('RUC') ? '6' : '1'; // 6 RUC, 1 DNI, 0 Sin documento
    const numDocCliente = '00000000'; // DNI cliente o genérico

    // Campos PLE 14.1 delimitados por tubería '|'
    const fields = [
      cleanPeriod,                             // 1. Periodo
      correlativo,                             // 2. CUO (Código Único de Operación)
      `M${correlativo}`,                       // 3. Correlativo asiento
      fechaEmision,                            // 4. Fecha de emisión
      fechaEmision,                            // 5. Fecha de vencimiento
      '03',                                    // 6. Tipo Comprobante (03: Boleta de Venta, 01: Factura)
      fiscalConfig.serieBoleta || 'B001',      // 7. Serie
      numComp,                                 // 8. Número comprobante
      '',                                      // 9. Número final si es rango
      docCliente,                              // 10. Tipo documento cliente
      numDocCliente,                           // 11. Número documento cliente
      order.cliente.toUpperCase(),             // 12. Apellidos y Nombres / Razón Social
      '0.00',                                  // 13. Valor exportación
      breakdown.baseImponible.toFixed(2),      // 14. Base imponible operación gravada (IGV)
      '0.00',                                  // 15. Descuento base imponible
      breakdown.igv.toFixed(2),                // 16. IGV 18%
      '0.00',                                  // 17. Descuento IGV
      '0.00',                                  // 18. Monto operación exonerada
      '0.00',                                  // 19. Monto operación inafecta
      '0.00',                                  // 20. ISC
      '0.00',                                  // 21. Base arroz pilado
      '0.00',                                  // 22. Impuesto arroz pilado
      '0.00',                                  // 23. ICBPER (Bolsas plásticas)
      '0.00',                                  // 24. Otros tributos
      order.total.toFixed(2),                  // 25. Importe Total
      'PEN',                                   // 26. Código Moneda (Soles)
      '1.000',                                 // 27. Tipo de cambio
      '',                                      // 28. Fecha emision doc referencia
      '00',                                    // 29. Tipo doc referencia
      '',                                      // 30. Serie doc referencia
      '',                                      // 31. Numero doc referencia
      '',                                      // 32. Identificador contrato
      '',                                      // 33. Error tipo 1
      '',                                      // 34. Indicador de medio de pago
      '1'                                      // 35. Estado de la operación (1 = Activo del periodo)
    ];

    return fields.join('|') + '|';
  });

  return {
    filename,
    content: lines.join('\r\n')
  };
};
