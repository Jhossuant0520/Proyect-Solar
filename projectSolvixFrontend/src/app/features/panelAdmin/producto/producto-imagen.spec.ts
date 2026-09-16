import {
  MENSAJE_IMAGEN_EXTERNA_FALLA,
  PRODUCTO_IMAGEN_MAX_BYTES,
  validarArchivoImagenProducto
} from './producto-imagen';

describe('producto-imagen', () => {
  it('acepta JPEG/PNG/WEBP dentro del límite', () => {
    const jpeg = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
    expect(validarArchivoImagenProducto(jpeg)).toEqual({ ok: true });
  });

  it('rechaza tipo no permitido', () => {
    const gif = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' });
    expect(validarArchivoImagenProducto(gif)).toEqual({
      ok: false,
      mensaje: 'Usa una imagen JPG, PNG o WEBP.'
    });
  });

  it('rechaza archivo demasiado grande', () => {
    const grande = new File([new Uint8Array(PRODUCTO_IMAGEN_MAX_BYTES + 1)], 'a.jpg', {
      type: 'image/jpeg'
    });
    expect(validarArchivoImagenProducto(grande)).toEqual({
      ok: false,
      mensaje: 'La imagen debe pesar máximo 2 MB.'
    });
  });

  it('exige archivo', () => {
    expect(validarArchivoImagenProducto(null).ok).toBeFalse();
  });

  it('expone mensaje de fallo de URL externa', () => {
    expect(MENSAJE_IMAGEN_EXTERNA_FALLA).toContain('subirla directamente a SOLVIX');
  });
});
