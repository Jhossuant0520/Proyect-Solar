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

// Función auxiliar opcional para manejar el saludo según si hay nombre o no
function nombreSaludo(nombre: string | null | undefined): string {
  return nombre && nombre.trim() !== '' ? nombre.trim() : 'Estimado/a cliente';
}

export function mensajeRecepcion(params: {
  nombre: string | null | undefined;
  ordenNumero: string;
  urlConsulta: string;
}): string {
  return [
    `¡Hola *${nombreSaludo(params.nombre)}*! 👋`,
    '',
    'Hemos recibido tu equipo exitosamente en *Computer & Electronic Center*. 🛠️',
    '',
    `📄 *Orden de servicio:* #${params.ordenNumero}`,
    '',
    'Puedes consultar el estado de tu equipo en tiempo real aquí:',
    params.urlConsulta,
    '',
    'Te estaremos notificando cualquier novedad. ¡Gracias por confiar en nosotros! 🙌'
  ].join('\n');
}

export function mensajeCotizacion(params: {
  nombre: string | null | undefined;
  ordenNumero: string;
  cotizacionNumero: string;
  urlConsulta: string;
}): string {
  return [
    `¡Hola *${nombreSaludo(params.nombre)}*! 👋`,
    '',
    'Te informamos que la cotización de tu equipo ya se encuentra disponible. 📋✨',
    '',
    `💰 *Cotización:* #${params.cotizacionNumero}`,
    `📄 *Orden de servicio:* #${params.ordenNumero}`,
    '',
    'Puedes revisarla en detalle y aprobarla o rechazarla desde el siguiente enlace:',
    params.urlConsulta,
    '',
    'Quedamos atentos a tu confirmación para proceder con el servicio. ¡Quedamos a tu disposición! ⚙️'
  ].join('\n');
}

export function mensajeEquipoListo(params: {
  nombre: string | null | undefined;
  ordenNumero: string;
  urlConsulta: string;
}): string {
  return [
    `¡Hola *${nombreSaludo(params.nombre)}*! 🎉`,
    '',
    '¡Buenas noticias! Tu equipo ya está reparado y *listo para entrega* en *Computer & Electronic Center*. ✅',
    '',
    `📄 *Orden de servicio:* #${params.ordenNumero}`,
    '',
    'Puedes consultar todos los detalles, garantía o información de recogida aquí:',
    params.urlConsulta,
    '',
    'Te esperamos por él en nuestro horario habitual. ¡Ha sido un gusto atenderte! 🚀'
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
