import {
  labelCodigoBarras,
  normalizarCodigoBarras,
  productoCoincideBusqueda,
  encontrarPorCodigoExacto
} from './producto-ui';

describe('producto-ui código de barras', () => {
  it('normaliza vacío a null y conserva ceros iniciales', () => {
    expect(normalizarCodigoBarras('')).toBeNull();
    expect(normalizarCodigoBarras('   ')).toBeNull();
    expect(normalizarCodigoBarras(null)).toBeNull();
    expect(normalizarCodigoBarras('07701234567890')).toBe('07701234567890');
    expect(normalizarCodigoBarras(' 7701234567890 ')).toBe('7701234567890');
  });

  it('etiqueta sin código como No registrado', () => {
    expect(labelCodigoBarras(null)).toBe('No registrado');
    expect(labelCodigoBarras('7701234567890')).toBe('7701234567890');
  });

  it('busca por nombre, id o código de barras', () => {
    const producto = {
      id: 12,
      nombre: 'Cámara H9C',
      marca: 'Hikvision',
      codigoBarras: '7701234567890'
    };

    expect(productoCoincideBusqueda(producto, 'cámara')).toBeTrue();
    expect(productoCoincideBusqueda(producto, '12')).toBeTrue();
    expect(productoCoincideBusqueda(producto, '770123')).toBeTrue();
    expect(productoCoincideBusqueda(producto, '999999')).toBeFalse();
  });

  it('no convierte el código a número en la coincidencia', () => {
    const producto = {
      id: 1,
      nombre: 'Sensor',
      marca: 'Generic',
      codigoBarras: '07701234567890'
    };
    expect(productoCoincideBusqueda(producto, '07701234567890')).toBeTrue();
    expect(encontrarPorCodigoExacto([producto], '07701234567890')?.nombre).toBe('Sensor');
  });
});
