import { HttpErrorResponse } from '@angular/common/http';
import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import { EquipoResponseDTO, TipoEquipo } from '../../../core/models/equipo.models';
import {
  EstadoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../core/models/orden-servicio.models';
import { formatFechaVenta, mapHttpError as mapVentaHttpError, ApiUiError } from '../venta/venta-ui';

/** Espejo de transiciones del enum Java. La autoridad sigue siendo el backend. */
const TRANSICIONES: Record<EstadoOrdenServicio, EstadoOrdenServicio[]> = {
  RECEPCIONADO: ['EN_DIAGNOSTICO', 'CANCELADO'],
  EN_DIAGNOSTICO: ['COTIZADO', 'CANCELADO'],
  COTIZADO: ['APROBADO', 'CANCELADO'],
  APROBADO: ['EN_REPARACION', 'CANCELADO'],
  EN_REPARACION: ['ESPERA_REPUESTO', 'LISTO', 'CANCELADO'],
  ESPERA_REPUESTO: ['EN_REPARACION', 'CANCELADO'],
  LISTO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: ['CERRADO'],
  CERRADO: [],
  CANCELADO: []
};

const LABEL_ESTADO: Record<EstadoOrdenServicio, string> = {
  RECEPCIONADO: 'Recepcionado',
  EN_DIAGNOSTICO: 'En diagnóstico',
  COTIZADO: 'Cotizado',
  APROBADO: 'Aprobado',
  EN_REPARACION: 'En reparación',
  ESPERA_REPUESTO: 'Espera repuesto',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado'
};

const LABEL_TIPO_EQUIPO: Record<TipoEquipo, string> = {
  COMPUTADOR: 'Computador',
  PORTATIL: 'Portátil',
  IMPRESORA: 'Impresora',
  MONITOR: 'Monitor',
  SERVIDOR: 'Servidor',
  CELULAR: 'Celular',
  OTRO: 'Otro'
};

export const TIPOS_EQUIPO: { id: TipoEquipo; label: string }[] = (
  Object.keys(LABEL_TIPO_EQUIPO) as TipoEquipo[]
).map(id => ({ id, label: LABEL_TIPO_EQUIPO[id] }));

export const ESTADOS_ORDEN: { id: EstadoOrdenServicio; label: string }[] = (
  Object.keys(LABEL_ESTADO) as EstadoOrdenServicio[]
).map(id => ({ id, label: LABEL_ESTADO[id] }));

export function labelEstadoOrden(estado: EstadoOrdenServicio | string): string {
  return LABEL_ESTADO[estado as EstadoOrdenServicio] ?? String(estado);
}

export function labelTipoEquipo(tipo: TipoEquipo | string | null | undefined): string {
  if (!tipo) {
    return '—';
  }
  return LABEL_TIPO_EQUIPO[tipo as TipoEquipo] ?? String(tipo);
}

export function toneEstadoOrden(estado: EstadoOrdenServicio | string): SolvixBadgeTone {
  switch (estado) {
    case 'LISTO':
    case 'ENTREGADO':
    case 'CERRADO':
      return 'success';
    case 'ESPERA_REPUESTO':
    case 'COTIZADO':
    case 'APROBADO':
      return 'warning';
    case 'CANCELADO':
      return 'error';
    default:
      return 'neutral';
  }
}

/** Destinos válidos conocidos por el backend para el estado actual. */
export function transicionesDesde(estado: EstadoOrdenServicio | string): EstadoOrdenServicio[] {
  return TRANSICIONES[estado as EstadoOrdenServicio] ?? [];
}

export function esEstadoTerminal(estado: EstadoOrdenServicio | string): boolean {
  return estado === 'CERRADO' || estado === 'CANCELADO';
}

/** PUT de textos solo si el backend lo permite (no terminal). */
export function puedeEditarTextos(estado: EstadoOrdenServicio | string): boolean {
  return !esEstadoTerminal(estado);
}

export type CampoTecnicoId =
  | 'problemaReportado'
  | 'diagnostico'
  | 'trabajoRealizado'
  | 'observaciones';

export interface CampoTecnicoUi {
  id: CampoTecnicoId;
  label: string;
  hint: string;
  maxLength: number;
}

/** Labels y hints de presentación. No inventan datos técnicos. */
export const CAMPOS_TECNICOS: CampoTecnicoUi[] = [
  {
    id: 'problemaReportado',
    label: 'Problema reportado',
    hint: 'Qué indicó el cliente al entregar el equipo.',
    maxLength: 2000
  },
  {
    id: 'diagnostico',
    label: 'Diagnóstico',
    hint: 'Qué encontró el técnico al revisar el equipo.',
    maxLength: 2000
  },
  {
    id: 'trabajoRealizado',
    label: 'Trabajo realizado',
    hint: 'Qué trabajo o reparación se realizó.',
    maxLength: 2000
  },
  {
    id: 'observaciones',
    label: 'Observaciones',
    hint: 'Información adicional importante sobre la orden.',
    maxLength: 1000
  }
];

/**
 * Campo a destacar según estado (solo UX). Nunca oculta los demás.
 * null = resumen completo sin un foco único.
 */
export function campoTecnicoDestacado(
  estado: EstadoOrdenServicio | string
): CampoTecnicoId | null {
  switch (estado) {
    case 'RECEPCIONADO':
      return 'problemaReportado';
    case 'EN_DIAGNOSTICO':
    case 'COTIZADO':
    case 'APROBADO':
      return 'diagnostico';
    case 'EN_REPARACION':
    case 'ESPERA_REPUESTO':
      return 'trabajoRealizado';
    case 'LISTO':
    case 'ENTREGADO':
    case 'CERRADO':
    case 'CANCELADO':
      return null;
    default:
      return null;
  }
}

/** LISTO / ENTREGADO / CERRADO / CANCELADO: lectura de resumen completo. */
export function esResumenTecnicoCompleto(estado: EstadoOrdenServicio | string): boolean {
  return campoTecnicoDestacado(estado) == null;
}

export function valorTextoTecnico(
  orden: OrdenServicioResponseDTO,
  campo: CampoTecnicoId
): string | null {
  return orden[campo];
}

/** Compara textos normalizados (trim / vacío ≈ null). Sin lógica de negocio. */
export function textosTecnicosSinCambios(
  orden: OrdenServicioResponseDTO,
  textos: Record<CampoTecnicoId, string>
): boolean {
  return CAMPOS_TECNICOS.every(campo => {
    const actual = normalizarTextoTecnico(orden[campo.id]);
    const editado = normalizarTextoTecnico(textos[campo.id]);
    return actual === editado;
  });
}

function normalizarTextoTecnico(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export const formatFechaOrden = formatFechaVenta;

export function equipoResumen(equipo: {
  tipoEquipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  nombre?: string | null;
  equipoTipo?: string | null;
  equipoMarca?: string | null;
  equipoModelo?: string | null;
  equipoNombre?: string | null;
}): string {
  const tipo = labelTipoEquipo(equipo.equipoTipo ?? equipo.tipoEquipo);
  const marca = equipo.equipoMarca ?? equipo.marca;
  const modelo = equipo.equipoModelo ?? equipo.modelo;
  const nombre = equipo.equipoNombre ?? equipo.nombre;
  const piezas = [tipo, marca, modelo].filter(Boolean);
  const base = piezas.length ? piezas.join(' · ') : 'Equipo';
  return nombre ? `${base} (${nombre})` : base;
}

export function equipoOpcionLabel(equipo: EquipoResponseDTO): string {
  return equipoResumen(equipo);
}

export function ordenCoincideBusqueda(orden: OrdenServicioResponseDTO, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    orden.numero,
    orden.clienteNombre,
    orden.equipoNombre,
    orden.equipoMarca,
    orden.equipoModelo,
    orden.equipoTipo,
    labelEstadoOrden(orden.estado)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function filtrarOrdenesLocal(
  ordenes: OrdenServicioResponseDTO[],
  query: string
): OrdenServicioResponseDTO[] {
  return ordenes.filter(orden => ordenCoincideBusqueda(orden, query));
}

export function mapHttpError(error: unknown, fallbackTitle: string): ApiUiError {
  const mapped = mapVentaHttpError(error, fallbackTitle);
  const status = error instanceof HttpErrorResponse ? error.status : mapped.status;
  if (status === 409) {
    return {
      ...mapped,
      status,
      title: fallbackTitle,
      message: mensajeHumanoServicio(error) ?? 'La operación entra en conflicto con el estado actual.'
    };
  }
  if (status === 400) {
    return {
      ...mapped,
      message: mensajeHumanoServicio(error) ?? mapped.message
    };
  }
  if (status === 500) {
    const msg = mensajeHumanoServicio(error);
    if (msg) {
      return { ...mapped, message: msg };
    }
    return {
      ...mapped,
      message: 'Ocurrió un error en el servidor. Inténtalo de nuevo.'
    };
  }
  return {
    ...mapped,
    message: mensajeHumanoServicio(error) ?? mapped.message
  };
}

export function mensajeErrorServicio(error: unknown, fallback: string): string {
  return mensajeHumanoServicio(error) ?? fallback;
}

function mensajeHumanoServicio(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.error == null) {
    return null;
  }
  const body = error.error;
  let raw: string | null = null;
  if (typeof body === 'string' && body.trim()) {
    raw = body.trim();
  } else if (typeof body === 'object' && body && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      raw = message.trim();
    }
  }
  if (!raw || esSql(raw)) {
    return null;
  }
  if (/no pertenece al cliente/i.test(raw)) {
    return 'El equipo seleccionado no pertenece al cliente indicado.';
  }
  if (/consumidor final/i.test(raw)) {
    return 'No se puede usar el consumidor final en el taller.';
  }
  if (/transici[oó]n no permitida/i.test(raw)) {
    return 'Ese cambio de estado no está permitido desde el estado actual.';
  }
  if (/cerrad|cancelad/i.test(raw) && /no se puede|no puede|no permite/i.test(raw)) {
    return 'Esta orden ya está cerrada o cancelada y no se puede editar.';
  }
  return raw;
}

function esSql(texto: string): boolean {
  return /sql|constraint|duplicate entry|jdbc|hibernate/i.test(texto);
}
