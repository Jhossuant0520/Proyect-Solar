import { HttpErrorResponse } from '@angular/common/http';
import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import { EquipoResponseDTO, TipoEquipo } from '../../../core/models/equipo.models';
import {
  EstadoOrdenServicio,
  EstadoRepuestoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../core/models/orden-servicio.models';
import { formatFechaVenta, mapHttpError as mapVentaHttpError, ApiUiError } from '../venta/venta-ui';
import { CODIGOS_ESTADO_ORDEN, estadoOrdenUx } from './estado-orden-ux';

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
  const ux = estadoOrdenUx(estado);
  const conLabel = (accion: AccionWorkflowUi): AccionWorkflowUi =>
    ux.botonPrincipal ? { ...accion, boton: ux.botonPrincipal, titulo: ux.botonPrincipal } : accion;

  if (estado === 'EN_DIAGNOSTICO') {
    return conLabel({
      ...accionParaDestino('DIAGNOSTICADO'),
      titulo: 'Registrar diagnóstico',
      descripcion: 'Completa y guarda el diagnóstico técnico.',
      boton: 'Registrar diagnóstico'
    });
  }
  // Cotización: CTAs de dominio (no transición directa COTIZADO→APROBADO).
  if (estado === 'DIAGNOSTICADO') {
    return conLabel(accionParaDestino('COTIZADO'));
  }
  if (estado === 'COTIZADO') {
    return conLabel(accionParaDestino('PENDIENTE_APROBACION'));
  }
  if (estado === 'PENDIENTE_APROBACION') {
    return conLabel({
      ...accionParaDestino('APROBADO'),
      titulo: 'Registrar respuesta del cliente',
      descripcion: 'Registra la aprobación o el rechazo de la cotización vigente.',
      boton: 'Registrar respuesta del cliente'
    });
  }
  if (estado === 'REQUIERE_APROBACION_ADICIONAL') {
    return conLabel({
      destino: 'PENDIENTE_APROBACION',
      titulo: 'Preparar cotización adicional',
      descripcion: 'Prepara una cotización adicional por la nueva situación.',
      boton: 'Preparar cotización adicional',
      esCancelacion: false,
      requiereDiagnostico: false,
      requiereTrabajo: false
    });
  }
  if (estado === 'LISTO') {
    return conLabel(accionParaDestino('ENTREGADO'));
  }
  if (estado === 'ENTREGADO' || estado === 'CERRADO' || estado === 'CANCELADO') {
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
      return conLabel({
        ...accionParaDestino('EN_REPARACION'),
        titulo: 'Continuar reparación',
        descripcion: 'Se retoma la reparación tras la espera de repuesto.',
        boton: 'Continuar reparación'
      });
    }
    return null;
  }
  if (estado === 'EN_REPARACION' && destinos.includes('LISTO')) {
    return conLabel(accionParaDestino('LISTO'));
  }
  if (estado === 'APROBADO' && destinos.includes('EN_REPARACION')) {
    return conLabel(accionParaDestino('EN_REPARACION'));
  }
  if (estado === 'RECEPCIONADO' && destinos.includes('EN_DIAGNOSTICO')) {
    return conLabel(accionParaDestino('EN_DIAGNOSTICO'));
  }
  return conLabel(accionParaDestino(destinos[0]));
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
  const ux = estadoOrdenUx(estado);
  if (estado === 'EN_REPARACION' && pending > 0) {
    return pending === 1
      ? 'Continuar reparación. Existe un repuesto pendiente.'
      : `Continuar reparación. Hay ${pending} repuestos pendientes.`;
  }
  if (estado === 'ESPERA_REPUESTO' && pending > 0) {
    return pending === 1
      ? 'Resolver repuestos pendientes. Queda 1 pendiente.'
      : `Resolver repuestos pendientes. Quedan ${pending} pendientes.`;
  }
  return ux.siguienteTaller;
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

