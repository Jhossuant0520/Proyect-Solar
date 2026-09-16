/**
 * Contratos de orden de servicio. Nombres iguales a los DTO de Java.
 * El número visible es `numero` (OS-yyyy-######), no numeroOrden.
 */

import { TipoEquipo } from './equipo.models';

export type EstadoOrdenServicio =
  | 'RECEPCIONADO'
  | 'EN_DIAGNOSTICO'
  | 'COTIZADO'
  | 'APROBADO'
  | 'EN_REPARACION'
  | 'ESPERA_REPUESTO'
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

/** Body de POST /api/v1/ordenes-servicio/{id}/estado. */
export interface CambiarEstadoOrdenServicioRequestDTO {
  estado: EstadoOrdenServicio;
}

export interface OrdenServicioFiltros {
  clienteId?: number | null;
  equipoId?: number | null;
  estado?: EstadoOrdenServicio | '';
}
