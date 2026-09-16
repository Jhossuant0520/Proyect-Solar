/**
 * Origen del API Spring Boot. Las URLs relativas de imagen se resuelven aquí;
 * el modelo de producto guarda solo la ruta relativa o una URL externa.
 */
export const API_ORIGIN = 'http://localhost:8080';

/**
 * Convierte imagenUrl (externa o relativa de SOLVIX) en URL usable por &lt;img&gt;.
 * No inventa rutas: si no hay valor, retorna null.
 */
export function resolverUrlMedia(url?: string | null): string | null {
  if (url == null) {
    return null;
  }
  const limpio = url.trim();
  if (!limpio) {
    return null;
  }
  if (
    limpio.startsWith('http://')
    || limpio.startsWith('https://')
    || limpio.startsWith('blob:')
    || limpio.startsWith('data:')
  ) {
    return limpio;
  }
  return `${API_ORIGIN}${limpio.startsWith('/') ? limpio : `/${limpio}`}`;
}
