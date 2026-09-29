import { SolvixScrollService } from './solvix-scroll.service';

function mockMatchMedia(matches: boolean): jasmine.Spy {
  return spyOn(window, 'matchMedia').and.returnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  } as MediaQueryList);
}

describe('SolvixScrollService', () => {
  let service: SolvixScrollService;

  beforeEach(() => {
    service = new SolvixScrollService();
  });

  function mockRect(el: HTMLElement, rect: Partial<DOMRect>): void {
    spyOn(el, 'getBoundingClientRect').and.returnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
      ...rect
    } as DOMRect);
  }

  it('resolve null / selector vacío no rompe', () => {
    expect(service.resolve(null)).toBeNull();
    expect(service.resolve(undefined)).toBeNull();
    expect(service.scrollToElement(null)).toBeFalse();
    expect(service.highlight(null)).toBeFalse();
    expect(service.reveal(null)).toBeFalse();
  });

  it('elemento visible → reveal no llama scrollIntoView', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    mockRect(el, { top: 80, bottom: 180, left: 10, right: 110, width: 100, height: 100 });
    const scrollSpy = jasmine.createSpy('scrollIntoView');
    el.scrollIntoView = scrollSpy;

    expect(service.isReasonablyVisible(el)).toBeTrue();
    service.reveal(el, { highlight: false });
    expect(scrollSpy).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('elemento fuera de viewport → hace scroll', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    mockRect(el, {
      top: 2000,
      bottom: 2100,
      left: 10,
      right: 110,
      width: 100,
      height: 100
    });
    const scrollSpy = jasmine.createSpy('scrollIntoView');
    el.scrollIntoView = scrollSpy;

    expect(service.isReasonablyVisible(el)).toBeFalse();
    service.reveal(el, { highlight: false });
    expect(scrollSpy).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('reduced motion → behavior auto', () => {
    mockMatchMedia(true);
    const el = document.createElement('div');
    document.body.appendChild(el);
    mockRect(el, { top: 3000, bottom: 3100, width: 50, height: 50, left: 0, right: 50 });
    const scrollSpy = jasmine.createSpy('scrollIntoView');
    el.scrollIntoView = scrollSpy;

    service.scrollToElement(el);
    expect(scrollSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ behavior: 'auto' })
    );
    document.body.removeChild(el);
  });
});

describe('SolvixScrollService highlight', () => {
  it('agrega clase y la remueve', done => {
    mockMatchMedia(true);
    const service = new SolvixScrollService();
    const el = document.createElement('div');
    document.body.appendChild(el);

    expect(service.highlight(el, 1)).toBeTrue();
    expect(el.classList.contains('solvix-context-highlight')).toBeTrue();

    setTimeout(() => {
      expect(el.classList.contains('solvix-context-highlight')).toBeFalse();
      document.body.removeChild(el);
      done();
    }, 80);
  });
});
