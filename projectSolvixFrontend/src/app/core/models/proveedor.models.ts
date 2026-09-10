/**
 * Contratos de proveedor. Nombres iguales a los DTO de Java.
 */

export interface ProveedorResponseDTO {
  id: number;
  nombre: string;
  documento: string | null;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  fechaRegistro: string | number[] | null;
}
