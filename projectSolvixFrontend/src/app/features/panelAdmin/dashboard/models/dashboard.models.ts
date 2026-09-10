/** Estados de calidad de métrica alineados con el backend. No se calculan en Angular. */
export type EstadoMetrica =
  | 'OK'
  | 'VALOR_CERO'
  | 'SIN_DATOS'
  | 'COSTO_INCOMPLETO'
  | 'SIN_BASE_DE_COMPARACION'
  | 'SIN_VENTAS_RECIENTES'
  | 'SIN_HISTORIAL_SUFICIENTE';

export type PeriodoPreset = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';

export type SerieMetrica = 'ventas' | 'devoluciones' | 'ventasNetas' | 'ganancia';

export type Agrupacion = 'DIA' | 'SEMANA' | 'MES' | 'ANIO';

export type CriterioRanking = 'INGRESOS' | 'UNIDADES' | 'GANANCIA' | 'MARGEN';

export type SeccionEstado = 'ready' | 'loading' | 'empty' | 'error';

export type InsightPrioridad = 'alta' | 'media' | 'baja';

export interface PeriodoFiltro {
  preset: PeriodoPreset;
  desde: string;
  hasta: string;
}

export interface VariacionVista {
  texto: string;
  tipo: 'positive' | 'negative' | 'neutral';
  estado: EstadoMetrica;
}

export interface DashboardMetricVista {
  id: string;
  label: string;
  hint: string;
  help?: string;
  value: number | null;
  formato: 'money' | 'percent' | 'quantity';
  compact?: boolean;
  icon: string;
  variation?: VariacionVista;
  estado: EstadoMetrica;
}

export interface VentasSeriePunto {
  fecha: string;
  etiqueta: string;
  ventas: number;
  devoluciones: number;
  ventasNetas: number;
  ganancia: number;
  pedidos: number;
}

export interface ProductoRankingVista {
  productoId: number;
  nombre: string;
  categoriaNombre: string;
  unidades: number;
  ingresos: number | null;
  ganancia: number | null;
  margen: number | null;
  stockActual: number | null;
  estadoGanancia: EstadoMetrica;
}

export interface ProductoRevisionVista {
  productoId: number;
  nombre: string;
  stockActual: number | null;
  velocidadVenta: number | null;
  diasSinVenta: number | null;
  estado: EstadoMetrica;
}

export interface CategoriaVista {
  categoriaId: number;
  nombre: string;
  ventas: number | null;
  ganancia: number | null;
  participacion: number | null;
  estadoGanancia: EstadoMetrica;
}

export interface InventarioSaludVista {
  valorInventario: number | null;
  estadoValorInventario: EstadoMetrica;
  inventoryTurnover: number | null;
  estadoTurnover: EstadoMetrica;
  sellThrough: number | null;
  estadoSellThrough: EstadoMetrica;
  productosStockCritico: number;
}

export interface AbcClaseVista {
  clase: 'A' | 'B' | 'C';
  productos: number;
  participacion: number;
}

export interface InsightVista {
  id: string;
  titulo: string;
  explicacion: string;
  evidencia: string;
  prioridad: InsightPrioridad;
  accion: string;
  ruta?: string;
}

