/**
 * Contratos de proveedor. Nombres alineados a los DTO de Java (FASE 3.15.10-B).
 */

export type TipoDocumento = 'CC' | 'NIT' | 'CE' | 'PASAPORTE' | 'NINGUNO';

export type CondicionPagoProveedor = 'CONTADO' | 'CREDITO';

export type TipoContactoProveedor =
  | 'COMERCIAL'
  | 'FACTURACION'
  | 'LOGISTICA'
  | 'SOPORTE'
  | 'OTRO';

export interface ContactoProveedorResponseDTO {
  id: number;
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  tipoContacto: TipoContactoProveedor;
  principal: boolean;
  activo: boolean;
  fechaRegistro: string | number[] | null;
  fechaActualizacion: string | number[] | null;
}

export interface ContactoProveedorRequestDTO {
  id?: number | null;
  nombre: string;
  cargo?: string | null;
  telefono?: string | null;
  celular?: string | null;
  email?: string | null;
  tipoContacto?: TipoContactoProveedor | null;
  principal?: boolean | null;
  activo?: boolean | null;
}

export interface ProveedorResponseDTO {
  id: number;
  /** Alias compat: razón social. */
  nombre: string;
  razonSocial: string;
  tipoDocumento: TipoDocumento | null;
  /** Alias compat: número documento. */
  documento: string | null;
  numeroDocumento: string | null;
  nombreComercial: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  telefono: string | null;
  telefonoAlternativo: string | null;
  email: string | null;
  web: string | null;
  condicionPago: CondicionPagoProveedor | null;
  diasCredito: number | null;
  contacto: string | null;
  notas: string | null;
  activo: boolean;
  fechaRegistro: string | number[] | null;
  fechaActualizacion: string | number[] | null;
  contactos: ContactoProveedorResponseDTO[];
}

export interface ProveedorRequestDTO {
  razonSocial: string;
  nombre?: string | null;
  tipoDocumento?: TipoDocumento | null;
  numeroDocumento: string;
  documento?: string | null;
  nombreComercial?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  telefonoAlternativo?: string | null;
  email?: string | null;
  web?: string | null;
  condicionPago?: CondicionPagoProveedor | null;
  diasCredito?: number | null;
  notas?: string | null;
  activo?: boolean | null;
  contactos?: ContactoProveedorRequestDTO[] | null;
}
