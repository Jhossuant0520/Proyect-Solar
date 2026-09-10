import {
  ABCProductoDTO,
  AnalisisABCDTO,
  CategoriaAnalyticsDTO,
  DashboardResumenDTO,
  InventarioKpiDTO,
  ProductoBajoRendimientoDTO,
  ProductoRankingDTO,
  SerieTemporalDTO,
  VariacionDTO,
  VentasSerieDTO
} from '../../../../core/models/analytics.models';
import {
  AbcClaseVista,
  CategoriaVista,
  DashboardMetricVista,
  InsightVista,
  InventarioSaludVista,
  ProductoRankingVista,
  ProductoRevisionVista,
  VariacionVista,
  VentasSeriePunto
} from '../models/dashboard.models';
import { formatPercent, labelEstadoMetrica } from './dashboard-format';

export function mapKpis(dto: DashboardResumenDTO): DashboardMetricVista[] {
  const comparativa = dto.comparativa;
  return [
    {
      id: 'ventasNetas',
      label: 'Ventas netas',
      hint: 'Dinero vendido después de descontar devoluciones.',
      help: 'Es el total de tus ventas menos las devoluciones registradas en el período.',
      value: toNumber(dto.ventasNetas),
      formato: 'money',
      compact: true,
      icon: 'payments',
      estado: dto.estadoVentas,
      variation: mapVariacion(comparativa?.ventasNetas)
    },
    {
      id: 'gananciaBruta',
      label: 'Ganancia bruta',
      hint: 'Lo que queda de tus ventas después del costo de los productos.',
      help: 'Ventas netas menos el costo de los productos vendidos.',
      value: toNumber(dto.gananciaBruta),
      formato: 'money',
      compact: true,
      icon: 'trending_up',
      estado: dto.estadoGanancia,
      variation: mapVariacion(comparativa?.gananciaBruta)
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      hint: 'Ventas válidas realizadas en el período.',
      help: 'Cuenta los pedidos considerados válidos para las métricas de ventas. Una devolución no se cuenta como un pedido adicional.',
      value: toNumber(dto.pedidos),
      formato: 'quantity',
      icon: 'receipt_long',
      estado: dto.estadoVentas,
      variation: mapVariacion(comparativa?.pedidos)
    },
    {
      id: 'margenBruto',
      label: 'Margen bruto',
      hint: 'Porcentaje de tus ventas que queda como ganancia.',
      help: 'Indica qué proporción de tus ventas netas representa la ganancia bruta.',
      value: toNumber(dto.margenBruto),
      formato: 'percent',
      icon: 'percent',
      estado: dto.estadoMargen,
      variation: mapVariacion(comparativa?.margenBruto)
    },
    {
      id: 'ticketPromedio',
      label: 'Ticket promedio',
      hint: 'Valor promedio de cada venta.',
      help: 'Se obtiene dividiendo las ventas netas entre los pedidos válidos.',
      value: toNumber(dto.ticketPromedio),
      formato: 'money',
      icon: 'sell',
      estado: dto.estadoTicket,
      variation: mapVariacion(comparativa?.ticketPromedio)
    }
  ];
}

export function mapSerie(dto: SerieTemporalDTO): VentasSeriePunto[] {
  return (dto.puntos ?? []).map(punto => mapPunto(punto));
}

export function mapRanking(items: ProductoRankingDTO[]): ProductoRankingVista[] {
  return items.map(item => ({
    productoId: item.productoId,
    nombre: item.nombre,
    categoriaNombre: item.categoriaNombre ?? '',
    unidades: item.unidades,
    ingresos: toNumber(item.ingresos),
    ganancia: toNumber(item.ganancia),
    margen: toNumber(item.margen),
    stockActual: item.stockActual,
    estadoGanancia: item.estadoGanancia
  }));
}

export function mapRevision(items: ProductoBajoRendimientoDTO[]): ProductoRevisionVista[] {
  return items.map(item => ({
    productoId: item.productoId,
    nombre: item.nombre,
    stockActual: item.stockActual,
    velocidadVenta: toNumber(item.velocidadVenta),
    diasSinVenta: item.diasSinVenta,
    estado: item.estado
  }));
}

export function mapCategorias(items: CategoriaAnalyticsDTO[]): CategoriaVista[] {
  return items.map(item => ({
    categoriaId: item.categoriaId ?? 0,
    nombre: item.nombre,
    ventas: toNumber(item.ventas),
    ganancia: toNumber(item.ganancia),
    participacion: toNumber(item.participacion),
    estadoGanancia: item.estadoGanancia
  }));
}

