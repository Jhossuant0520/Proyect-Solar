import { environment } from '../../../environments/environment';

/**
 * Resuelve URLs de imagen (externas o relativas de SOLVIX) contra environment.apiOrigin.
 * El modelo de producto guarda solo la ruta relativa o una URL externa.
 */

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
  return `${environment.apiOrigin}${limpio.startsWith('/') ? limpio : `/${limpio}`}`;
}
