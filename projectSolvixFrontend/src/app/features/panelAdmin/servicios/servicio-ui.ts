import { HttpErrorResponse } from '@angular/common/http';
import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import { EquipoResponseDTO, TipoEquipo } from '../../../core/models/equipo.models';
import {
  EstadoOrdenServicio,
  EstadoRepuestoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../core/models/orden-servicio.models';
import { formatFechaVenta, mapHttpError as mapVentaHttpError, ApiUiError } from '../venta/venta-ui';

/** Espejo de transiciones FE 3.15.7. La autoridad sigue siendo el backend. */
const TRANSICIONES: Record<EstadoOrdenServicio, EstadoOrdenServicio[]> = {
  RECEPCIONADO: ['EN_DIAGNOSTICO', 'CANCELADO'],
  EN_DIAGNOSTICO: ['DIAGNOSTICADO', 'CANCELADO'],
  DIAGNOSTICADO: ['COTIZADO', 'CANCELADO'],
  COTIZADO: ['PENDIENTE_APROBACION', 'CANCELADO'],
  PENDIENTE_APROBACION: [
    'APROBADO',
    'EN_REPARACION',
    'COTIZADO',
    'REQUIERE_APROBACION_ADICIONAL',
    'CANCELADO'
  ],
  APROBADO: ['EN_REPARACION', 'CANCELADO'],
  EN_REPARACION: ['ESPERA_REPUESTO', 'REQUIERE_APROBACION_ADICIONAL', 'LISTO'],
  ESPERA_REPUESTO: ['EN_REPARACION'],
  // Ampliación vía cotización (3.15.7); no EN_REPARACION directo desde FE.
  REQUIERE_APROBACION_ADICIONAL: ['PENDIENTE_APROBACION'],
  LISTO: ['ENTREGADO'],
  ENTREGADO: ['CERRADO'],
  CERRADO: [],
  CANCELADO: []
};

/** Línea principal del workflow (sin ESPERA_REPUESTO, REQUIERE ni CANCELADO). */
export const WORKFLOW_PRINCIPAL: EstadoOrdenServicio[] = [
  'RECEPCIONADO',
  'EN_DIAGNOSTICO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'PENDIENTE_APROBACION',
  'APROBADO',
  'EN_REPARACION',
  'LISTO',
  'ENTREGADO',
  'CERRADO'
];

export type TipoAccionWorkflow =
  | 'directa'
  | 'confirmacion'
  | 'motivoCancelacion'
  | 'esperaRepuesto'
  | 'nuevaFalla'
  | 'completarDiagnostico'
  | 'completarReparacion'
  | 'gestionarEntrega'
  | 'crearCotizacion'
  | 'presentarCotizacion'
  | 'aprobarCotizacion'
  | 'cotizacionAdicional';
export interface AccionWorkflowUi {
  destino: EstadoOrdenServicio;
  titulo: string;
  descripcion: string;
  boton: string;
  esCancelacion: boolean;
  requiereDiagnostico: boolean;
  requiereTrabajo: boolean;
}

const ACCION_POR_DESTINO: Partial<
  Record<EstadoOrdenServicio, Omit<AccionWorkflowUi, 'destino' | 'esCancelacion'>>
> = {
  EN_DIAGNOSTICO: {
    titulo: 'Iniciar diagnóstico',
    descripcion: 'Se iniciará la revisión técnica del equipo.',
    boton: 'Iniciar diagnóstico',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  DIAGNOSTICADO: {
    titulo: 'Completar diagnóstico',
    descripcion: 'Se guarda la ficha técnica y la orden queda diagnosticada.',
    boton: 'Guardar diagnóstico',
    requiereDiagnostico: true,
    requiereTrabajo: false
  },
  COTIZADO: {
    titulo: 'Preparar cotización',
    descripcion: 'Crea la cotización inicial a partir del diagnóstico.',
    boton: 'Preparar cotización',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  PENDIENTE_APROBACION: {
    titulo: 'Presentar cotización',
    descripcion: 'Presenta la cotización al cliente para su aprobación.',
    boton: 'Presentar cotización',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  APROBADO: {
    titulo: 'Aprobar cotización',
    descripcion: 'Confirma que el cliente aprobó la cotización vigente.',
    boton: 'Aprobar cotización',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  EN_REPARACION: {
    titulo: 'Iniciar reparación',
    descripcion: 'Se autoriza el inicio de la reparación.',
    boton: 'Iniciar reparación',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  ESPERA_REPUESTO: {
    titulo: 'Poner en espera por repuesto',
    descripcion: 'La reparación queda en espera de repuesto. No consume inventario todavía.',
    boton: 'Poner en espera por repuesto',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  REQUIERE_APROBACION_ADICIONAL: {
    titulo: 'Registrar nueva falla',
    descripcion: 'Se registra una nueva falla detectada durante la reparación.',
    boton: 'Registrar nueva falla',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  LISTO: {
    titulo: 'Marcar como listo',
    descripcion: 'Se registra el trabajo realizado y la orden queda lista para entrega.',
    boton: 'Marcar como listo',
    requiereDiagnostico: false,
    requiereTrabajo: true
  },
  ENTREGADO: {
    titulo: 'Gestionar entrega',
    descripcion: 'Gestiona la entrega del equipo al cliente.',
    boton: 'Gestionar entrega',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  CERRADO: {
    titulo: 'Cerrar orden de servicio',
    descripcion: 'Se cierra la orden de servicio de forma definitiva.',
    boton: 'Cerrar orden',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  CANCELADO: {
    titulo: 'Cancelar orden',
    descripcion: 'Esta acción detiene el workflow. No se puede revertir desde la UI.',
    boton: 'Cancelar orden',
    requiereDiagnostico: false,
    requiereTrabajo: false
  }
};

/**
 * Cómo debe tratarse la UI al avanzar hacia un destino (3.15.7).
 * Cotización: no usar transición de estado directa; abrir CTAs de cotización.
 */
export function tipoAccionWorkflow(destino: EstadoOrdenServicio | string): TipoAccionWorkflow {
  switch (destino) {
    case 'CANCELADO':
      return 'motivoCancelacion';
    case 'ESPERA_REPUESTO':
      return 'esperaRepuesto';
    case 'REQUIERE_APROBACION_ADICIONAL':
      return 'nuevaFalla';
    case 'DIAGNOSTICADO':
      return 'completarDiagnostico';
    case 'LISTO':
      return 'completarReparacion';
    case 'ENTREGADO':
      // Destino desde LISTO: UI hook para el diálogo de entrega (3.15.5.3).
      return 'gestionarEntrega';
    case 'COTIZADO':
      return 'crearCotizacion';
    case 'PENDIENTE_APROBACION':
      return 'presentarCotizacion';
    case 'APROBADO':
      return 'aprobarCotizacion';
    case 'CERRADO':
      return 'confirmacion';
    default:
      return 'directa';
  }
}

export function accionParaDestino(destino: EstadoOrdenServicio): AccionWorkflowUi {
  const base = ACCION_POR_DESTINO[destino];
  return {
    destino,
    titulo: base?.titulo ?? labelEstadoOrden(destino),
    descripcion: base?.descripcion ?? `Cambiar estado a ${labelEstadoOrden(destino)}.`,
    boton: base?.boton ?? labelEstadoOrden(destino),
    esCancelacion: destino === 'CANCELADO',
    requiereDiagnostico: base?.requiereDiagnostico ?? false,
    requiereTrabajo: base?.requiereTrabajo ?? false
  };
}

/** Acción principal hacia adelante (excluye cancelación, espera y nueva falla). */
export function accionPrincipalDesde(estado: EstadoOrdenServicio | string): AccionWorkflowUi | null {
  if (estado === 'EN_DIAGNOSTICO') {
    return {
      ...accionParaDestino('DIAGNOSTICADO'),
      titulo: 'Completar ficha técnica',
      descripcion: 'Completa y guarda el diagnóstico técnico.',
      boton: 'Ir al diagnóstico'
    };
  }
  // Cotización: CTAs de dominio (no transición directa COTIZADO→APROBADO).
  if (estado === 'DIAGNOSTICADO') {
    return accionParaDestino('COTIZADO');
  }
  if (estado === 'COTIZADO') {
    return accionParaDestino('PENDIENTE_APROBACION');
  }
  if (estado === 'PENDIENTE_APROBACION') {
    return accionParaDestino('APROBADO');
  }
  if (estado === 'REQUIERE_APROBACION_ADICIONAL') {
    return {
      destino: 'PENDIENTE_APROBACION',
      titulo: 'Ampliar cotización',
      descripcion: 'Prepara una cotización adicional por la nueva situación.',
      boton: 'Ampliar cotización',
      esCancelacion: false,
      requiereDiagnostico: false,
      requiereTrabajo: false
    };
  }
  if (estado === 'LISTO') {
    return accionParaDestino('ENTREGADO');
  }
  if (estado === 'ENTREGADO' || estado === 'CERRADO') {
    return null;
  }
  const destinos = transicionesDesde(estado).filter(
    d =>
      d !== 'CANCELADO' &&
      d !== 'REQUIERE_APROBACION_ADICIONAL' &&
      d !== 'ESPERA_REPUESTO' &&
      d !== 'PENDIENTE_APROBACION' &&
      d !== 'APROBADO' &&
      d !== 'COTIZADO'
  );
  if (destinos.length === 0) {
    if (estado === 'ESPERA_REPUESTO' && transicionesDesde(estado).includes('EN_REPARACION')) {
      return {
        ...accionParaDestino('EN_REPARACION'),
        titulo: 'Continuar reparación',
        descripcion: 'Se retoma la reparación tras la espera de repuesto.',
        boton: 'Continuar reparación'
      };
    }
    return null;
  }
  if (estado === 'EN_REPARACION' && destinos.includes('LISTO')) {
    return accionParaDestino('LISTO');
  }
  if (estado === 'APROBADO' && destinos.includes('EN_REPARACION')) {
    return accionParaDestino('EN_REPARACION');
  }
  return accionParaDestino(destinos[0]);
}

export function accionCancelarDesde(estado: EstadoOrdenServicio | string): AccionWorkflowUi | null {
  if (!transicionesDesde(estado).includes('CANCELADO')) {
    return null;
  }
  return accionParaDestino('CANCELADO');
}

export function accionSecundariaEspera(estado: EstadoOrdenServicio | string): AccionWorkflowUi | null {
  if (estado !== 'EN_REPARACION') {
    return null;
  }
  if (!transicionesDesde(estado).includes('ESPERA_REPUESTO')) {
    return null;
  }
  return accionParaDestino('ESPERA_REPUESTO');
}

/** Acción secundaria: nueva falla durante reparación. */
export function accionNuevaFalla(estado: EstadoOrdenServicio | string): AccionWorkflowUi | null {
  if (estado !== 'EN_REPARACION') {
    return null;
  }
  if (!transicionesDesde(estado).includes('REQUIERE_APROBACION_ADICIONAL')) {
    return null;
  }
  return accionParaDestino('REQUIERE_APROBACION_ADICIONAL');
}

export function textoProximaAccion(
  estado: EstadoOrdenServicio | string,
  opciones?: { pendingRepuestos?: number }
): string {
  const pending = opciones?.pendingRepuestos ?? 0;
  switch (estado) {
    case 'RECEPCIONADO':
      return 'Iniciar diagnóstico';
    case 'EN_DIAGNOSTICO':
      return 'Completar ficha técnica';
    case 'DIAGNOSTICADO':
      return 'Preparar cotización inicial.';
    case 'COTIZADO':
      return 'Presentar cotización al cliente.';
    case 'PENDIENTE_APROBACION':
      return 'Esperando aprobación del cliente.';
    case 'APROBADO':
      return 'Reparación autorizada.';
    case 'EN_REPARACION':
      if (pending > 0) {
        return pending === 1
          ? 'Continuar reparación. Existe un repuesto pendiente.'
          : `Continuar reparación. Hay ${pending} repuestos pendientes.`;
      }
      return 'Continuar reparación';
    case 'ESPERA_REPUESTO':
      if (pending > 0) {
        return pending === 1
          ? 'Resolver repuestos pendientes. Queda 1 pendiente.'
          : `Resolver repuestos pendientes. Quedan ${pending} pendientes.`;
      }
      return 'Resolver repuestos pendientes';
    case 'REQUIERE_APROBACION_ADICIONAL':
      return 'Existe una nueva situación que requiere una ampliación de cotización.';
    case 'LISTO':
      return 'El equipo está listo para entrega.';
    case 'ENTREGADO':
      return 'Orden entregada.';
    case 'CERRADO':
      return 'Orden completada';
    case 'CANCELADO':
      return 'Orden cancelada';
    default:
      return 'Revisa el estado de la orden.';
  }
}

export function requisitoBloqueaAccion(
  orden: OrdenServicioResponseDTO,
  accion: AccionWorkflowUi
): string | null {
  if (accion.requiereDiagnostico && !(orden.diagnostico ?? '').trim()) {
    return 'Completa el diagnóstico técnico antes de continuar.';
  }
  if (accion.requiereTrabajo && !(orden.trabajoRealizado ?? '').trim()) {
    return 'Completa el trabajo realizado antes de marcar la orden como lista.';
  }
  return null;
}

export type WorkflowPasoEstado = 'completado' | 'actual' | 'pendiente' | 'especial' | 'cancelado';

export interface WorkflowPasoUi {
  estado: EstadoOrdenServicio;
  label: string;
  fase: WorkflowPasoEstado;
}

export function pasosWorkflow(estadoActual: EstadoOrdenServicio | string): WorkflowPasoUi[] {
  if (estadoActual === 'CANCELADO') {
    return WORKFLOW_PRINCIPAL.map((estado, index) => ({
      estado,
      label: labelCortoWorkflow(estado),
      fase: index === 0 ? 'cancelado' : 'pendiente'
    }));
  }

  const esEspecialReparacion =
    estadoActual === 'ESPERA_REPUESTO' || estadoActual === 'REQUIERE_APROBACION_ADICIONAL';

  const idxActual = esEspecialReparacion
    ? WORKFLOW_PRINCIPAL.indexOf('EN_REPARACION')
    : WORKFLOW_PRINCIPAL.indexOf(estadoActual as EstadoOrdenServicio);

  return WORKFLOW_PRINCIPAL.map((estado, index) => {
    let fase: WorkflowPasoEstado = 'pendiente';
    if (idxActual < 0) {
      fase = 'pendiente';
    } else if (index < idxActual) {
      fase = 'completado';
    } else if (index === idxActual) {
      fase = esEspecialReparacion ? 'especial' : 'actual';
    }
    return { estado, label: labelCortoWorkflow(estado), fase };
  });
}

function labelCortoWorkflow(estado: EstadoOrdenServicio): string {
  switch (estado) {
    case 'RECEPCIONADO':
      return 'Recepción';
    case 'EN_DIAGNOSTICO':
      return 'Diagnóstico';
    case 'DIAGNOSTICADO':
      return 'Diagnosticado';
    case 'COTIZADO':
      return 'Cotizado';
    case 'PENDIENTE_APROBACION':
      return 'Aprobación';
    case 'APROBADO':
      return 'Aprobado';
    case 'EN_REPARACION':
      return 'Reparación';
    case 'LISTO':
      return 'Listo';
    case 'ENTREGADO':
      return 'Entrega';
    case 'CERRADO':
      return 'Cierre';
    default:
      return labelEstadoOrden(estado);
  }
}

const LABEL_ESTADO: Record<EstadoOrdenServicio, string> = {
  RECEPCIONADO: 'Recepcionado',
  EN_DIAGNOSTICO: 'En diagnóstico',
  DIAGNOSTICADO: 'Diagnosticado',
  COTIZADO: 'Cotizado',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  APROBADO: 'Aprobado',
  EN_REPARACION: 'En reparación',
  ESPERA_REPUESTO: 'Espera repuesto',
  REQUIERE_APROBACION_ADICIONAL: 'Requiere aprobación adicional',
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
    case 'REQUIERE_APROBACION_ADICIONAL':
    case 'COTIZADO':
    case 'PENDIENTE_APROBACION':
    case 'APROBADO':
      return 'warning';
    case 'DIAGNOSTICADO':
      return 'neutral';
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
    case 'DIAGNOSTICADO':
    case 'COTIZADO':
    case 'PENDIENTE_APROBACION':
    case 'APROBADO':
      return 'diagnostico';
    case 'EN_REPARACION':
    case 'ESPERA_REPUESTO':
      return 'trabajoRealizado';
    case 'REQUIERE_APROBACION_ADICIONAL':
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
  referenciaInterna?: string | null;
  /** Fallback legacy si el payload aún trae `nombre`. */
  nombre?: string | null;
  equipoTipo?: string | null;
  equipoMarca?: string | null;
  equipoModelo?: string | null;
  equipoNombre?: string | null;
}): string {
  const tipo = labelTipoEquipo(equipo.equipoTipo ?? equipo.tipoEquipo);
  const marca = equipo.equipoMarca ?? equipo.marca;
  const modelo = equipo.equipoModelo ?? equipo.modelo;
  const alias = equipo.equipoNombre ?? equipo.referenciaInterna ?? equipo.nombre;
  const piezas = [tipo, marca, modelo].filter(Boolean);
  const base = piezas.length ? piezas.join(' · ') : 'Equipo';
  return alias ? `${base} (${alias})` : base;
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
  // No mostrar stacktraces / FQCN Java crudos (p. ej. com/google/zxing/EncodeHintType).
  if (esMensajeTecnicoJava(raw)) {
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

/** Mensajes de enlace/classpath o FQCN que no deben verse en la UI. */
function esMensajeTecnicoJava(texto: string): boolean {
  const t = texto.trim();
  if (/NoClassDefFoundError|ClassNotFoundException|NoSuchMethodError|LinkageError/i.test(t)) {
    return true;
  }
  // Formato típico de NoClassDefFoundError: com/google/zxing/EncodeHintType
  if (/^[a-z][a-z0-9_]*(\/[A-Za-z0-9_$]+)+$/.test(t)) {
    return true;
  }
  // FQCN con puntos: com.google.zxing.EncodeHintType
  if (/^[a-z][a-z0-9_]*(\.[A-Za-z0-9_$]+){2,}$/.test(t) && !/\s/.test(t)) {
    return true;
  }
  return false;
}

/** Estados OT donde se puede planificar / editar / anular líneas. */
export function puedePlanificarRepuestos(estado: EstadoOrdenServicio | string): boolean {
  return (
    estado === 'RECEPCIONADO' ||
    estado === 'EN_DIAGNOSTICO' ||
    estado === 'DIAGNOSTICADO' ||
    estado === 'COTIZADO' ||
    estado === 'PENDIENTE_APROBACION' ||
    estado === 'APROBADO' ||
    estado === 'EN_REPARACION' ||
    estado === 'ESPERA_REPUESTO'
  );
}

/** Labels de estado de cotización (capa visible). */
const LABEL_ESTADO_COTIZACION: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ANULADA: 'Anulada'
};

const LABEL_TIPO_COTIZACION: Record<string, string> = {
  INICIAL: 'Inicial',
  ADICIONAL: 'Adicional'
};

const LABEL_TIPO_DETALLE_COTIZACION: Record<string, string> = {
  REPUESTO: 'Repuesto',
  MANO_OBRA: 'Mano de obra',
  OTRO: 'Otro'
};

export function labelEstadoCotizacion(estado: string): string {
  return LABEL_ESTADO_COTIZACION[estado] ?? String(estado);
}

export function labelTipoCotizacion(tipo: string): string {
  return LABEL_TIPO_COTIZACION[tipo] ?? String(tipo);
}

export function labelTipoDetalleCotizacion(tipo: string): string {
  return LABEL_TIPO_DETALLE_COTIZACION[tipo] ?? String(tipo);
}

export function toneEstadoCotizacion(estado: string): SolvixBadgeTone {
  switch (estado) {
    case 'APROBADA':
      return 'success';
    case 'PENDIENTE_APROBACION':
    case 'BORRADOR':
      return 'warning';
    case 'RECHAZADA':
    case 'ANULADA':
      return 'error';
    default:
      return 'neutral';
  }
}

/** Consumo físico solo en reparación o espera. */
export function puedeConsumirRepuestosEnEstado(estado: EstadoOrdenServicio | string): boolean {
  return estado === 'EN_REPARACION' || estado === 'ESPERA_REPUESTO';
}

const LABEL_ESTADO_REPUESTO: Record<EstadoRepuestoOrdenServicio, string> = {
  PLANIFICADO: 'Planificado',
  PARCIAL: 'Parcial',
  CONSUMIDO: 'Consumido',
  DEVUELTO: 'Devuelto',
  ANULADO: 'Anulado'
};

export function labelEstadoRepuesto(estado: EstadoRepuestoOrdenServicio | string): string {
  return LABEL_ESTADO_REPUESTO[estado as EstadoRepuestoOrdenServicio] ?? String(estado);
}

export function toneEstadoRepuesto(estado: EstadoRepuestoOrdenServicio | string): SolvixBadgeTone {
  switch (estado) {
    case 'CONSUMIDO':
      return 'success';
    case 'PARCIAL':
    case 'PLANIFICADO':
      return 'warning';
    case 'ANULADO':
      return 'error';
    case 'DEVUELTO':
    default:
      return 'neutral';
  }
}

/** Pendientes de consumir (excluye anulados). */
export function contarRepuestosPendientes(
  lineas: { anulado?: boolean; cantidadPendiente?: number }[]
): number {
  return lineas
    .filter(l => !l.anulado)
    .reduce((acc, l) => acc + Math.max(0, l.cantidadPendiente ?? 0), 0);
}

/**
 * Costo histórico visible. Nunca muestra $0 si el costo es null / desconocido.
 */
export function textoCostoHistoricoRepuesto(linea: {
  costoConocido?: boolean;
  costoHistorico?: number | null;
}): string | null {
  if (linea.costoConocido && linea.costoHistorico != null) {
    return null; // caller formatea con formatMoney
  }
  return 'Costo histórico no disponible';
}