export function mapInventario(dto: InventarioKpiDTO): InventarioSaludVista {
  return {
    valorInventario: toNumber(dto.valorInventario),
    estadoValorInventario: dto.estadoValorInventario,
    inventoryTurnover: toNumber(dto.inventoryTurnover),
    estadoTurnover: dto.estadoTurnover,
    sellThrough: toNumber(dto.sellThrough),
    estadoSellThrough: dto.estadoSellThrough,
    productosStockCritico: dto.productosStockCritico
  };
}

/** Cuenta y suma participación ya clasificada. No recalcula A/B/C. */
export function mapAbcClases(dto: AnalisisABCDTO): AbcClaseVista[] {
  const clases: Record<'A' | 'B' | 'C', AbcClaseVista> = {
    A: { clase: 'A', productos: 0, participacion: 0 },
    B: { clase: 'B', productos: 0, participacion: 0 },
    C: { clase: 'C', productos: 0, participacion: 0 }
  };

  for (const producto of dto.productos ?? []) {
    const clave = claseDe(producto);
    if (!clave) {
      continue;
    }
    clases[clave].productos += 1;
    clases[clave].participacion += toNumber(producto.participacion) ?? 0;
  }

  return [clases.A, clases.B, clases.C];
}

export function mapInsights(
  resumen: DashboardResumenDTO | null,
  inventario: InventarioKpiDTO | null
): InsightVista[] {
  const insights: InsightVista[] = [];

  if (inventario?.estadoTurnover === 'COSTO_INCOMPLETO') {
    insights.push({
      id: 'turnover-costo',
      titulo: 'Costo histórico incompleto',
      explicacion: 'La rotación de inventario no se muestra como número porque falta valoración histórica.',
      evidencia: inventario.productosSinValuacionHistorica > 0
        ? `${inventario.productosSinValuacionHistorica} productos sin valuación histórica`
        : 'Estado COSTO_INCOMPLETO',
      prioridad: 'media',
      accion: 'Ver productos',
      ruta: '/productos'
    });
  }

  if (resumen && resumen.lineasSinCosto > 0) {
    insights.push({
      id: 'lineas-sin-costo',
      titulo: 'Costo histórico incompleto',
      explicacion: 'Hay líneas de venta sin costo conocido. El margen llega, pero queda corto.',
      evidencia: `${resumen.lineasSinCosto} líneas sin costo`,
      prioridad: 'media',
      accion: 'Ver productos',
      ruta: '/productos'
    });
  }

  if (inventario?.estadoValorInventario === 'COSTO_INCOMPLETO' && inventario.productosSinCosto > 0) {
    insights.push({
      id: 'valor-sin-costo',
      titulo: 'Costo actual incompleto',
      explicacion: 'El dinero invertido en inventario queda corto porque hay productos con stock sin costo.',
      evidencia: `${inventario.productosSinCosto} productos sin costo`,
      prioridad: 'baja',
      accion: 'Ver inventario',
      ruta: '/inventario'
    });
  }

  return insights;
}

function mapPunto(punto: VentasSerieDTO): VentasSeriePunto {
  return {
    fecha: asIsoDate(punto.fecha),
    etiqueta: punto.etiqueta,
    ventas: toNumber(punto.ventas) ?? 0,
    devoluciones: toNumber(punto.devoluciones) ?? 0,
    ventasNetas: toNumber(punto.ventasNetas) ?? 0,
    ganancia: toNumber(punto.ganancia) ?? 0,
    pedidos: punto.pedidos
  };
}

function mapVariacion(dto?: VariacionDTO | null): VariacionVista | undefined {
  if (!dto) {
    return undefined;
  }
  const valor = toNumber(dto.variacionPorcentual);
  if (dto.estado === 'SIN_BASE_DE_COMPARACION' || valor == null) {
    return {
      texto: 'Sin comparación',
      tipo: 'neutral',
      estado: dto.estado
    };
  }
  if (dto.estado !== 'OK') {
    return {
      texto: labelEstadoMetrica(dto.estado) || 'Sin comparación',
      tipo: 'neutral',
      estado: dto.estado
    };
  }
  return {
    texto: `${valor > 0 ? '+' : ''}${formatPercent(valor)}`,
    tipo: valor > 0 ? 'positive' : valor < 0 ? 'negative' : 'neutral',
    estado: dto.estado
  };
}

function claseDe(producto: ABCProductoDTO): 'A' | 'B' | 'C' | null {
  if (producto.clasificacion === 'A' || producto.clasificacion === 'B' || producto.clasificacion === 'C') {
    return producto.clasificacion;
  }
  return null;
}

export function toNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asIsoDate(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '';
}