/** Etiquetas del panel: fuente única = estado-orden-ux. */
export const ESTADOS_ORDEN: { id: EstadoOrdenServicio; label: string }[] = CODIGOS_ESTADO_ORDEN.map(
  id => ({ id, label: estadoOrdenUx(id).nombreInterno })
);

export function labelEstadoOrden(estado: EstadoOrdenServicio | string): string {
  return estadoOrdenUx(estado).nombreInterno;
}

/** Texto corto para el toast de cambio de estado (nunca códigos RECEPCIONADO). */
export function mensajeCambioEstado(
  anterior: EstadoOrdenServicio | string | null | undefined,
  nuevo: EstadoOrdenServicio | string | null | undefined
): string {
  const destino = nuevo ? labelEstadoOrden(nuevo) : '';
  if (anterior && nuevo) {
    return `${labelEstadoOrden(anterior)} → ${destino}`;
  }
  return destino ? `Estado: ${destino}.` : 'Estado actualizado.';
}

export function labelTipoEquipo(tipo: TipoEquipo | string | null | undefined): string {
  if (!tipo) {
    return '—';
  }
  return LABEL_TIPO_EQUIPO[tipo as TipoEquipo] ?? String(tipo);
}

export function toneEstadoOrden(estado: EstadoOrdenServicio | string): SolvixBadgeTone {
  return estadoOrdenUx(estado).tono;
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

export function puedeEditarCampoTecnico(estado: EstadoOrdenServicio | string, campoId: CampoTecnicoId): boolean {
  if (esEstadoTerminal(estado)) return false;

  switch (campoId) {
    case 'diagnostico':
      return estado === 'EN_DIAGNOSTICO';
      
    case 'trabajoRealizado':
      return estado === 'EN_REPARACION' || estado === 'ESPERA_REPUESTO' || estado === 'REQUIERE_APROBACION_ADICIONAL';
      
    case 'problemaReportado':
    case 'observaciones':
      return true;
      
    default:
      return false;
  }
}

export function hintCampoBloqueado(estado: EstadoOrdenServicio | string, campoId: CampoTecnicoId): string | null {
  if (campoId === 'diagnostico') {
    if (estado === 'RECEPCIONADO') {
      return 'El diagnóstico estará disponible cuando inicies el diagnóstico.';
    }
  }
  if (campoId === 'trabajoRealizado') {
    if (estado === 'RECEPCIONADO' || estado === 'EN_DIAGNOSTICO' || estado === 'DIAGNOSTICADO' || estado === 'COTIZADO' || estado === 'PENDIENTE_APROBACION' || estado === 'APROBADO') {
      return 'El trabajo realizado se registra durante la reparación.';
    }
  }
  return null;
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
  /** Material Symbol — solo presentación / escaneo. */
  icon: string;
  maxLength: number;
}

/** Labels y hints de presentación. No inventan datos técnicos. */
export const CAMPOS_TECNICOS: CampoTecnicoUi[] = [
  {
    id: 'problemaReportado',
    label: 'Problema reportado',
    hint: 'Qué indicó el cliente al entregar el equipo.',
    icon: 'assignment',
    maxLength: 2000
  },
  {
    id: 'diagnostico',
    label: 'Diagnóstico',
    hint: 'Qué encontró el técnico al revisar el equipo.',
    icon: 'troubleshoot',
    maxLength: 2000
  },
  {
    id: 'trabajoRealizado',
    label: 'Trabajo realizado',
    hint: 'Qué trabajo o reparación se realizó.',
    icon: 'handyman',
    maxLength: 2000
  },
  {
    id: 'observaciones',
    label: 'Observaciones',
    hint: 'Información adicional importante sobre la orden.',
    icon: 'sticky_note_2',
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

export type PrioridadAntiguedadCodigo = 'BAJA' | 'MEDIA' | 'ALTA' | 'MUY_ALTA';

export interface PrioridadAntiguedadUi {
  codigo: PrioridadAntiguedadCodigo;
  label: string;
  labelCorto: string;
  dias: number;
  tone: SolvixBadgeTone;
  /** true cuando la orden sigue activa (no entregada, cerrada ni cancelada). */
  activa: boolean;
  resumenEdad: string;
}

const ICONO_PRIORIDAD_ANTIGUEDAD: Record<PrioridadAntiguedadCodigo, string> = {
  BAJA: 'keyboard_arrow_down',
  MEDIA: 'remove',
  ALTA: 'keyboard_arrow_up',
  MUY_ALTA: 'keyboard_double_arrow_up'
};

export function iconoPrioridadAntiguedad(codigo: PrioridadAntiguedadCodigo): string {
  return ICONO_PRIORIDAD_ANTIGUEDAD[codigo] ?? 'remove';
}

/**
 * Calcula días calendario transcurridos entre la fecha local de recepción y `ahora` (medianoche local).
 * Nunca devuelve un valor negativo.
 */
export function calcularDiasCalendarioDesde(
  fechaRecepcion: string | number[] | null | undefined,
  ahora: Date = new Date()
): number | null {
  if (fechaRecepcion == null) {
    return null;
  }
  let y: number;
  let m: number;
  let d: number;

  if (Array.isArray(fechaRecepcion) && fechaRecepcion.length >= 3) {
    [y, m, d] = fechaRecepcion;
  } else if (typeof fechaRecepcion === 'string') {
    const trimmed = fechaRecepcion.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (match) {
      y = Number(match[1]);
      m = Number(match[2]);
      d = Number(match[3]);
    } else {
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      y = parsed.getFullYear();
      m = parsed.getMonth() + 1;
      d = parsed.getDate();
    }
  } else {
    return null;
  }

  const inicioLocal = new Date(y, m - 1, d);
  if (Number.isNaN(inicioLocal.getTime())) {
    return null;
  }
  const hoyLocal = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const diffMs = hoyLocal.getTime() - inicioLocal.getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}

export function esOrdenFinalizadaParaPrioridad(
  estado: EstadoOrdenServicio | string | null | undefined
): boolean {
  return estado === 'ENTREGADO' || estado === 'CERRADO' || estado === 'CANCELADO';
}

/**
 * Prioridad operativa por antigüedad (días calendario desde recepción):
 * 0–3: Baja | 4–7: Media | 8–15: Alta | 16+: Muy alta.
 * Las órdenes entregadas, cerradas o canceladas no se presentan como activas de prioridad crítica.
 */
export function calcularPrioridadPorAntiguedad(
  fechaRecepcion: string | number[] | null | undefined,
  estado: EstadoOrdenServicio | string | null | undefined,
  ahora: Date = new Date()
): PrioridadAntiguedadUi | null {
  const dias = calcularDiasCalendarioDesde(fechaRecepcion, ahora);
  if (dias == null) {
    return null;
  }
  const resumenEdad =
    dias === 0 ? 'Recibida hoy' : dias === 1 ? '1 día desde recepción' : `${dias} días desde recepción`;

  if (esOrdenFinalizadaParaPrioridad(estado)) {
    return {
      codigo: 'BAJA',
      label: estado === 'CANCELADO' ? 'Orden cancelada' : 'Ciclo finalizado',
      labelCorto: estado === 'CANCELADO' ? 'Cancelada' : 'Finalizada',
      dias,
      tone: 'neutral',
      activa: false,
      resumenEdad
    };
  }

  if (dias <= 3) {
    return {
      codigo: 'BAJA',
      label: 'Prioridad Baja',
      labelCorto: 'Baja',
      dias,
      tone: 'neutral',
      activa: true,
      resumenEdad
    };
  }
  if (dias <= 7) {
    return {
      codigo: 'MEDIA',
      label: 'Prioridad Media',
      labelCorto: 'Media',
      dias,
      tone: 'warning',
      activa: true,
      resumenEdad
    };
  }
  if (dias <= 15) {
    return {
      codigo: 'ALTA',
      label: 'Prioridad Alta',
      labelCorto: 'Alta',
      dias,
      tone: 'warning',
      activa: true,
      resumenEdad
    };
  }
  return {
    codigo: 'MUY_ALTA',
    label: 'Prioridad Muy alta',
    labelCorto: 'Muy alta',
    dias,
    tone: 'error',
    activa: true,
    resumenEdad
  };
}

/** Estados que siguen en taller (excluye entregadas, cerradas y canceladas). */
export const ESTADOS_ACTIVOS_TALLER: readonly EstadoOrdenServicio[] = [
  'RECEPCIONADO',
  'EN_DIAGNOSTICO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'PENDIENTE_APROBACION',
  'APROBADO',
  'EN_REPARACION',
  'ESPERA_REPUESTO',
  'REQUIERE_APROBACION_ADICIONAL',
  'LISTO'
] as const;

export function esOrdenActivaEnTaller(
  estado: EstadoOrdenServicio | string | null | undefined
): boolean {
  return (
    !!estado &&
    !esOrdenFinalizadaParaPrioridad(estado) &&
    (ESTADOS_ACTIVOS_TALLER as readonly string[]).includes(estado)
  );
}

export interface DistribucionAntiguedadGrupoUi {
  codigo: PrioridadAntiguedadCodigo;
  label: string;
  rango: string;
  cantidad: number;
  porcentaje: number;
}

export interface DistribucionAntiguedadUi {
  totalActivas: number;
  grupos: DistribucionAntiguedadGrupoUi[];
}

const RANGO_ANTIGUEDAD: Record<PrioridadAntiguedadCodigo, string> = {
  BAJA: '0–3 días',
  MEDIA: '4–7 días',
  ALTA: '8–15 días',
  MUY_ALTA: '16 días o más'
};

const LABEL_ANTIGUEDAD: Record<PrioridadAntiguedadCodigo, string> = {
  BAJA: 'Prioridad Baja',
  MEDIA: 'Prioridad Media',
  ALTA: 'Prioridad Alta',
  MUY_ALTA: 'Prioridad Muy Alta'
};

/**
 * Distribuye órdenes activas por prioridad de antigüedad.
 * Reutiliza `calcularPrioridadPorAntiguedad`; no redefine umbrales.
 */
export function calcularDistribucionAntiguedad(
  ordenes: OrdenServicioResponseDTO[],
  ahora: Date = new Date()
): DistribucionAntiguedadUi {
  const contadores: Record<PrioridadAntiguedadCodigo, number> = {
    BAJA: 0,
    MEDIA: 0,
    ALTA: 0,
    MUY_ALTA: 0
  };
  let totalActivas = 0;
  for (const orden of ordenes) {
    if (!esOrdenActivaEnTaller(orden.estado)) {
      continue;
    }
    const prio = calcularPrioridadPorAntiguedad(orden.fechaRecepcion, orden.estado, ahora);
    if (!prio?.activa) {
      continue;
    }
    contadores[prio.codigo] += 1;
    totalActivas += 1;
  }
  const ordenCodigos: PrioridadAntiguedadCodigo[] = ['BAJA', 'MEDIA', 'ALTA', 'MUY_ALTA'];
  return {
    totalActivas,
    grupos: ordenCodigos.map(codigo => ({
      codigo,
      label: LABEL_ANTIGUEDAD[codigo],
      rango: RANGO_ANTIGUEDAD[codigo],
      cantidad: contadores[codigo],
      porcentaje:
        totalActivas === 0 ? 0 : Math.round((contadores[codigo] / totalActivas) * 100)
    }))
  };
}

export interface AtencionOrdenUi {
  id: number;
  numero: string;
  titulo: string;
  motivo: string;
  dias: number;
  prioridad: PrioridadAntiguedadUi;
}

/** Motivo principal de seguimiento según estado real (sin inventar demoras del taller). */
export function motivoAtencionOrden(orden: OrdenServicioResponseDTO): string {
  switch (orden.estado) {
    case 'PENDIENTE_APROBACION':
    case 'REQUIERE_APROBACION_ADICIONAL':
      return 'Aprobación del cliente pendiente';
    case 'ESPERA_REPUESTO':
      return 'Espera de repuesto';
    case 'EN_DIAGNOSTICO':
    case 'RECEPCIONADO':
      return 'Diagnóstico pendiente';
    case 'DIAGNOSTICADO':
    case 'COTIZADO':
      return 'Cotización pendiente de presentar';
    case 'APROBADO':
      return 'Reparación pendiente de iniciar';
    case 'LISTO':
      return 'Listo para entrega al cliente';
    case 'EN_REPARACION': {
      const prio = calcularPrioridadPorAntiguedad(orden.fechaRecepcion, orden.estado);
      if (prio && prio.dias >= 8) {
        return 'Antigüedad elevada en reparación';
      }
      return 'Reparación en curso';
    }
    default:
      return 'Requiere seguimiento operativo';
  }
}

function scoreAtencionOrden(orden: OrdenServicioResponseDTO, ahora: Date): number {
  const prio = calcularPrioridadPorAntiguedad(orden.fechaRecepcion, orden.estado, ahora);
  if (!prio?.activa) {
    return -1;
  }
  const pesoPrio: Record<PrioridadAntiguedadCodigo, number> = {
    MUY_ALTA: 4000,
    ALTA: 3000,
    MEDIA: 2000,
    BAJA: 1000
  };
  const pesoEstado: Partial<Record<EstadoOrdenServicio, number>> = {
    PENDIENTE_APROBACION: 90,
    REQUIERE_APROBACION_ADICIONAL: 85,
    ESPERA_REPUESTO: 80,
    LISTO: 75,
    EN_DIAGNOSTICO: 60,
    RECEPCIONADO: 55,
    COTIZADO: 50,
    DIAGNOSTICADO: 45,
    APROBADO: 40,
    EN_REPARACION: 35
  };
  return pesoPrio[prio.codigo] + (pesoEstado[orden.estado] ?? 0) + prio.dias;
}

/**
 * Hasta `limite` órdenes activas que requieren seguimiento, sin duplicados.
 * Prioriza antigüedad + situación operativa real.
 */
export function construirColaAtencion(
  ordenes: OrdenServicioResponseDTO[],
  limite = 5,
  ahora: Date = new Date()
): AtencionOrdenUi[] {
  const candidatas = ordenes
    .filter(o => esOrdenActivaEnTaller(o.estado))
    .map(orden => {
      const prioridad = calcularPrioridadPorAntiguedad(
        orden.fechaRecepcion,
        orden.estado,
        ahora
      );
      if (!prioridad?.activa) {
        return null;
      }
      const score = scoreAtencionOrden(orden, ahora);
      // Incluye órdenes con score alto o estados que siempre piden acción.
      const urgentePorEstado = [
        'PENDIENTE_APROBACION',
        'REQUIERE_APROBACION_ADICIONAL',
        'ESPERA_REPUESTO',
        'LISTO'
      ].includes(orden.estado);
      const urgentePorEdad = prioridad.codigo === 'ALTA' || prioridad.codigo === 'MUY_ALTA';
      if (!urgentePorEstado && !urgentePorEdad && prioridad.codigo === 'BAJA') {
        return null;
      }
      return {
        orden,
        prioridad,
        score
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.score - a.score);

  const vistos = new Set<number>();
  const resultado: AtencionOrdenUi[] = [];
  for (const item of candidatas) {
    if (vistos.has(item.orden.id)) {
      continue;
    }
    vistos.add(item.orden.id);
    resultado.push({
      id: item.orden.id,
      numero: item.orden.numero,
      titulo: equipoResumen(item.orden) || item.orden.clienteNombre,
      motivo: motivoAtencionOrden(item.orden),
      dias: item.prioridad.dias,
      prioridad: item.prioridad
    });
    if (resultado.length >= limite) {
      break;
    }
  }
  return resultado;
}

/** Texto de falla / diagnóstico para listados (sin inventar contenido). */
export function fallaResumen(orden: OrdenServicioResponseDTO): string {
  const diag = (orden.diagnostico ?? '').trim();
  if (diag) {
    return diag;
  }
  const problema = (orden.problemaReportado ?? '').trim();
  if (problema) {
    return problema;
  }
  return 'Sin diagnóstico registrado';
}

export interface EtapaTrazabilidadUi {
  codigo: 'RECEPCION' | 'DIAGNOSTICO' | 'COTIZACION' | 'REPARACION' | 'ENTREGA';
  numero: number;
  titulo: string;
  estadoVisual: 'completada' | 'actual' | 'pendiente' | 'bloqueada' | 'cancelada';
  badgeTexto: string;
  detalleTexto: string;
  fechaTexto: string | null;
  icono: string;
}

/**
 * Construye las 5 etapas de Trazabilidad Operativa basadas en el estado real,
 * fechas de la orden e historial de transiciones (no solo por posición).
 */
export function construirTrazabilidadOperativa(
  orden: OrdenServicioResponseDTO | null | undefined,
  historial: {
    estadoAnterior?: EstadoOrdenServicio | string | null;
    estadoNuevo: EstadoOrdenServicio | string;
    fechaCambio?: string | number[] | null;
  }[] = []
): EtapaTrazabilidadUi[] {
  if (!orden) {
    return [];
  }
  const estado = orden.estado;

  const fechaDeEstados = (... buscados: EstadoOrdenServicio[]): string | null => {
    for (const item of historial) {
      if (buscados.includes(item.estadoNuevo as EstadoOrdenServicio) && item.fechaCambio) {
        return formatFechaOrden(item.fechaCambio);
      }
    }
    return null;
  };

  const recepcionCompletada = estado !== 'RECEPCIONADO' && estado !== 'CANCELADO';
  const tieneDiagnosticoEvento =
    !!(orden.diagnostico ?? '').trim() ||
    historial.some(h =>
      [
        'DIAGNOSTICADO',
        'COTIZADO',
        'PENDIENTE_APROBACION',
        'APROBADO',
        'EN_REPARACION',
        'ESPERA_REPUESTO',
        'REQUIERE_APROBACION_ADICIONAL',
        'LISTO',
        'ENTREGADO',
        'CERRADO'
      ].includes(h.estadoNuevo as EstadoOrdenServicio)
    );
  const tieneAprobacionEvento =
    [
      'APROBADO',
      'EN_REPARACION',
      'ESPERA_REPUESTO',
      'LISTO',
      'ENTREGADO',
      'CERRADO'
    ].includes(estado) ||
    historial.some(h => h.estadoNuevo === 'APROBADO');
  const tieneReparacionCompletada =
    ['LISTO', 'ENTREGADO', 'CERRADO'].includes(estado) ||
    historial.some(h => h.estadoNuevo === 'LISTO');
  const tieneEntregaCompletada =
    ['ENTREGADO', 'CERRADO'].includes(estado) ||
    historial.some(h => h.estadoNuevo === 'ENTREGADO' || h.estadoNuevo === 'CERRADO');

  const fechaRecepcionTxt = orden.fechaRecepcion ? formatFechaOrden(orden.fechaRecepcion) : null;
  const fechaDiagnosticoTxt =
    fechaDeEstados('DIAGNOSTICADO', 'EN_DIAGNOSTICO') ??
    (tieneDiagnosticoEvento && orden.fechaActualizacion
      ? formatFechaOrden(orden.fechaActualizacion)
      : null);
  const fechaCotizacionTxt = fechaDeEstados('APROBADO', 'PENDIENTE_APROBACION', 'COTIZADO');
  const fechaReparacionTxt = fechaDeEstados('LISTO', 'EN_REPARACION', 'ESPERA_REPUESTO');
  const fechaEntregaTxt =
    (orden.fechaCierre ? formatFechaOrden(orden.fechaCierre) : null) ??
    fechaDeEstados('ENTREGADO', 'CERRADO');

  // Etapa 1: Recepción
  const etapa1: EtapaTrazabilidadUi = {
    codigo: 'RECEPCION',
    numero: 1,
    titulo: 'Recepción',
    estadoVisual:
      estado === 'CANCELADO' && !tieneDiagnosticoEvento
        ? 'cancelada'
        : estado === 'RECEPCIONADO'
          ? 'actual'
          : 'completada',
    badgeTexto:
      estado === 'CANCELADO' && !tieneDiagnosticoEvento
        ? 'CANCELADA'
        : estado === 'RECEPCIONADO'
          ? 'ACTUAL · RECIBIDO'
          : 'COMPLETADA',
    detalleTexto:
      estado === 'RECEPCIONADO'
        ? 'Equipo recibido en taller'
        : fechaRecepcionTxt ?? 'Ingreso registrado',
    fechaTexto: fechaRecepcionTxt,
    icono: estado === 'RECEPCIONADO' ? 'inventory_2' : 'check'
  };

  // Etapa 2: Diagnóstico
  let estado2: EtapaTrazabilidadUi['estadoVisual'] = 'pendiente';
  let badge2 = 'PENDIENTE';
  let detalle2 = 'Revisión técnica inicial';
  let icono2 = '2';
  if (estado === 'EN_DIAGNOSTICO' || estado === 'DIAGNOSTICADO') {
    estado2 = 'actual';
    badge2 = estado === 'DIAGNOSTICADO' ? 'ACTUAL · LISTO' : 'ACTUAL · EN CURSO';
    detalle2 =
      estado === 'DIAGNOSTICADO' ? 'Diagnóstico completado' : 'Evaluando falla reportada';
    icono2 = 'search';
  } else if (tieneDiagnosticoEvento && estado !== 'RECEPCIONADO') {
    estado2 = 'completada';
    badge2 = 'COMPLETADA';
    detalle2 = fechaDiagnosticoTxt ?? 'Diagnóstico registrado';
    icono2 = 'check';
  } else if (estado === 'CANCELADO') {
    estado2 = 'cancelada';
    badge2 = 'CANCELADA';
    detalle2 = 'Flujo detenido';
    icono2 = 'close';
  }

  const etapa2: EtapaTrazabilidadUi = {
    codigo: 'DIAGNOSTICO',
    numero: 2,
    titulo: 'Diagnóstico',
    estadoVisual: estado2,
    badgeTexto: badge2,
    detalleTexto: detalle2,
    fechaTexto: fechaDiagnosticoTxt,
    icono: icono2
  };

  // Etapa 3: Cotización y aprobación
  let estado3: EtapaTrazabilidadUi['estadoVisual'] = 'pendiente';
  let badge3 = 'PENDIENTE';
  let detalle3 = 'Propuesta y autorización';
  let icono3 = '3';
  if (
    estado === 'COTIZADO' ||
    estado === 'PENDIENTE_APROBACION' ||
    estado === 'REQUIERE_APROBACION_ADICIONAL'
  ) {
    estado3 = 'actual';
    badge3 =
      estado === 'PENDIENTE_APROBACION'
        ? 'ACTUAL · ESPERA'
        : estado === 'REQUIERE_APROBACION_ADICIONAL'
          ? 'ACTUAL · AMPLIACIÓN'
          : 'ACTUAL · COTIZADO';
    detalle3 =
      estado === 'PENDIENTE_APROBACION'
        ? 'Esperando decisión del cliente'
        : estado === 'REQUIERE_APROBACION_ADICIONAL'
          ? 'Requiere cotización adicional'
          : 'Lista para presentar al cliente';
    icono3 = 'hourglass_top';
  } else if (tieneAprobacionEvento) {
    estado3 = 'completada';
    badge3 = 'COMPLETADA';
    detalle3 = fechaCotizacionTxt ?? 'Cotización aprobada';
    icono3 = 'check';
  } else if (estado === 'RECEPCIONADO' || estado === 'EN_DIAGNOSTICO') {
    estado3 = 'bloqueada';
    badge3 = 'BLOQUEADA';
    detalle3 = 'Requiere diagnóstico previo';
    icono3 = '3';
  }

  const etapa3: EtapaTrazabilidadUi = {
    codigo: 'COTIZACION',
    numero: 3,
    titulo: 'Cotización y aprobación',
    estadoVisual: estado3,
    badgeTexto: badge3,
    detalleTexto: detalle3,
    fechaTexto: fechaCotizacionTxt,
    icono: icono3
  };

  // Etapa 4: Reparación
  let estado4: EtapaTrazabilidadUi['estadoVisual'] = 'pendiente';
  let badge4 = 'PENDIENTE';
  let detalle4 = 'Intervención en taller';
  let icono4 = '4';
  if (tieneReparacionCompletada) {
    estado4 = 'completada';
    badge4 = 'COMPLETADA';
    detalle4 = fechaReparacionTxt ?? 'Trabajo técnico finalizado';
    icono4 = 'check';
  } else if (estado === 'APROBADO' || estado === 'EN_REPARACION') {
    estado4 = 'actual';
    badge4 = estado === 'APROBADO' ? 'ACTUAL · AUTORIZADA' : 'ACTUAL · EN TALLER';
    detalle4 =
      estado === 'APROBADO' ? 'Lista para iniciar banco' : 'Reparación en curso';
    icono4 = 'build';
  } else if (estado === 'ESPERA_REPUESTO') {
    estado4 = 'bloqueada';
    badge4 = 'EN ESPERA';
    detalle4 = 'Pausada por repuesto pendiente';
    icono4 = 'hourglass_empty';
  } else if (estado === 'REQUIERE_APROBACION_ADICIONAL') {
    estado4 = 'bloqueada';
    badge4 = 'BLOQUEADA';
    detalle4 = 'Requiere aprobación adicional';
    icono4 = 'lock';
  } else if (
    estado === 'RECEPCIONADO' ||
    estado === 'EN_DIAGNOSTICO' ||
    estado === 'DIAGNOSTICADO' ||
    estado === 'COTIZADO' ||
    estado === 'PENDIENTE_APROBACION'
  ) {
    estado4 = 'bloqueada';
    badge4 = 'BLOQUEADA';
    detalle4 = 'Requiere aprobación del cliente';
    icono4 = '4';
  }

  const etapa4: EtapaTrazabilidadUi = {
    codigo: 'REPARACION',
    numero: 4,
    titulo: 'Reparación',
    estadoVisual: estado4,
    badgeTexto: badge4,
    detalleTexto: detalle4,
    fechaTexto: fechaReparacionTxt,
    icono: icono4
  };

  // Etapa 5: Entrega
  let estado5: EtapaTrazabilidadUi['estadoVisual'] = 'pendiente';
  let badge5 = 'PENDIENTE';
  let detalle5 = 'Cierre técnico final';
  let icono5 = '5';
  if (tieneEntregaCompletada) {
    estado5 = 'completada';
    badge5 = estado === 'CERRADO' ? 'CERRADA' : 'ENTREGADA';
    detalle5 = fechaEntregaTxt ?? 'Equipo entregado al cliente';
    icono5 = 'check';
  } else if (estado === 'LISTO') {
    estado5 = 'actual';
    badge5 = 'ACTUAL · LISTO';
    detalle5 = 'Disponible para entrega';
    icono5 = 'check_circle';
  }

  const etapa5: EtapaTrazabilidadUi = {
    codigo: 'ENTREGA',
    numero: 5,
    titulo: 'Entrega',
    estadoVisual: estado5,
    badgeTexto: badge5,
    detalleTexto: detalle5,
    fechaTexto: fechaEntregaTxt,
    icono: icono5
  };

  return [etapa1, etapa2, etapa3, etapa4, etapa5];
}

