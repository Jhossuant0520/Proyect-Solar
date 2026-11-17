/**
 * Contratos de cliente. Nombres iguales a los DTO de Java.
 */

export type TipoCliente = 'PERSONA' | 'EMPRESA' | 'CONSUMIDOR_FINAL';

export type TipoDocumento = 'CC' | 'NIT' | 'CE' | 'PASAPORTE' | 'NINGUNO';

export interface ClienteResponseDTO {
  id: number;
  nombre: string;
  tipoCliente: TipoCliente;
  consumidorFinal: boolean;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  fechaRegistro: string | number[] | null;
}

/** Body de POST/PUT /api/v1/clientes. Nombres iguales al DTO Java. */
export interface ClienteRequestDTO {
  nombre: string;
  tipoCliente?: TipoCliente | null;
  tipoDocumento?: TipoDocumento | null;
  numeroDocumento?: string | null;
  email?: string | null;
  telefono?: string | null;
  notas?: string | null;
  activo?: boolean | null;
}
