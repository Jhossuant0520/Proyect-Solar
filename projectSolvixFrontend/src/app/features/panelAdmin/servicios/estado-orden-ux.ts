/**
 * Catálogo único de presentación UX de estados de OT (FASE C.2 + C.3).
 * Fuente de verdad para consulta pública y panel interno.
 * No altera la máquina de estados del backend.
 */

import { EstadoOrdenServicio } from '../../../core/models/orden-servicio.models';
import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';

/** Fases visibles (5). CANCELADO no es una fase de progreso. */
export type FasePublicaOrden =
  | 'RECEPCION'
  | 'DIAGNOSTICO'
  | 'COTIZACION'
  | 'REPARACION'
  | 'ENTREGA'
  | 'CANCELADO';

export interface EstadoOrdenUx {
  codigo: EstadoOrdenServicio;
  /** Etiqueta corta del panel administrativo. */
  nombreInterno: string;
  /** Nombre corto orientado al cliente. */
  nombreCliente: string;
  fase: FasePublicaOrden;
  tituloCliente: string;
  descripcionCliente: string;
  siguienteCliente: string;
  /** Acción sugerida al cliente; null si no hay acción. */
  accionCliente: string | null;
  requiereAccionCliente: boolean;
  /** Qué está ocurriendo (vista taller / detalle interno). */
  descripcionTaller: string;
  /** Qué sigue (vista taller). */
  siguienteTaller: string;
  /** CTA principal interno; null = sin acción. */
  botonPrincipal: string | null;
  icono: string;
  tono: SolvixBadgeTone;
}

export interface FasePublicaUi {
  codigo: Exclude<FasePublicaOrden, 'CANCELADO'>;
  numero: number;
  label: string;
}

export const FASES_PUBLICAS: FasePublicaUi[] = [
  { codigo: 'RECEPCION', numero: 1, label: 'Recepción' },
  { codigo: 'DIAGNOSTICO', numero: 2, label: 'Diagnóstico' },
  { codigo: 'COTIZACION', numero: 3, label: 'Cotización y aprobación' },
  { codigo: 'REPARACION', numero: 4, label: 'Reparación' },
  { codigo: 'ENTREGA', numero: 5, label: 'Entrega' }
];

/** Todos los códigos reales en orden estable. */
export const CODIGOS_ESTADO_ORDEN: EstadoOrdenServicio[] = [
  'RECEPCIONADO',
  'EN_DIAGNOSTICO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'PENDIENTE_APROBACION',
  'APROBADO',
  'EN_REPARACION',
  'ESPERA_REPUESTO',
  'REQUIERE_APROBACION_ADICIONAL',
  'LISTO',
  'ENTREGADO',
  'CERRADO',
  'CANCELADO'
];

export type FaseProgresoEstado =
  | 'completada'
  | 'actual'
  | 'futura'
  | 'inactiva'
  | 'cancelada';

export type SeccionDetalleId = 'tecnico' | 'cotizaciones' | 'documentos' | 'actividad';

