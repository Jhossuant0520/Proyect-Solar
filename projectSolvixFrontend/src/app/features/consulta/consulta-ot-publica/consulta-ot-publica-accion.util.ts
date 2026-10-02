import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensajes de error seguros para acciones públicas de cotización.
 * No filtra documento vs teléfono.
 */
export function mensajeErrorAccionPublicaCotizacion(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'No se pudo completar la acción. Intenta de nuevo o contacta al taller.';
  }
  if (error.status === 429) {
    return 'Se alcanzó el límite de intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (error.status === 403) {
    return mensajeBackendO(
      error,
      'No pudimos validar la información ingresada. Verifica los datos e intenta nuevamente.'
    );
  }
  if (error.status === 404) {
    return mensajeBackendO(
      error,
      'No hay una cotización pendiente de tu respuesta o el enlace ya no es válido.'
    );
  }
  if (error.status === 409) {
    return mensajeBackendO(
      error,
      'La cotización ya no está pendiente de tu respuesta. Actualiza la página.'
    );
  }
  if (error.status === 400) {
    return mensajeBackendO(error, 'No se pudo completar la acción con la cotización actual.');
  }
  return 'No se pudo completar la acción. Intenta de nuevo o contacta al taller.';
}

function mensajeBackendO(error: HttpErrorResponse, fallback: string): string {
  const body = error.error;
  if (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string') {
    const msg = ((body as { message: string }).message ?? '').trim();
    if (msg) {
      return msg;
    }
  }
  return fallback;
}
