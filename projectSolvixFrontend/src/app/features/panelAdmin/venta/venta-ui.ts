import { HttpErrorResponse } from '@angular/common/http';
import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import {
  EstadoDevolucionVenta,
  EstadoVenta,
  MetodoPago,
  MetodoReembolso,
  MotivoDevolucion
} from '../../../core/models/venta.models';

export const ESTADOS_VENTA: { id: EstadoVenta; label: string; tone: SolvixBadgeTone }[] = [
  { id: 'PENDIENTE', label: 'Pendiente', tone: 'warning' },
  { id: 'COMPLETADA', label: 'Completada', tone: 'success' },
  { id: 'CANCELADA', label: 'Cancelada', tone: 'error' },
  { id: 'PARCIALMENTE_DEVUELTA', label: 'Parcialmente devuelta', tone: 'warning' },
  { id: 'DEVUELTA', label: 'Devuelta', tone: 'neutral' }
];

export const METODOS_PAGO: { id: MetodoPago; label: string }[] = [
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'TRANSFERENCIA', label: 'Transferencia' },
  { id: 'TARJETA', label: 'Tarjeta' },
  { id: 'CREDITO', label: 'Crédito' },
  { id: 'OTRO', label: 'Otro' }
];

export const MOTIVOS_DEVOLUCION: { id: MotivoDevolucion; label: string }[] = [
  { id: 'PRODUCTO_DEFECTUOSO', label: 'Producto defectuoso' },
  { id: 'PRODUCTO_INCORRECTO', label: 'Producto incorrecto' },
  { id: 'INSATISFACCION_CLIENTE', label: 'Insatisfacción del cliente' },
  { id: 'ERROR_EN_VENTA', label: 'Error en la venta' },
  { id: 'GARANTIA', label: 'Garantía' },
  { id: 'OTRO', label: 'Otro' }
];

export const METODOS_REEMBOLSO: { id: MetodoReembolso; label: string }[] = [
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'TRANSFERENCIA', label: 'Transferencia' },
  { id: 'TARJETA', label: 'Tarjeta' },
  { id: 'NOTA_CREDITO', label: 'Nota crédito' },
  { id: 'CAMBIO_PRODUCTO', label: 'Cambio de producto' }
];

export function labelEstadoVenta(estado: EstadoVenta | string): string {
  return ESTADOS_VENTA.find(item => item.id === estado)?.label ?? estado;
}

export function toneEstadoVenta(estado: EstadoVenta | string): SolvixBadgeTone {
  return ESTADOS_VENTA.find(item => item.id === estado)?.tone ?? 'neutral';
}

export function labelMetodoPago(metodo: MetodoPago | string | null | undefined): string {
  if (!metodo) {
    return '—';
  }
  return METODOS_PAGO.find(item => item.id === metodo)?.label ?? metodo;
}

export function labelMotivoDevolucion(motivo: MotivoDevolucion | string): string {
  return MOTIVOS_DEVOLUCION.find(item => item.id === motivo)?.label ?? motivo;
}

export function labelMetodoReembolso(metodo: MetodoReembolso | string | null | undefined): string {
  if (!metodo) {
    return 'Sin reembolso';
  }
  return METODOS_REEMBOLSO.find(item => item.id === metodo)?.label ?? metodo;
}

export function labelEstadoDevolucion(estado: EstadoDevolucionVenta | string): string {
  return estado === 'REEMBOLSADA' ? 'Reembolsada' : 'Registrada';
}

export function toneEstadoDevolucion(estado: EstadoDevolucionVenta | string): SolvixBadgeTone {
  return estado === 'REEMBOLSADA' ? 'success' : 'warning';
}

export function permiteDevolucion(estado: EstadoVenta | string): boolean {
  return estado === 'COMPLETADA' || estado === 'PARCIALMENTE_DEVUELTA';
}

export function asIsoDateTime(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  }
  return '';
}

export function formatFechaVenta(value: unknown): string {
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

/** Formatea un importe ya calculado por el backend. No calcula totales. */
export function formatImporte(value: number | null | undefined): string {
  if (value == null) {
    return '—';
  }
  return `$${Number(value).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export interface ApiUiError {
  status: number;
  title: string;
  message: string;
  forbidden: boolean;
}

export function mapHttpError(error: unknown, fallbackTitle: string): ApiUiError {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (status === 401) {
    return {
      status,
      title: 'Tu sesión expiró.',
      message: 'Vuelve a iniciar sesión para guardar.',
      forbidden: false
    };
  }
  if (status === 403) {
    return {
      status,
      title: 'No tienes permiso.',
      message: 'Esta operación requiere una cuenta de administrador.',
      forbidden: true
    };
  }
  if (status === 404) {
    return {
      status,
      title: fallbackTitle,
      message: 'No encontramos este registro.',
      forbidden: false
    };
  }
  const apiMessage = extractApiMessage(error);
  return {
    status,
    title: fallbackTitle,
    message: apiMessage ?? 'Revisa la conexión e inténtalo de nuevo.',
    forbidden: false
  };
}

function extractApiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.error == null) {
    return null;
  }
  const body = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return null;
}
