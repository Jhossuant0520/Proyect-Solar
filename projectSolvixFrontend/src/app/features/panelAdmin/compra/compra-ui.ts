import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import { EstadoCompra, MotivoDevolucionCompra } from '../../../core/models/compra.models';

export const ESTADOS_COMPRA: { id: EstadoCompra; label: string; tone: SolvixBadgeTone }[] = [
  { id: 'PENDIENTE', label: 'Pendiente', tone: 'warning' },
  { id: 'COMPLETADA', label: 'Completada', tone: 'success' },
  { id: 'CANCELADA', label: 'Cancelada', tone: 'error' },
  { id: 'PARCIALMENTE_DEVUELTA', label: 'Parcialmente devuelta', tone: 'warning' },
  { id: 'DEVUELTA', label: 'Devuelta', tone: 'neutral' }
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

export function permiteDevolucionCompra(estado: EstadoCompra | string): boolean {
  return estado === 'COMPLETADA' || estado === 'PARCIALMENTE_DEVUELTA';
}
