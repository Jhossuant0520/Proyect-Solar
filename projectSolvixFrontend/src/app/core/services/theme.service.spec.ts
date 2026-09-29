import {
  ThemeService,
  SOLVIX_THEME_STORAGE_KEY,
  SolvixThemePreference
} from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let matchMediaMatches: boolean;
  let mediaListeners: Array<(event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    localStorage.removeItem(SOLVIX_THEME_STORAGE_KEY);
    matchMediaMatches = true;
    mediaListeners = [];
    document.documentElement.removeAttribute('data-theme');

    spyOn(window, 'matchMedia').and.callFake((query: string) => {
      return {
        matches: query.includes('dark') ? matchMediaMatches : !matchMediaMatches,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          mediaListeners.push(listener);
        },
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          mediaListeners = mediaListeners.filter(l => l !== listener);
        },
        dispatchEvent: () => true
      } as MediaQueryList;
    });

    service = new ThemeService();
  });

  afterEach(() => {
    localStorage.removeItem(SOLVIX_THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  it('usa dark por defecto', () => {
    service.init();
    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('seleccionar light aplica data-theme=light y persiste', () => {
    service.init();
    service.select('light');
    expect(service.preference()).toBe('light');
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(SOLVIX_THEME_STORAGE_KEY)).toBe('light');
  });

  it('seleccionar dark aplica data-theme=dark y persiste', () => {
    service.init();
    service.select('light');
    service.select('dark');
    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(SOLVIX_THEME_STORAGE_KEY)).toBe('dark');
  });

  it('seleccionar system resuelve según prefers-color-scheme', () => {
    matchMediaMatches = false;
    service.init();
    service.select('system');
    expect(service.preference()).toBe('system');
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(SOLVIX_THEME_STORAGE_KEY)).toBe('system');
  });

  it('system oscuro aplica dark', () => {
    matchMediaMatches = true;
    service.init();
    service.select('system');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('lee preferencia desde localStorage al init', () => {
    localStorage.setItem(SOLVIX_THEME_STORAGE_KEY, 'light');
    const nuevamente = new ThemeService();
    nuevamente.init();
    expect(nuevamente.preference()).toBe('light');
    expect(nuevamente.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('conserva system tras reinicio y sigue el esquema del SO', () => {
    localStorage.setItem(SOLVIX_THEME_STORAGE_KEY, 'system');
    matchMediaMatches = false;
    const nuevamente = new ThemeService();
    nuevamente.init();
    expect(nuevamente.preference()).toBe('system');
    expect(nuevamente.resolved()).toBe('light');
  });

  it('reacciona a cambio de prefers-color-scheme cuando preference=system', () => {
    matchMediaMatches = true;
    service.init();
    service.select('system');
    expect(service.resolved()).toBe('dark');

    matchMediaMatches = false;
    mediaListeners.forEach(listener =>
      listener({ matches: false } as MediaQueryListEvent)
    );
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('no cambia con media query si preference no es system', () => {
    service.init();
    service.select('dark');
    matchMediaMatches = false;
    mediaListeners.forEach(listener =>
      listener({ matches: false } as MediaQueryListEvent)
    );
    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
  });

  it('ignora valores inválidos en localStorage', () => {
    localStorage.setItem(SOLVIX_THEME_STORAGE_KEY, 'neon' as SolvixThemePreference);
    service.init();
    expect(service.preference()).toBe('dark');
  });

  it('init es idempotente', () => {
    service.init();
    service.select('light');
    service.init();
    expect(service.preference()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
