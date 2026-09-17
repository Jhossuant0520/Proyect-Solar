import { HttpErrorResponse } from '@angular/common/http';
import { SolvixBadgeTone } from '../../../shared/components/solvix-badge/solvix-badge';
import { EquipoResponseDTO, TipoEquipo } from '../../../core/models/equipo.models';
import {
  EstadoOrdenServicio,
  EstadoRepuestoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../core/models/orden-servicio.models';
import { formatFechaVenta, mapHttpError as mapVentaHttpError, ApiUiError } from '../venta/venta-ui';

/** Espejo de transiciones FE 3.15.5.2. La autoridad sigue siendo el backend. */
const TRANSICIONES: Record<EstadoOrdenServicio, EstadoOrdenServicio[]> = {
  RECEPCIONADO: ['EN_DIAGNOSTICO', 'CANCELADO'],
  EN_DIAGNOSTICO: ['DIAGNOSTICADO', 'CANCELADO'],
  DIAGNOSTICADO: ['COTIZADO', 'CANCELADO'],
  COTIZADO: ['APROBADO', 'CANCELADO'],
  APROBADO: ['EN_REPARACION', 'CANCELADO'],
  EN_REPARACION: ['ESPERA_REPUESTO', 'REQUIERE_APROBACION_ADICIONAL', 'LISTO'],
  ESPERA_REPUESTO: ['EN_REPARACION'],
  // Salida preparada para 3.15.7; el FE no expone reanudación todavía.
  REQUIERE_APROBACION_ADICIONAL: [],
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
  | 'completarReparacion';

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
    descripcion: 'Se prepara la cotización inicial a partir del diagnóstico.',
    boton: 'Preparar cotización',
    requiereDiagnostico: false,
    requiereTrabajo: false
  },
  APROBADO: {
    titulo: 'Registrar aprobación',
    descripcion: 'Se registra la aprobación del cliente para continuar.',
    boton: 'Registrar aprobación',
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
    titulo: 'Registrar entrega',
    descripcion: 'Se registra la entrega del equipo al cliente.',
    boton: 'Registrar entrega',
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

/** Cómo debe tratarse la UI al avanzar hacia un destino (3.15.5.2). */
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
    case 'APROBADO':
    case 'ENTREGADO':
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
  if (estado === 'REQUIERE_APROBACION_ADICIONAL') {
    return null;
  }
  const destinos = transicionesDesde(estado).filter(
    d => d !== 'CANCELADO' && d !== 'REQUIERE_APROBACION_ADICIONAL' && d !== 'ESPERA_REPUESTO'
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
      return 'Preparar cotización inicial';
    case 'COTIZADO':
      return 'Esperando aprobación del cliente';
    case 'APROBADO':
      return 'Reparación autorizada';
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
      return 'Se requiere una aprobación adicional antes de continuar.';
    case 'LISTO':
      return 'Registrar entrega';
    case 'ENTREGADO':
      return 'Cerrar orden';
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

/** Estados OT donde se puede planificar / editar / anular líneas. */
export function puedePlanificarRepuestos(estado: EstadoOrdenServicio | string): boolean {
  return (
    estado === 'RECEPCIONADO' ||
    estado === 'EN_DIAGNOSTICO' ||
    estado === 'DIAGNOSTICADO' ||
    estado === 'COTIZADO' ||
    estado === 'APROBADO' ||
    estado === 'EN_REPARACION' ||
    estado === 'ESPERA_REPUESTO'
  );
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
