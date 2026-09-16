/**
 * Contratos de equipo (taller). Nombres iguales a los DTO de Java.
 */

export type TipoEquipo =
  | 'COMPUTADOR'
  | 'PORTATIL'
  | 'IMPRESORA'
  | 'MONITOR'
  | 'SERVIDOR'
  | 'CELULAR'
  | 'OTRO';

export interface EquipoResponseDTO {
  id: number;
  clienteId: number;
  clienteNombre: string;
  tipoEquipo: TipoEquipo;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  nombre: string | null;
  observaciones: string | null;
  activo: boolean;
  fechaRegistro: string | number[] | null;
}

/** Body de POST/PUT /api/v1/equipos. */
export interface EquipoRequestDTO {
  clienteId: number;
  tipoEquipo: TipoEquipo;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  nombre?: string | null;
  observaciones?: string | null;
  activo?: boolean | null;
}

export interface EquipoFiltros {
  clienteId?: number | null;
  soloActivos?: boolean;
}
