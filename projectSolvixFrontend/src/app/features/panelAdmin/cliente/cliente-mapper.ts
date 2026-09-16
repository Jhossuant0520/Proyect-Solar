import { asIsoDateTime } from '../producto/producto-ui';
import {
  ClienteRequestDTO,
  ClienteResponseDTO,
  TipoCliente,
  TipoDocumento
} from '../../../core/models/cliente.models';

export interface ClienteFormValores {
  nombre: string;
  tipoCliente: Exclude<TipoCliente, 'CONSUMIDOR_FINAL'> | '';
  tipoDocumento: TipoDocumento | '' | null;
  numeroDocumento: string;
  email: string;
  telefono: string;
  notas: string;
  activo: boolean;
}

function vacioANull(valor: string | null | undefined): string | null {
  const texto = valor?.trim() ?? '';
  return texto ? texto : null;
}

/** Formulario → request. No infiere consumidor final ni calcula métricas. */
export function aClienteRequest(valores: ClienteFormValores): ClienteRequestDTO {
  const tipoDocumento = valores.tipoDocumento ? valores.tipoDocumento : null;
  const sinNumero = tipoDocumento == null || tipoDocumento === 'NINGUNO';
  return {
    nombre: valores.nombre.trim(),
    tipoCliente: valores.tipoCliente === 'EMPRESA' ? 'EMPRESA' : 'PERSONA',
    tipoDocumento,
    numeroDocumento: sinNumero ? null : vacioANull(valores.numeroDocumento),
    email: vacioANull(valores.email),
    telefono: vacioANull(valores.telefono),
    notas: vacioANull(valores.notas),
    activo: valores.activo
  };
}

/** Arma el body completo que exige PUT para cambiar solo el estado. */
export function aRequestConEstado(cliente: ClienteResponseDTO, activo: boolean): ClienteRequestDTO {
  return {
    nombre: cliente.nombre,
    tipoCliente: cliente.tipoCliente,
    tipoDocumento: cliente.tipoDocumento,
    numeroDocumento: cliente.numeroDocumento,
    email: cliente.email,
    telefono: cliente.telefono,
    notas: cliente.notas,
    activo
  };
}

export function valoresDesdeCliente(cliente: ClienteResponseDTO): ClienteFormValores {
  const tipoCliente = cliente.tipoCliente === 'EMPRESA' ? 'EMPRESA' : 'PERSONA';
  return {
    nombre: cliente.nombre,
    tipoCliente,
    tipoDocumento: cliente.tipoDocumento,
    numeroDocumento: cliente.numeroDocumento ?? '',
    email: cliente.email ?? '',
    telefono: cliente.telefono ?? '',
    notas: cliente.notas ?? '',
    activo: cliente.activo
  };
}

export function ordenarPorFechaDesc<T extends { fecha: string | number[] | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => asIsoDateTime(b.fecha).localeCompare(asIsoDateTime(a.fecha)));
}

export function rutaVenta(id: number | null | undefined): string[] | null {
  if (id == null) {
    return null;
  }
  return ['/ventas', String(id)];
}

export function rutaDevolucion(
  ventaId: number | null | undefined,
  devolucionId: number | null | undefined
): string[] | null {
  if (ventaId == null || devolucionId == null) {
    return null;
  }
  return ['/ventas', String(ventaId), 'devoluciones', String(devolucionId)];
}
