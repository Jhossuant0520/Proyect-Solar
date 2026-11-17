import { easeOutCubic, prefersReducedMotion, runCountUp } from './count-up';

describe('count-up', () => {
  it('easeOutCubic termina en 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('termina exactamente en el valor real', done => {
    const frames: number[] = [];
    runCountUp(0, 150000, 80, v => frames.push(v), final => {
      expect(final).toBe(150000);
      expect(frames[frames.length - 1]).toBe(150000);
      done();
    });
  });

  it('sin movimiento preferido muestra valor final de inmediato', () => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    } as MediaQueryList);

    const frames: number[] = [];
    runCountUp(0, 42, 500, v => frames.push(v));
    expect(frames).toEqual([42]);
    expect(prefersReducedMotion()).toBeTrue();
  });
});
