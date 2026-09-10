import { MotivoAjusteCosto } from '../../../core/models/inventario.models';

export const MOTIVOS_AJUSTE_COSTO: { id: MotivoAjusteCosto; label: string }[] = [
  { id: 'CORRECCION_ERROR', label: 'Corrección de error' },
  { id: 'ACTUALIZACION_PROVEEDOR', label: 'Actualización de proveedor' },
  { id: 'CARGA_DE_COSTO_INICIAL', label: 'Carga de costo inicial' },
  { id: 'REVALUACION', label: 'Revaluación' },
  { id: 'OTRO', label: 'Otro' }
];

export function labelMotivoAjuste(motivo: MotivoAjusteCosto | string): string {
  return MOTIVOS_AJUSTE_COSTO.find(item => item.id === motivo)?.label ?? motivo;
}

export function labelTipoMovimiento(tipo: string): string {
  switch (tipo) {
    case 'COMPRA':
      return 'Compra';
    case 'VENTA':
      return 'Venta';
    case 'DEVOLUCION_VENTA':
      return 'Devolución de venta';
    case 'DEVOLUCION_COMPRA':
      return 'Devolución de compra';
    case 'AJUSTE_ENTRADA':
      return 'Ajuste de entrada';
    case 'AJUSTE_SALIDA':
      return 'Ajuste de salida';
    case 'MERMA':
      return 'Merma';
    case 'CARGA_INICIAL':
      return 'Carga inicial';
    default:
      return tipo;
  }
}

export function asIsoDateTime(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0] = value;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  return '';
}

/** Interpreta montos escritos a mano. No calcula precios ni costos. */
export function parseMontoEntrada(valor: unknown): number | null {
  if (valor == null) {
    return null;
  }
  const texto = String(valor).trim().replace(/\s/g, '').replace(/^\$/, '');
  if (!texto) {
    return null;
  }
  if (!/^[\d.,]+$/.test(texto)) {
    return null;
  }

  const lastComma = texto.lastIndexOf(',');
  const lastDot = texto.lastIndexOf('.');
  let normalizado = texto;

  if (lastComma >= 0 && lastDot >= 0) {
    normalizado = lastComma > lastDot
      ? texto.replace(/\./g, '').replace(',', '.')
      : texto.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalizado = texto.replace(',', '.');
  } else if (lastDot >= 0) {
    const decimales = texto.length - lastDot - 1;
    normalizado = decimales === 3 ? texto.replace(/\./g, '') : texto;
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

export function formatMontoEntrada(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) {
    return '';
  }
  return valor.toLocaleString('es-CO', {
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

export function formatFechaCorta(value: unknown): string {
  const iso = asIsoDateTime(value);
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.replace('T', ' ');
  }
  return date.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
