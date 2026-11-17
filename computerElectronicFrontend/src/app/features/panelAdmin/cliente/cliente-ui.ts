import { HttpErrorResponse } from '@angular/common/http';
import { ClienteResponseDTO, TipoCliente, TipoDocumento } from '../../../core/models/cliente.models';

export const MENSAJE_DOCUMENTO_DUPLICADO = 'Ya existe un cliente con esos datos de documento.';

export const MENSAJE_CONSUMIDOR_RESERVADO =
  'El consumidor final es un registro reservado del sistema.';

export const NOTA_HISTORIAL =
  'No son KPIs calculados. Son las operaciones relacionadas con este cliente.';

export const TIPOS_CLIENTE_ALTA: { id: Exclude<TipoCliente, 'CONSUMIDOR_FINAL'>; label: string }[] = [
  { id: 'PERSONA', label: 'Persona' },
  { id: 'EMPRESA', label: 'Empresa' }
];

export const TIPOS_DOCUMENTO: { id: TipoDocumento; label: string }[] = [
  { id: 'CC', label: 'Cédula' },
  { id: 'NIT', label: 'NIT' },
  { id: 'CE', label: 'Cédula de extranjería' },
  { id: 'PASAPORTE', label: 'Pasaporte' },
  { id: 'NINGUNO', label: 'Ninguno' }
];

/** Semántico. Nunca por id fijo. */
export function esConsumidorFinal(cliente: {
  tipoCliente?: string | null;
  consumidorFinal?: boolean | null;
}): boolean {
  return cliente.consumidorFinal === true || cliente.tipoCliente === 'CONSUMIDOR_FINAL';
}

export function puedeEditarCliente(cliente: { tipoCliente?: string | null; consumidorFinal?: boolean | null }): boolean {
  return !esConsumidorFinal(cliente);
}

export function puedeDesactivarCliente(cliente: {
  tipoCliente?: string | null;
  consumidorFinal?: boolean | null;
  activo?: boolean;
}): boolean {
  return !esConsumidorFinal(cliente) && cliente.activo !== false;
}

export function labelTipoCliente(tipo: string | null | undefined): string {
  switch (tipo) {
    case 'PERSONA':
      return 'Persona';
    case 'EMPRESA':
      return 'Empresa';
    case 'CONSUMIDOR_FINAL':
      return 'Consumidor final';
    default:
      return tipo || '—';
  }
}

export function labelTipoDocumento(tipo: string | null | undefined): string {
  if (!tipo) {
    return 'No registrado';
  }
  return TIPOS_DOCUMENTO.find(item => item.id === tipo)?.label ?? tipo;
}

export function documentoVisible(cliente: {
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
}): string {
  const numero = cliente.numeroDocumento?.trim();
  const tipo = cliente.tipoDocumento;
  if (!tipo && !numero) {
    return 'No registrado';
  }
  if (tipo === 'NINGUNO' && !numero) {
    return 'Ninguno';
  }
  return [labelTipoDocumento(tipo), numero].filter(Boolean).join(' ');
}

export function clienteCoincideBusqueda(cliente: ClienteResponseDTO, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (cliente.nombre ?? '').toLowerCase().includes(q)
    || (cliente.numeroDocumento ?? '').toLowerCase().includes(q)
    || (cliente.email ?? '').toLowerCase().includes(q)
    || (cliente.telefono ?? '').toLowerCase().includes(q);
}

export function filtrarClientes(
  clientes: ClienteResponseDTO[],
  filtros: { query: string; activo: '' | 'true' | 'false'; tipo: '' | TipoCliente }
): ClienteResponseDTO[] {
  return ordenarClientesPorNombre(clientes).filter(cliente => {
    if (filtros.activo === 'true' && cliente.activo !== true) {
      return false;
    }
    if (filtros.activo === 'false' && cliente.activo !== false) {
      return false;
    }
    if (filtros.tipo && cliente.tipoCliente !== filtros.tipo) {
      return false;
    }
    return clienteCoincideBusqueda(cliente, filtros.query);
  });
}

/** El listado completo no viene ordenado. Solo se ordena lo ya cargado. */
export function ordenarClientesPorNombre(clientes: ClienteResponseDTO[]): ClienteResponseDTO[] {
  return [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

/** El select de venta no debe repetir al registro semántico. */
export function clientesParaVenta(clientes: ClienteResponseDTO[]): ClienteResponseDTO[] {
  return clientes.filter(cliente => !esConsumidorFinal(cliente));
}

export function mensajeErrorCliente(error: unknown, fallback: string): string {
  const raw = extraerMensaje(error);
  if (raw && esConflictoDocumento(raw)) {
    return MENSAJE_DOCUMENTO_DUPLICADO;
  }
  if (raw && /consumidor final/i.test(raw)) {
    return MENSAJE_CONSUMIDOR_RESERVADO;
  }
  return raw ?? fallback;
}

function esConflictoDocumento(mensaje: string): boolean {
  return /ya existe un cliente con ese documento/i.test(mensaje)
    || /uk_clientes_documento/i.test(mensaje)
    || /duplicate entry/i.test(mensaje);
}

function extraerMensaje(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.error == null) {
    return null;
  }
  const body = error.error;
  if (typeof body === 'string' && body.trim() && !esSql(body)) {
    return body;
  }
  if (typeof body === 'string' && esSql(body)) {
    return MENSAJE_DOCUMENTO_DUPLICADO;
  }
  if (typeof body === 'object' && body && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return esSql(message) ? MENSAJE_DOCUMENTO_DUPLICADO : message;
    }
  }
  return null;
}

function esSql(texto: string): boolean {
  return /sql|constraint|uk_clientes_documento/i.test(texto);
}
