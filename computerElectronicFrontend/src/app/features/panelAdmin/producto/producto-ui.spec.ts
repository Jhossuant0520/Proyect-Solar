import {
  labelCodigoBarras,
  normalizarCodigoBarras,
  productoCoincideBusqueda,
  encontrarPorCodigoExacto,
  calcularPrecioSugerido,
  esPorcentajeRecargoValido
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

describe('producto-ui precio sugerido (recargo sobre costo)', () => {
  it('costo 50000 + 30% = 65000', () => {
    expect(calcularPrecioSugerido(50000, 30)).toBe(65000);
  });

  it('costo 50000 + 20% = 60000', () => {
    expect(calcularPrecioSugerido(50000, 20)).toBe(60000);
  });

  it('porcentaje modificable (40%)', () => {
    expect(calcularPrecioSugerido(50000, 40)).toBe(70000);
  });

  it('porcentaje 0% = costo', () => {
    expect(calcularPrecioSugerido(50000, 0)).toBe(50000);
  });

  it('rechaza porcentaje inválido', () => {
    expect(calcularPrecioSugerido(50000, -5)).toBeNull();
    expect(calcularPrecioSugerido(50000, NaN)).toBeNull();
    expect(calcularPrecioSugerido(50000, Infinity)).toBeNull();
    expect(calcularPrecioSugerido(50000, 'abc')).toBeNull();
    expect(esPorcentajeRecargoValido(-1)).toBeFalse();
    expect(esPorcentajeRecargoValido(NaN)).toBeFalse();
    expect(esPorcentajeRecargoValido(30)).toBeTrue();
    expect(esPorcentajeRecargoValido(0)).toBeTrue();
  });

  it('rechaza costo inválido', () => {
    expect(calcularPrecioSugerido(null, 30)).toBeNull();
    expect(calcularPrecioSugerido(NaN, 30)).toBeNull();
    expect(calcularPrecioSugerido(-100, 30)).toBeNull();
    expect(calcularPrecioSugerido('no-num', 30)).toBeNull();
  });

  it('cambiar porcentaje recalcula sugerido sin mutar precio venta', () => {
    const precioVenta = 70000;
    expect(calcularPrecioSugerido(50000, 30)).toBe(65000);
    expect(calcularPrecioSugerido(50000, 40)).toBe(70000);
    expect(precioVenta).toBe(70000);
  });

  it('cambiar costo recalcula sugerido sin mutar precio venta', () => {
    const precioVenta = 70000;
    expect(calcularPrecioSugerido(50000, 30)).toBe(65000);
    expect(calcularPrecioSugerido(60000, 30)).toBe(78000);
    expect(precioVenta).toBe(70000);
  });

  it('acepta decimales en porcentaje', () => {
    expect(calcularPrecioSugerido(100000, 12.5)).toBe(112500);
  });

  it('acepta strings numéricos tipados como entrada de UI', () => {
    expect(calcularPrecioSugerido('50000', '30')).toBe(65000);
    expect(calcularPrecioSugerido('50.000', '30')).toBe(65000);
  });
});
