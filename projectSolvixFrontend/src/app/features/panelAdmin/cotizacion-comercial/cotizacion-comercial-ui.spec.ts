import {
  participaEnResumenCotizacion,
  subtotalLinea
} from './cotizacion-comercial-ui';

describe('cotizacion-comercial-ui D.6 resumen condicional', () => {
  it('participaEnResumenCotizacion solo con importe numérico > 0', () => {
    expect(participaEnResumenCotizacion(0)).toBeFalse();
    expect(participaEnResumenCotizacion(-1)).toBeFalse();
    expect(participaEnResumenCotizacion(null)).toBeFalse();
    expect(participaEnResumenCotizacion(undefined)).toBeFalse();
    expect(participaEnResumenCotizacion(Number.NaN)).toBeFalse();
    expect(participaEnResumenCotizacion('')).toBeFalse();
    expect(participaEnResumenCotizacion('0')).toBeFalse();
    expect(participaEnResumenCotizacion(0.01)).toBeTrue();
    expect(participaEnResumenCotizacion(250000)).toBeTrue();
    expect(participaEnResumenCotizacion('15000')).toBeTrue();
  });

  it('casos de categorías: solo productos / solo mano / solo otros / combinaciones', () => {
    const caso = (p: number, m: number, o: number) => ({
      productos: participaEnResumenCotizacion(p),
      mano: participaEnResumenCotizacion(m),
      otros: participaEnResumenCotizacion(o)
    });

    expect(caso(100, 0, 0)).toEqual({ productos: true, mano: false, otros: false });
    expect(caso(100, 50, 0)).toEqual({ productos: true, mano: true, otros: false });
    expect(caso(100, 0, 20)).toEqual({ productos: true, mano: false, otros: true });
    expect(caso(100, 50, 20)).toEqual({ productos: true, mano: true, otros: true });
    expect(caso(0, 80, 0)).toEqual({ productos: false, mano: true, otros: false });
    expect(caso(0, 0, 15)).toEqual({ productos: false, mano: false, otros: true });
    expect(caso(0, 0, 0)).toEqual({ productos: false, mano: false, otros: false });
  });

  it('subtotalLinea no cambia (regresión cálculo)', () => {
    expect(subtotalLinea(2, 100)).toBe(200);
    expect(subtotalLinea(null, 100)).toBe(0);
  });
});
