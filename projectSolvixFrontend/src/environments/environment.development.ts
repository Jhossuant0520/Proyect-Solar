/**
 * Desarrollo local: frontend :4200 → backend :8080.
 * publicWebBaseUrl apunta al portal TEST (mismo que QR en backend de test)
 * para no enviar localhost al cliente vía WhatsApp.
 */
export const environment = {
  production: false,
  apiOrigin: 'http://localhost:8080',
  apiBaseUrl: 'http://localhost:8080/api',
  publicWebBaseUrl: 'https://test.computerelectroniccentersas.com'
};
