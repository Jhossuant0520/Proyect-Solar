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
