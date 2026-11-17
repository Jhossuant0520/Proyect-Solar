/**
 * Configuración de entorno — PRODUCCIÓN / TEST alojado.
 * Frontend: https://test.computerelectroniccentersas.com/
 * Alineado con solvix.frontend.base-url del backend.
 */
export const environment = {
  production: true,
  /** Host del backend sin sufijo /api (medios relativos, fotos). */
  apiOrigin: 'https://api-test.computerelectroniccentersas.com',
  /** Prefijo REST: {origin}/api */
  apiBaseUrl: 'https://api-test.computerelectroniccentersas.com/api',
  /**
   * Dominio web público (portal /consulta/ot, QR, WhatsApp asistido).
   * Nunca usar apiOrigin ni window.location.origin para el cliente.
   */
  publicWebBaseUrl: 'https://test.computerelectroniccentersas.com'
};
