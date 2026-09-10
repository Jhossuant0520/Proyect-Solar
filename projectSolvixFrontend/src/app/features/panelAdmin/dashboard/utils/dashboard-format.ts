import { EstadoMetrica } from '../models/dashboard.models';

const esCO = 'es-CO';

/** Formatea dinero ya calculado. No calcula métricas de negocio. */
export function formatMoneyEstado(
  value: number | null | undefined,
  estado: EstadoMetrica | undefined,
  compact = false
): string {
  if (estado === 'COSTO_INCOMPLETO' && value == null) {
    return labelEstadoMetrica(estado);
  }
  return formatMoney(value, compact);
}

export function formatMoney(value: number | null | undefined, compact = false): string {
  if (value == null) {
    return '—';
  }
  if (compact && Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions.toLocaleString(esCO, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  }
  return `$${value.toLocaleString(esCO, { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) {
    return '—';
  }
  return `${value.toLocaleString(esCO, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null) {
    return '—';
  }
  return `${value.toLocaleString(esCO, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (value == null) {
    return '—';
  }
  return value.toLocaleString(esCO, { maximumFractionDigits: 1 });
}

export function formatMetricValue(
  value: number | null | undefined,
  formato: 'money' | 'percent' | 'quantity' | 'ratio',
  compact = false
): string {
  switch (formato) {
    case 'money':
      return formatMoney(value, compact);
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    default:
      return formatQuantity(value);
  }
}

export function labelEstadoMetrica(estado: EstadoMetrica): string {
  switch (estado) {
    case 'COSTO_INCOMPLETO':
      return 'Costo incompleto';
    case 'SIN_DATOS':
      return 'Sin datos';
    case 'SIN_VENTAS_RECIENTES':
      return 'Sin ventas recientes';
    case 'SIN_HISTORIAL_SUFICIENTE':
      return 'Historial insuficiente';
    case 'SIN_BASE_DE_COMPARACION':
      return 'Sin comparación';
    case 'VALOR_CERO':
      return '0';
    default:
      return '';
  }
}

/** Explica el estado que ya envió el backend. No inventa reglas nuevas. */
export function explicacionEstadoMetrica(estado: EstadoMetrica): string {
  switch (estado) {
    case 'COSTO_INCOMPLETO':
      return 'Falta el costo en algunos productos, por eso este valor no está completo.';
    case 'SIN_DATOS':
      return 'Todavía no hay información para este indicador.';
    case 'SIN_VENTAS_RECIENTES':
      return 'En este período no hay ventas recientes.';
    case 'SIN_HISTORIAL_SUFICIENTE':
      return 'Aún no hay historial suficiente para este indicador.';
    case 'SIN_BASE_DE_COMPARACION':
      return 'No hay un período anterior suficiente para comparar.';
    default:
      return '';
  }
}

export function etiquetaComparacion(estado: EstadoMetrica | undefined): string {
  if (!estado) {
    return '';
  }
  if (estado === 'OK') {
    return 'vs período anterior';
  }
  return explicacionEstadoMetrica(estado);
}

export function notaEstadoMetrica(estado: EstadoMetrica): string {
  if (estado === 'OK' || estado === 'VALOR_CERO' || estado === 'SIN_BASE_DE_COMPARACION') {
    return '';
  }
  return explicacionEstadoMetrica(estado);
}

export function mostrarValorMetrica(estado: EstadoMetrica): boolean {
  return estado === 'OK' || estado === 'VALOR_CERO' || estado === 'COSTO_INCOMPLETO';
}
