import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import {
  ESTADO_COTIZACION_COMERCIAL_LABEL,
  EstadoCotizacionComercial,
  TIPO_LINEA_COTIZACION_LABEL,
  TipoLineaCotizacionComercial
} from '../../../core/models/cotizacion-comercial.models';

export const ESTADOS_COTIZACION_COMERCIAL: { id: EstadoCotizacionComercial; label: string; tone: SolvixBadgeTone }[] = [
  { id: 'BORRADOR', label: ESTADO_COTIZACION_COMERCIAL_LABEL.BORRADOR, tone: 'neutral' },
  { id: 'PENDIENTE_APROBACION', label: ESTADO_COTIZACION_COMERCIAL_LABEL.PENDIENTE_APROBACION, tone: 'warning' },
  { id: 'APROBADA', label: ESTADO_COTIZACION_COMERCIAL_LABEL.APROBADA, tone: 'success' },
  { id: 'RECHAZADA', label: ESTADO_COTIZACION_COMERCIAL_LABEL.RECHAZADA, tone: 'error' },
  { id: 'ANULADA', label: ESTADO_COTIZACION_COMERCIAL_LABEL.ANULADA, tone: 'neutral' }
];

export const TIPOS_LINEA_COTIZACION: { id: TipoLineaCotizacionComercial; label: string; icon: string }[] = [
  { id: 'PRODUCTO', label: TIPO_LINEA_COTIZACION_LABEL.PRODUCTO, icon: 'inventory_2' },
  { id: 'MANO_OBRA', label: TIPO_LINEA_COTIZACION_LABEL.MANO_OBRA, icon: 'engineering' },
  { id: 'OTRO', label: TIPO_LINEA_COTIZACION_LABEL.OTRO, icon: 'more_horiz' }
];

export function labelEstadoCotizacion(estado: EstadoCotizacionComercial | string): string {
  return ESTADOS_COTIZACION_COMERCIAL.find(e => e.id === estado)?.label ?? estado;
}

export function toneEstadoCotizacion(estado: EstadoCotizacionComercial | string): SolvixBadgeTone {
  return ESTADOS_COTIZACION_COMERCIAL.find(e => e.id === estado)?.tone ?? 'neutral';
}

export function labelTipoLinea(tipo: TipoLineaCotizacionComercial | string): string {
  return TIPOS_LINEA_COTIZACION.find(t => t.id === tipo)?.label ?? tipo;
}

/** Estimación local; el total oficial lo calcula el servidor al guardar. */
export function subtotalLinea(cantidad: unknown, precio: unknown): number {
  const c = Number(cantidad);
  const p = Number(precio);
  if (!Number.isFinite(c) || !Number.isFinite(p)) {
    return 0;
  }
  return Math.round(c * p * 100) / 100;
}

/**
 * D.6: una categoría del resumen solo se muestra si su importe numérico es &gt; 0.
 * null / undefined / NaN / ≤ 0 → no participa.
 */
export function participaEnResumenCotizacion(importe: unknown): boolean {
  if (importe == null) {
    return false;
  }
  const n = typeof importe === 'number' ? importe : Number(importe);
  return Number.isFinite(n) && n > 0;
}
