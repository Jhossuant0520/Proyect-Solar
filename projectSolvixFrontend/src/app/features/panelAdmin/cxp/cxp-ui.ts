import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import { EstadoCuentaPorPagar, MetodoPagoCxP } from '../../../core/models/cxp.models';

export const ESTADOS_CXP: { id: EstadoCuentaPorPagar; label: string }[] = [
  { id: 'PENDIENTE', label: 'Pendiente' },
  { id: 'PARCIALMENTE_PAGADA', label: 'Parcialmente pagada' },
  { id: 'PAGADA', label: 'Pagada' },
  { id: 'ANULADA', label: 'Anulada' }
];

export const METODOS_PAGO_CXP: { id: MetodoPagoCxP; label: string }[] = [
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'TRANSFERENCIA', label: 'Transferencia' },
  { id: 'TARJETA', label: 'Tarjeta' },
  { id: 'OTRO', label: 'Otro' }
];

export function labelEstadoCxp(estado: EstadoCuentaPorPagar | null | undefined): string {
  return ESTADOS_CXP.find(e => e.id === estado)?.label ?? estado ?? '—';
}

export function labelMetodoPagoCxp(metodo: MetodoPagoCxP | null | undefined): string {
  return METODOS_PAGO_CXP.find(m => m.id === metodo)?.label ?? metodo ?? '—';
}

/**
 * Prioridad: vencida → error (rojo); PAGADA → success; ANULADA → neutral;
 * PENDIENTE / PARCIAL → warning.
 */
export function toneEstadoCxp(
  estado: EstadoCuentaPorPagar | null | undefined,
  vencida: boolean
): SolvixBadgeTone {
  if (vencida) {
    return 'error';
  }
  switch (estado) {
    case 'PAGADA':
      return 'success';
    case 'ANULADA':
      return 'neutral';
    case 'PENDIENTE':
    case 'PARCIALMENTE_PAGADA':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Impide submit si el valor supera el saldo pendiente (protección cliente). */
export function pagoSuperaSaldo(
  valor: number | null | undefined,
  saldoPendiente: number | null | undefined
): boolean {
  if (valor == null || !Number.isFinite(valor)) {
    return true;
  }
  const saldo = saldoPendiente ?? 0;
  return valor > saldo;
}

export function pagoValorInvalido(
  valor: number | null | undefined,
  saldoPendiente: number | null | undefined
): boolean {
  if (valor == null || !Number.isFinite(valor) || valor <= 0) {
    return true;
  }
  return pagoSuperaSaldo(valor, saldoPendiente);
}
