import {
  COSTO_HISTORICO_NO_DISPONIBLE,
  coincideUmbralStockCritico,
  costoDesconocido,
  estadoStockVisual,
  inventarioCoincideBusqueda,
  labelCostoHistorico,
  labelEstadoStock,
  ordenarPorFechaDesc,
  rutaReferencia,
  valorSegunCostoActual,
  valuacionHistoricaIncompleta
} from './inventario-ui';

describe('inventario-ui', () => {
  const umbral = 5;

  it('usa el umbral del backend: activos con stock menor o igual, incluidos los agotados', () => {
    expect(coincideUmbralStockCritico({ activo: true, stockActual: 5 }, umbral)).toBeTrue();
    expect(coincideUmbralStockCritico({ activo: true, stockActual: 0 }, umbral)).toBeTrue();
    expect(coincideUmbralStockCritico({ activo: true, stockActual: 6 }, umbral)).toBeFalse();
    expect(coincideUmbralStockCritico({ activo: false, stockActual: 1 }, umbral)).toBeFalse();
    expect(coincideUmbralStockCritico({ activo: true, stockActual: 1 }, null)).toBeFalse();
  });

  it('agotado es el stock en cero; crítico solo si hay umbral y queda stock', () => {
    expect(estadoStockVisual(0, umbral)).toBe('agotado');
    expect(estadoStockVisual(4, umbral)).toBe('critico');
    expect(estadoStockVisual(8, umbral)).toBe('normal');
    expect(estadoStockVisual(3, null)).toBe('sin_umbral');
    expect(labelEstadoStock('agotado')).toBe('Agotado');
  });

  it('no trata el costo desconocido como cero ni rellena el histórico con el costo actual', () => {
    const producto = { stockActual: 4, costoActual: null, costoConocido: false };
    expect(costoDesconocido(producto)).toBeTrue();
    expect(valorSegunCostoActual(producto)).toBeNull();
    expect(labelCostoHistorico(null)).toBe(COSTO_HISTORICO_NO_DISPONIBLE);
    expect(labelCostoHistorico(undefined)).toBe(COSTO_HISTORICO_NO_DISPONIBLE);
  });

  it('el valor de línea solo aparece cuando el costo actual es conocido', () => {
    expect(valorSegunCostoActual({
      stockActual: 2,
      costoActual: 1500,
      costoConocido: true
    })).toBe(3000);
  });

  it('solo enlaza compra y venta; la devolución no inventa una ruta', () => {
    expect(rutaReferencia('COMPRA', 12)).toEqual(['/compras', '12']);
    expect(rutaReferencia('VENTA', 4)).toEqual(['/ventas', '4']);
    expect(rutaReferencia('DEVOLUCION_VENTA', 9)).toBeNull();
    expect(rutaReferencia('AJUSTE_MANUAL', null)).toBeNull();
  });

  it('la búsqueda local incluye categoría y código, sin query params nuevos', () => {
    const producto = {
      id: 7,
      nombre: 'Cámara',
      marca: 'Hik',
      codigoBarras: '07701234567890',
      categoriaNombre: 'Seguridad'
    };
    expect(inventarioCoincideBusqueda(producto, '07701234567890')).toBeTrue();
    expect(inventarioCoincideBusqueda(producto, 'seguridad')).toBeTrue();
    expect(inventarioCoincideBusqueda(producto, 'otro')).toBeFalse();
  });

  it('ordena movimientos por fecha descendente solo para presentarlos', () => {
    const ordenados = ordenarPorFechaDesc([
      { fecha: '2026-01-01T10:00:00' },
      { fecha: '2026-03-01T10:00:00' }
    ]);
    expect(ordenados[0].fecha).toBe('2026-03-01T10:00:00');
  });

  it('la valuación histórica incompleta sigue el estado del backend, no el valor de hoy', () => {
    expect(valuacionHistoricaIncompleta({
      estadoTurnover: 'COSTO_INCOMPLETO',
      productosSinValuacionHistorica: 2
    })).toBeTrue();
    expect(valuacionHistoricaIncompleta({
      estadoTurnover: 'OK',
      productosSinValuacionHistorica: 0
    })).toBeFalse();
  });
});
