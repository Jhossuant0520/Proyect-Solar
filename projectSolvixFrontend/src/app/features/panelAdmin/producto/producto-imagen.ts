/** Validación cliente de imágenes de producto (el backend vuelve a validar). */

export const PRODUCTO_IMAGEN_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCTO_IMAGEN_TIPOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ProductoImagenValidacion =
  | { ok: true }
  | { ok: false; mensaje: string };

export function validarArchivoImagenProducto(archivo: File | null | undefined): ProductoImagenValidacion {
  if (!archivo) {
    return { ok: false, mensaje: 'Selecciona una imagen.' };
  }
  if (!PRODUCTO_IMAGEN_TIPOS.includes(archivo.type as (typeof PRODUCTO_IMAGEN_TIPOS)[number])) {
    return { ok: false, mensaje: 'Usa una imagen JPG, PNG o WEBP.' };
  }
  if (archivo.size > PRODUCTO_IMAGEN_MAX_BYTES) {
    return { ok: false, mensaje: 'La imagen debe pesar máximo 2 MB.' };
  }
  return { ok: true };
}

export const MENSAJE_IMAGEN_EXTERNA_FALLA =
  'No pudimos cargar esta imagen. Puedes subirla directamente a SOLVIX.';