const CATALOGO: Record<EstadoOrdenServicio, EstadoOrdenUx> = {
  RECEPCIONADO: {
    codigo: 'RECEPCIONADO',
    nombreInterno: 'Recepcionado',
    nombreCliente: 'Recibido',
    fase: 'RECEPCION',
    tituloCliente: 'Recibimos tu equipo',
    descripcionCliente:
      'Tu equipo ya está en el taller. Pronto comenzaremos la revisión técnica.',
    siguienteCliente: 'Iniciaremos el diagnóstico para identificar el problema.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'El equipo fue recibido y está listo para iniciar el diagnóstico.',
    siguienteTaller: 'Iniciar el diagnóstico técnico.',
    botonPrincipal: 'Iniciar diagnóstico',
    icono: 'inventory_2',
    tono: 'neutral'
  },
  EN_DIAGNOSTICO: {
    codigo: 'EN_DIAGNOSTICO',
    nombreInterno: 'En diagnóstico',
    nombreCliente: 'En revisión',
    fase: 'DIAGNOSTICO',
    tituloCliente: 'Estamos revisando tu equipo',
    descripcionCliente:
      'Nuestro técnico está evaluando el equipo para encontrar la causa del problema.',
    siguienteCliente: 'Cuando terminemos el diagnóstico, prepararemos tu cotización.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'Estamos revisando el equipo para identificar la causa de la falla.',
    siguienteTaller: 'Registrar el diagnóstico técnico.',
    botonPrincipal: 'Registrar diagnóstico',
    icono: 'search',
    tono: 'neutral'
  },
  DIAGNOSTICADO: {
    codigo: 'DIAGNOSTICADO',
    nombreInterno: 'Diagnosticado',
    nombreCliente: 'Diagnóstico listo',
    fase: 'DIAGNOSTICO',
    tituloCliente: 'Preparando tu cotización',
    descripcionCliente:
      'Ya identificamos el problema. Estamos armando la cotización con el trabajo y los posibles repuestos.',
    siguienteCliente: 'Te presentaremos la cotización para que la revises.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'El diagnóstico quedó registrado. Falta armar la cotización inicial.',
    siguienteTaller: 'Preparar la cotización inicial.',
    botonPrincipal: 'Preparar cotización',
    icono: 'assignment',
    tono: 'neutral'
  },
  COTIZADO: {
    codigo: 'COTIZADO',
    nombreInterno: 'Cotizado',
    nombreCliente: 'Cotización lista',
    fase: 'COTIZACION',
    tituloCliente: 'Preparando tu cotización',
    descripcionCliente:
      'La cotización está lista en el taller. Pronto te la presentaremos para tu aprobación.',
    siguienteCliente: 'Recibirás la cotización para decidir si autorizas la reparación.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'Hay una cotización lista. Debe presentarse al cliente.',
    siguienteTaller: 'Presentar la cotización al cliente.',
    botonPrincipal: 'Presentar cotización',
    icono: 'request_quote',
    tono: 'warning'
  },
  PENDIENTE_APROBACION: {
    codigo: 'PENDIENTE_APROBACION',
    nombreInterno: 'Pendiente de aprobación',
    nombreCliente: 'Esperando tu aprobación',
    fase: 'COTIZACION',
    tituloCliente: 'Necesitamos tu aprobación',
    descripcionCliente:
      'Hay una cotización lista. Revísala y contáctanos para aprobar o rechazar la reparación.',
    siguienteCliente:
      'Cuando apruebes, iniciaremos la reparación. Si tienes dudas, habla con el taller.',
    accionCliente: 'Ver cotización',
    requiereAccionCliente: true,
    descripcionTaller: 'La cotización fue presentada. Esperamos la decisión del cliente.',
    siguienteTaller: 'Registrar la respuesta del cliente (aprobar o rechazar).',
    botonPrincipal: 'Registrar respuesta del cliente',
    icono: 'thumb_up',
    tono: 'warning'
  },
  APROBADO: {
    codigo: 'APROBADO',
    nombreInterno: 'Aprobado',
    nombreCliente: 'Aprobado',
    fase: 'REPARACION',
    tituloCliente: 'Aprobaste la reparación',
    descripcionCliente:
      'Ya autorizaste el trabajo. El taller está organizando la reparación de tu equipo.',
    siguienteCliente: 'Comenzaremos o continuaremos la reparación según el plan aprobado.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'El cliente aprobó la cotización. La reparación está autorizada.',
    siguienteTaller: 'Iniciar la reparación.',
    botonPrincipal: 'Iniciar reparación',
    icono: 'verified',
    tono: 'warning'
  },
  EN_REPARACION: {
    codigo: 'EN_REPARACION',
    nombreInterno: 'En reparación',
    nombreCliente: 'En reparación',
    fase: 'REPARACION',
    tituloCliente: 'Estamos reparando tu equipo',
    descripcionCliente: 'Tu equipo está en proceso de reparación en el taller.',
    siguienteCliente: 'Al terminar la reparación, te avisaremos para la entrega.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'La reparación está en curso.',
    siguienteTaller: 'Completar el trabajo y marcar la orden como lista.',
    botonPrincipal: 'Marcar como listo',
    icono: 'build',
    tono: 'neutral'
  },
  ESPERA_REPUESTO: {
    codigo: 'ESPERA_REPUESTO',
    nombreInterno: 'Espera repuesto',
    nombreCliente: 'Esperando repuesto',
    fase: 'REPARACION',
    tituloCliente: 'Esperando un repuesto',
    descripcionCliente:
      'La reparación está en pausa mientras llega un repuesto necesario.',
    siguienteCliente: 'Cuando llegue el repuesto, reanudaremos la reparación.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'La reparación está en pausa por un repuesto pendiente.',
    siguienteTaller: 'Cuando el repuesto esté listo, continuar la reparación.',
    botonPrincipal: 'Continuar reparación',
    icono: 'hourglass_empty',
    tono: 'warning'
  },
  REQUIERE_APROBACION_ADICIONAL: {
    codigo: 'REQUIERE_APROBACION_ADICIONAL',
    nombreInterno: 'Requiere aprobación adicional',
    nombreCliente: 'Aprobación adicional',
    fase: 'REPARACION',
    tituloCliente: 'Encontramos algo adicional',
    descripcionCliente:
      'Durante la reparación apareció un hallazgo que necesita tu autorización antes de continuar.',
    siguienteCliente: 'Contáctanos para revisar el alcance adicional y decidir cómo seguir.',
    accionCliente: 'Contactar taller',
    requiereAccionCliente: true,
    descripcionTaller:
      'Se detectó una situación no contemplada. Hace falta una cotización adicional.',
    siguienteTaller: 'Preparar la cotización adicional.',
    botonPrincipal: 'Preparar cotización adicional',
    icono: 'notification_important',
    tono: 'warning'
  },
  LISTO: {
    codigo: 'LISTO',
    nombreInterno: 'Listo',
    nombreCliente: 'Listo para entrega',
    fase: 'ENTREGA',
    tituloCliente: '¡Tu equipo está listo!',
    descripcionCliente:
      'La reparación terminó. Tu equipo está listo para que lo retires en el taller.',
    siguienteCliente: 'Acércate al taller con tu documento para reclamar el equipo.',
    accionCliente: 'Ver indicaciones de entrega',
    requiereAccionCliente: true,
    descripcionTaller: 'El equipo está listo para entrega.',
    siguienteTaller: 'Gestionar la entrega al cliente.',
    botonPrincipal: 'Gestionar entrega',
    icono: 'check_circle',
    tono: 'success'
  },
  ENTREGADO: {
    codigo: 'ENTREGADO',
    nombreInterno: 'Entregado',
    nombreCliente: 'Entregado',
    fase: 'ENTREGA',
    tituloCliente: 'Servicio finalizado',
    descripcionCliente: 'Tu equipo ya fue entregado. Gracias por confiar en nosotros.',
    siguienteCliente: 'No hay pasos pendientes en este servicio.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'El equipo ya fue entregado.',
    siguienteTaller: 'No hay acciones pendientes en el workflow.',
    botonPrincipal: null,
    icono: 'done_all',
    tono: 'success'
  },
  CERRADO: {
    codigo: 'CERRADO',
    nombreInterno: 'Cerrado',
    nombreCliente: 'Cerrado',
    fase: 'ENTREGA',
    tituloCliente: 'Servicio finalizado',
    descripcionCliente: 'Este servicio quedó cerrado. Si necesitas algo más, contáctanos.',
    siguienteCliente: 'No hay pasos pendientes en este servicio.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'La orden está cerrada.',
    siguienteTaller: 'No hay acciones pendientes.',
    botonPrincipal: null,
    icono: 'lock',
    tono: 'success'
  },
  CANCELADO: {
    codigo: 'CANCELADO',
    nombreInterno: 'Cancelado',
    nombreCliente: 'Cancelado',
    fase: 'CANCELADO',
    tituloCliente: 'Servicio cancelado',
    descripcionCliente: 'Este servicio fue cancelado. Si tienes dudas, comunícate con el taller.',
    siguienteCliente: 'Si deseas retomar el servicio, habla con el taller.',
    accionCliente: null,
    requiereAccionCliente: false,
    descripcionTaller: 'Esta orden fue cancelada.',
    siguienteTaller: 'Revisa el historial si necesitas el contexto de la cancelación.',
    botonPrincipal: null,
    icono: 'cancel',
    tono: 'error'
  }
};

