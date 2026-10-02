import { EstadoOrdenServicio } from '../../../core/models/orden-servicio.models';

export type PlantillaWhatsAppAsistido = 'recepcion' | 'cotizacion' | 'equipoListo';

export const MSG_TELEFONO_INVALIDO_WHATSAPP =
  'Registra un teléfono válido en la ficha del cliente.';

/**
 * Normaliza teléfono para wa.me (espejo conceptual de ClienteIdentidadNormalizer).
 * No muta datos persistidos. Retorna null si no es usable.
 */
export function normalizarTelefonoWa(bruto: string | null | undefined): string | null {
  if (bruto == null) {
    return null;
  }
  const trimmed = bruto.trim();
  if (!trimmed) {
    return null;
  }
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  if (digits.startsWith('00') && digits.length > 2) {
    digits = digits.substring(2);
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('57')) {
    return digits;
  }
  // Otros formatos CO raros: si termina en 10 dígitos locales 3…, anteponer 57
  if (digits.length > 10 && digits.endsWith(digits.slice(-10)) && digits.slice(-10).startsWith('3')) {
    const local = digits.slice(-10);
    if (local.startsWith('3')) {
      return `57${local}`;
    }
  }
  return null;
}

export function urlConsultaOtPublica(publicWebBaseUrl: string, tokenConsulta: string): string {
  const base = (publicWebBaseUrl ?? '').trim().replace(/\/+$/, '');
  const token = (tokenConsulta ?? '').trim();
  return `${base}/consulta/ot/${token}`;
}

function nombreSaludo(nombre: string | null | undefined): string {
  const n = (nombre ?? '').trim();
  return n || 'cliente';
}

export function mensajeRecepcion(params: {
  nombre: string | null | undefined;
  ordenNumero: string;
  urlConsulta: string;
}): string {
  return [
    `Hola ${nombreSaludo(params.nombre)} 👋`,
    '',
    'Recibimos tu equipo en Computer & Electronic Center.',
    '',
    `Orden de servicio: ${params.ordenNumero}`,
    '',
    'Puedes consultar el estado de tu equipo aquí:',
    '',
    params.urlConsulta
  ].join('\n');
}

export function mensajeCotizacion(params: {
  nombre: string | null | undefined;
  ordenNumero: string;
  cotizacionNumero: string;
  urlConsulta: string;
}): string {
  return [
    `Hola ${nombreSaludo(params.nombre)} 👋`,
    '',
    'Tu cotización ya está disponible.',
    '',
    `Cotización: ${params.cotizacionNumero}`,
    `Orden de servicio: ${params.ordenNumero}`,
    '',
    'Puedes revisarla y aprobarla o rechazarla desde este enlace:',
    '',
    params.urlConsulta
  ].join('\n');
}

export function mensajeEquipoListo(params: {
  nombre: string | null | undefined;
  ordenNumero: string;
  urlConsulta: string;
}): string {
  return [
    `Hola ${nombreSaludo(params.nombre)} 👋`,
    '',
    'Tu equipo ya está listo para entrega.',
    '',
    `Orden de servicio: ${params.ordenNumero}`,
    '',
    'Consulta los detalles aquí:',
    '',
    params.urlConsulta
  ].join('\n');
}

export function enlaceClickToChat(telefonoWa: string, mensaje: string): string {
  return `https://wa.me/${telefonoWa}?text=${encodeURIComponent(mensaje)}`;
}

/** Recepción: disponible salvo cancelada (permite reenviar). */
export function puedePlantillaRecepcion(estado: EstadoOrdenServicio | null | undefined): boolean {
  return !!estado && estado !== 'CANCELADO';
}

/** Cotización: solo con OT esperando respuesta del cliente. */
export function puedePlantillaCotizacion(estado: EstadoOrdenServicio | null | undefined): boolean {
  return estado === 'PENDIENTE_APROBACION';
}

/** Equipo listo: estado LISTO. */
export function puedePlantillaEquipoListo(estado: EstadoOrdenServicio | null | undefined): boolean {
  return estado === 'LISTO';
}

export function construirMensajeWhatsAppAsistido(
  plantilla: PlantillaWhatsAppAsistido,
  params: {
    nombre: string | null | undefined;
    ordenNumero: string;
    urlConsulta: string;
    cotizacionNumero?: string | null;
  }
): string {
  switch (plantilla) {
    case 'recepcion':
      return mensajeRecepcion(params);
    case 'cotizacion':
      return mensajeCotizacion({
        ...params,
        cotizacionNumero: (params.cotizacionNumero ?? '').trim() || '—'
      });
    case 'equipoListo':
      return mensajeEquipoListo(params);
  }
}
