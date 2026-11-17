/**
 * Contratos de FASE 2. Nombres y campos iguales a los DTO de Java.
 * No añadir propiedades que el backend no envíe.
 */

export type EstadoMetrica =
  | 'OK'
  | 'VALOR_CERO'
  | 'SIN_DATOS'
  | 'COSTO_INCOMPLETO'
  | 'SIN_BASE_DE_COMPARACION'
  | 'SIN_VENTAS_RECIENTES'
  | 'SIN_HISTORIAL_SUFICIENTE';

export type Agrupacion = 'DIA' | 'SEMANA' | 'MES' | 'ANIO';

export type CriterioRanking = 'UNIDADES' | 'INGRESOS' | 'GANANCIA' | 'MARGEN';

export interface PeriodoDTO {
  desde: string | number[] | null;
  hasta: string | number[] | null;
  dias: number;
  agrupacion: Agrupacion;
}

export interface VariacionDTO {
  actual: number | null;
  anterior: number | null;
  variacionPorcentual: number | null;
  estado: EstadoMetrica;
}

export interface ComparativaResumenDTO {
  periodoAnterior: PeriodoDTO | null;
  ventasBrutas: VariacionDTO | null;
  devoluciones: VariacionDTO | null;
  ventasNetas: VariacionDTO | null;
  gananciaBruta: VariacionDTO | null;
  margenBruto: VariacionDTO | null;
  pedidos: VariacionDTO | null;
  ticketPromedio: VariacionDTO | null;
}

export interface DashboardResumenDTO {
  periodo: PeriodoDTO | null;
  ventasBrutas: number | null;
  devoluciones: number | null;
  ventasNetas: number | null;
  costoVentas: number | null;
  gananciaBruta: number | null;
  margenBruto: number | null;
  pedidos: number;
  ticketPromedio: number | null;
  estadoVentas: EstadoMetrica;
  estadoGanancia: EstadoMetrica;
  estadoMargen: EstadoMetrica;
  estadoTicket: EstadoMetrica;
  lineasSinCosto: number;
  comparativa: ComparativaResumenDTO | null;
}

export interface VentasSerieDTO {
  fecha: string | number[] | null;
  etiqueta: string;
  ventas: number | null;
  devoluciones: number | null;
  ventasNetas: number | null;
  ganancia: number | null;
  pedidos: number;
}

export interface SerieTemporalDTO {
  periodo: PeriodoDTO | null;
  puntos: VentasSerieDTO[] | null;
  estado: EstadoMetrica;
}

export interface ProductoRankingDTO {
  productoId: number;
  nombre: string;
  categoriaCodigo: string | null;
  categoriaNombre: string | null;
  unidades: number;
  ingresos: number | null;
  costo: number | null;
  ganancia: number | null;
  margen: number | null;
  stockActual: number | null;
  estadoGanancia: EstadoMetrica;
}

export interface ProductoBajoRendimientoDTO {
  productoId: number;
  nombre: string;
  categoriaCodigo: string | null;
  categoriaNombre: string | null;
  unidades: number;
  ingresos: number | null;
  stockActual: number | null;
  velocidadVenta: number | null;
  ultimaVenta: string | number[] | null;
  diasSinVenta: number | null;
  diasEnCatalogo: number;
  estado: EstadoMetrica;
}

export interface CategoriaAnalyticsDTO {
  categoriaId: number | null;
  codigo: string | null;
  nombre: string;
  ventas: number | null;
  unidades: number;
  pedidos: number;
  costo: number | null;
  ganancia: number | null;
  margen: number | null;
  participacion: number | null;
  estadoGanancia: EstadoMetrica;
}

export interface InventarioKpiDTO {
  periodo: PeriodoDTO | null;
  stockTotal: number;
  valorInventario: number | null;
  stockInicial: number;
  valorInventarioInicial: number | null;
  stockFinal: number;
  valorInventarioFinal: number | null;
  inventarioPromedio: number | null;
  productosSinValuacionHistorica: number;
  unidadesIngresadas: number;
  unidadesDevueltasProveedor: number;
  inventarioDisponible: number;
  unidadesVendidas: number;
  costoVentas: number | null;
  inventoryTurnover: number | null;
  sellThrough: number | null;
  velocidadVenta: number | null;
  diasInventario: number | null;
  productosStockCritico: number;
  umbralStockCritico: number;
  productosSinCosto: number;
  estadoValorInventario: EstadoMetrica;
  estadoTurnover: EstadoMetrica;
  estadoSellThrough: EstadoMetrica;
  estadoDiasInventario: EstadoMetrica;
}

export interface ABCProductoDTO {
  productoId: number;
  nombre: string;
  categoriaCodigo: string | null;
  ingresos: number | null;
  participacion: number | null;
  participacionAcumulada: number | null;
  clasificacion: 'A' | 'B' | 'C' | string;
}

export interface AnalisisABCDTO {
  periodo: PeriodoDTO | null;
  criterio: CriterioRanking;
  limiteA: number | null;
  limiteB: number | null;
  total: number | null;
  productos: ABCProductoDTO[] | null;
  estado: EstadoMetrica;
}

export interface ProveedorGastoDTO {
  proveedorId: number;
  nombre: string;
  comprasBrutas: number | null;
  devoluciones: number | null;
  comprasNetas: number | null;
  ordenes: number;
  participacion: number | null;
}

export interface ProductoCompradoDTO {
  productoId: number;
  nombre: string;
  unidades: number;
  unidadesDevueltas: number;
  costoCompras: number | null;
  costoDevuelto: number | null;
  costoNeto: number | null;
}

export interface CompraAnalyticsDTO {
  periodo: PeriodoDTO | null;
  comprasBrutas: number | null;
  devolucionesCompra: number | null;
  comprasNetas: number | null;
  ordenes: number;
  gastoPorProveedor: ProveedorGastoDTO[] | null;
  productosComprados: ProductoCompradoDTO[] | null;
  serie: VentasSerieDTO[] | null;
  estado: EstadoMetrica;
}