const FALLBACK: EstadoOrdenUx = {
  codigo: 'RECEPCIONADO',
  nombreInterno: 'Estado',
  nombreCliente: 'En proceso',
  fase: 'RECEPCION',
  tituloCliente: 'Consulta de servicio',
  descripcionCliente: 'Estamos trabajando en tu orden. Para más detalle, contacta al taller.',
  siguienteCliente: 'Comunícate con el taller si necesitas información adicional.',
  accionCliente: null,
  requiereAccionCliente: false,
  descripcionTaller: 'Revisa el estado de la orden.',
  siguienteTaller: 'Confirma el siguiente paso con el flujo de la orden.',
  botonPrincipal: null,
  icono: 'info',
  tono: 'neutral'
};

/** Resuelve el UX por código de estado. Nunca por etiqueta. */
export function estadoOrdenUx(codigo: EstadoOrdenServicio | string | null | undefined): EstadoOrdenUx {
  if (!codigo) {
    return FALLBACK;
  }
  return CATALOGO[codigo as EstadoOrdenServicio] ?? { ...FALLBACK, nombreInterno: String(codigo) };
}

export function numeroFasePublica(fase: FasePublicaOrden): number | null {
  const found = FASES_PUBLICAS.find(f => f.codigo === fase);
  return found ? found.numero : null;
}

