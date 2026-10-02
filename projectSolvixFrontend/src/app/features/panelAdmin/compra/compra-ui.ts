import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import {
  EstadoCompra,
  MotivoDevolucionCompra,
  TipoDocumentoExternoCompra
} from '../../../core/models/compra.models';
import { CondicionPagoProveedor } from '../../../core/models/proveedor.models';

export const ESTADOS_COMPRA: { id: EstadoCompra; label: string; tone: SolvixBadgeTone }[] = [
  { id: 'PENDIENTE', label: 'Pendiente', tone: 'warning' },
  { id: 'COMPLETADA', label: 'Completada', tone: 'success' },
  { id: 'CANCELADA', label: 'Cancelada', tone: 'error' },
  { id: 'PARCIALMENTE_DEVUELTA', label: 'Parcialmente devuelta', tone: 'warning' },
  { id: 'DEVUELTA', label: 'Devuelta', tone: 'neutral' }
];

export const TIPOS_DOCUMENTO_EXTERNO: { id: TipoDocumentoExternoCompra; label: string }[] = [
  { id: 'PEDIDO', label: 'Pedido' },
  { id: 'FACTURA', label: 'Factura' },
  { id: 'OTRO', label: 'Otro' }
];

export const MOTIVOS_DEVOLUCION_COMPRA: { id: MotivoDevolucionCompra; label: string }[] = [
  { id: 'PRODUCTO_DEFECTUOSO', label: 'Producto defectuoso' },
  { id: 'PRODUCTO_INCORRECTO', label: 'Producto incorrecto' },
  { id: 'EXCESO_DE_PEDIDO', label: 'Exceso de pedido' },
  { id: 'PRODUCTO_VENCIDO', label: 'Producto vencido' },
  { id: 'ERROR_EN_COMPRA', label: 'Error en la compra' },
  { id: 'GARANTIA', label: 'Garantía' },
  { id: 'OTRO', label: 'Otro' }
];

export function labelEstadoCompra(estado: EstadoCompra | string): string {
  return ESTADOS_COMPRA.find(item => item.id === estado)?.label ?? estado;
}

export function toneEstadoCompra(estado: EstadoCompra | string): SolvixBadgeTone {
  return ESTADOS_COMPRA.find(item => item.id === estado)?.tone ?? 'neutral';
}

export function labelMotivoDevolucionCompra(motivo: MotivoDevolucionCompra | string): string {
  return MOTIVOS_DEVOLUCION_COMPRA.find(item => item.id === motivo)?.label ?? motivo;
}

export function labelTipoDocumentoExterno(
  tipo: TipoDocumentoExternoCompra | string | null | undefined
): string {
  if (!tipo) {
    return '—';
  }
  return TIPOS_DOCUMENTO_EXTERNO.find(item => item.id === tipo)?.label ?? tipo;
}

export function labelCondicionPagoCompra(
  condicion: CondicionPagoProveedor | string | null | undefined,
  dias?: number | null
): string {
  if (!condicion) {
    return '—';
  }
  if (condicion === 'CONTADO') {
    return 'Contado';
  }
  if (condicion === 'CREDITO') {
    return dias != null && dias > 0 ? `Crédito ${dias} días` : 'Crédito';
  }
  return String(condicion);
}

export function permiteDevolucionCompra(estado: EstadoCompra | string): boolean {
  return estado === 'COMPLETADA' || estado === 'PARCIALMENTE_DEVUELTA';
}

/** Convierte input date (yyyy-MM-dd) a ISO LocalDateTime para el backend. */
export function dateInputToIso(value: string | null | undefined): string | null {
  const limpio = value?.trim();
  if (!limpio) {
    return null;
  }
  return `${limpio}T00:00:00`;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
