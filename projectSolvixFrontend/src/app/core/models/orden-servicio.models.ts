/**
 * Contratos de orden de servicio. Nombres iguales a los DTO de Java.
 * El número visible es `numero` (OS-yyyy-######), no numeroOrden.
 */

import { TipoEquipo } from './equipo.models';

export type EstadoOrdenServicio =
  | 'RECEPCIONADO'
  | 'EN_DIAGNOSTICO'
  | 'DIAGNOSTICADO'
  | 'COTIZADO'
  | 'APROBADO'
  | 'EN_REPARACION'
  | 'ESPERA_REPUESTO'
  | 'REQUIERE_APROBACION_ADICIONAL'
  | 'LISTO'
  | 'ENTREGADO'
  | 'CERRADO'
  | 'CANCELADO';

export interface OrdenServicioResponseDTO {
  id: number;
  numero: string;
  clienteId: number;
  clienteNombre: string;
  equipoId: number;
  equipoTipo: TipoEquipo;
  equipoMarca: string | null;
  equipoModelo: string | null;
  equipoNombre: string | null;
  estado: EstadoOrdenServicio;
  problemaReportado: string | null;
  diagnostico: string | null;
  trabajoRealizado: string | null;
  observaciones: string | null;
  fechaRecepcion: string | number[] | null;
  fechaActualizacion: string | number[] | null;
  fechaCierre: string | number[] | null;
  createdBy: string | null;
}

/** Body de POST/PUT /api/v1/ordenes-servicio. */
export interface OrdenServicioRequestDTO {
  clienteId: number;
  equipoId: number;
  problemaReportado?: string | null;
  diagnostico?: string | null;
  trabajoRealizado?: string | null;
  observaciones?: string | null;
}

/**
 * Body de POST /api/v1/ordenes-servicio/{id}/estado.
 * Envía `nuevoEstado` (contrato 3.15.5.2).
 * `motivo` obligatorio solo para CANCELADO; en transiciones normales puede omitirse.
 */
export interface CambiarEstadoOrdenServicioRequestDTO {
  nuevoEstado: EstadoOrdenServicio;
  motivo?: string | null;
  observacion?: string | null;
}

/** Body de POST /api/v1/ordenes-servicio/{id}/diagnostico/completar. */
export interface CompletarDiagnosticoRequestDTO {
  problemaReportado?: string | null;
  diagnostico: string;
  observaciones?: string | null;
}

/** Body de POST /api/v1/ordenes-servicio/{id}/reparacion/completar. */
export interface CompletarReparacionRequestDTO {
  trabajoRealizado: string;
  observaciones?: string | null;
}

/** Body de POST /api/v1/ordenes-servicio/{id}/nueva-falla. */
export interface RegistrarNuevaFallaRequestDTO {
  nuevaFalla: string;
  observacion?: string | null;
}

export interface HistorialEstadoOrdenServicioResponseDTO {
  id: number;
  ordenServicioId: number;
  estadoAnterior: EstadoOrdenServicio;
  estadoNuevo: EstadoOrdenServicio;
  motivo: string;
  observacion: string | null;
  usuario: string;
  fechaCambio: string | number[] | null;
}

export interface TransicionOrdenServicioResponseDTO {
  orden: OrdenServicioResponseDTO;
  estadoAnterior: EstadoOrdenServicio;
  estadoNuevo: EstadoOrdenServicio;
  motivo: string;
  observacion: string | null;
  usuario: string;
  fechaCambio: string | number[] | null;
  mensaje: string;
}

export interface OrdenServicioFiltros {
  clienteId?: number | null;
  equipoId?: number | null;
  estado?: EstadoOrdenServicio | '';
}

/** Estado derivado de una línea de repuesto (no se persiste en backend). */
export type EstadoRepuestoOrdenServicio =
  | 'PLANIFICADO'
  | 'PARCIAL'
  | 'CONSUMIDO'
  | 'DEVUELTO'
  | 'ANULADO';

/** Respuesta de GET/POST/PUT/DELETE /repuestos. */
export interface RepuestoOrdenServicioResponseDTO {
  id: number;
  ordenServicioId: number;
  productoId: number;
  productoNombre: string;
  codigoBarras: string | null;
  cantidadPlanificada: number;
  cantidadConsumida: number;
  cantidadDevuelta: number;
  cantidadNetaConsumida: number;
  /** Planificada − neta; nunca negativa. */
  cantidadPendiente: number;
  /** Snapshot al primer consumo; null = desconocido. Nunca inventar 0. */
  costoHistorico: number | null;
  costoConocido: boolean;
  productoActivo: boolean;
  estado: EstadoRepuestoOrdenServicio;
  anulado: boolean;
  fechaRegistro?: string | number[] | null;
  fechaUltimoConsumo?: string | number[] | null;
  fechaUltimaDevolucion?: string | number[] | null;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  puedeConsumir: boolean;
  puedeDevolver: boolean;
}

/** Body de POST/PUT /repuestos (planificar / actualizar qty). */
export interface RepuestoOrdenServicioRequestDTO {
  /** Obligatorio al planificar. En PUT no debe cambiar el producto. */
  productoId?: number | null;
  cantidadPlanificada: number;
}

/** Body de POST /repuestos/{id}/consumir. */
export interface ConsumirRepuestoRequestDTO {
  cantidad: number;
}

/** Body de POST /repuestos/{id}/devolver. */
export interface DevolverRepuestoRequestDTO {
  cantidad: number;
}