export function labelFasePublica(fase: FasePublicaOrden): string {
  if (fase === 'CANCELADO') {
    return 'Cancelado';
  }
  return FASES_PUBLICAS.find(f => f.codigo === fase)?.label ?? String(fase);
}

export function resumenFaseActual(
  codigo: EstadoOrdenServicio | string | null | undefined
): { numero: number; total: number; label: string } | null {
  const ux = estadoOrdenUx(codigo);
  const numero = numeroFasePublica(ux.fase);
  if (numero == null) {
    return null;
  }
  return { numero, total: FASES_PUBLICAS.length, label: labelFasePublica(ux.fase) };
}

/**
 * Progreso de las 5 fases.
 * En CANCELADO: si se conoce la fase previa, se marca como cancelada;
 * si no, todas quedan inactivas (no inventamos).
 */
export function progresoFasesPublicas(
  codigo: EstadoOrdenServicio | string | null | undefined,
  opciones?: { faseAlCancelar?: FasePublicaOrden | null }
): Array<FasePublicaUi & { estado: FaseProgresoEstado }> {
  const ux = estadoOrdenUx(codigo);
  if (ux.fase === 'CANCELADO') {
    const faseStop = opciones?.faseAlCancelar;
    const numStop = faseStop ? numeroFasePublica(faseStop) : null;
    if (numStop == null) {
      return FASES_PUBLICAS.map(f => ({ ...f, estado: 'inactiva' as const }));
    }
    return FASES_PUBLICAS.map(f => {
      if (f.numero < numStop) {
        return { ...f, estado: 'completada' as const };
      }
      if (f.numero === numStop) {
        return { ...f, estado: 'cancelada' as const };
      }
      return { ...f, estado: 'futura' as const };
    });
  }
  const actual = numeroFasePublica(ux.fase) ?? 1;
  return FASES_PUBLICAS.map(f => {
    let estado: FaseProgresoEstado = 'futura';
    if (f.numero < actual) {
      estado = 'completada';
    } else if (f.numero === actual) {
      estado = 'actual';
    }
    return { ...f, estado };
  });
}

/** true si conviene destacar el bloque de contacto del taller. */
export function destacarContactoPublico(
  codigo: EstadoOrdenServicio | string | null | undefined
): boolean {
  return (
    codigo === 'PENDIENTE_APROBACION' ||
    codigo === 'REQUIERE_APROBACION_ADICIONAL' ||
    codigo === 'LISTO' ||
    codigo === 'CANCELADO'
  );
}

/** Secciones abiertas por defecto en el detalle interno (C.3). */
export function seccionesAbiertasPorEstado(
  codigo: EstadoOrdenServicio | string | null | undefined
): Record<SeccionDetalleId, boolean> {
  const base: Record<SeccionDetalleId, boolean> = {
    tecnico: false,
    cotizaciones: false,
    documentos: false,
    actividad: false
  };
  switch (codigo) {
    case 'RECEPCIONADO':
    case 'EN_DIAGNOSTICO':
      return { ...base, tecnico: true };
    case 'DIAGNOSTICADO':
    case 'COTIZADO':
    case 'PENDIENTE_APROBACION':
    case 'REQUIERE_APROBACION_ADICIONAL':
      return { ...base, cotizaciones: true };
    case 'APROBADO':
    case 'EN_REPARACION':
    case 'ESPERA_REPUESTO':
      return { ...base, tecnico: true };
    case 'LISTO':
      return { ...base, documentos: true, tecnico: true };
    case 'ENTREGADO':
    case 'CERRADO':
      return { ...base, documentos: true };
    case 'CANCELADO':
      return { ...base, actividad: true };
    default:
      return { ...base, tecnico: true };
  }
}

/** Documento conceptual a destacar según la etapa. */
export function documentoRelevantePorEstado(
  codigo: EstadoOrdenServicio | string | null | undefined
): 'COMPROBANTE_RECEPCION' | 'COTIZACION' | 'ACTA_ENTREGA' | null {
  switch (codigo) {
    case 'RECEPCIONADO':
    case 'EN_DIAGNOSTICO':
      return 'COMPROBANTE_RECEPCION';
    case 'COTIZADO':
    case 'PENDIENTE_APROBACION':
    case 'REQUIERE_APROBACION_ADICIONAL':
      return 'COTIZACION';
    case 'LISTO':
    case 'ENTREGADO':
    case 'CERRADO':
      return 'ACTA_ENTREGA';
    default:
      return null;
  }
}
