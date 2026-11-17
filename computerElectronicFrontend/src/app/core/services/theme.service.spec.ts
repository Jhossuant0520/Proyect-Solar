import {
  ThemeService,
  CE_THEME_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  ThemePreference
} from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let matchMediaMatches: boolean;
  let mediaListeners: Array<(event: MediaQueryListEvent) => void>;

  function clearThemeStorage(): void {
    localStorage.removeItem(CE_THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }

  beforeEach(() => {
    clearThemeStorage();
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
    clearThemeStorage();
    document.documentElement.removeAttribute('data-theme');
  });

  it('usa dark por defecto', () => {
    service.init();
    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('seleccionar light aplica data-theme=light y persiste solo en ce-theme', () => {
    service.init();
    service.select('light');
    expect(service.preference()).toBe('light');
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('light');
    expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
  });

  it('D.14: tokens de texto cambian entre dark y light (contraste de campos)', () => {
    service.init();
    service.select('dark');
    const darkText = getComputedStyle(document.documentElement)
      .getPropertyValue('--solvix-text')
      .trim()
      .toLowerCase();
    service.select('light');
    const lightText = getComputedStyle(document.documentElement)
      .getPropertyValue('--solvix-text')
      .trim()
      .toLowerCase();
    expect(darkText).toBeTruthy();
    expect(lightText).toBeTruthy();
    expect(lightText).not.toBe(darkText);
    expect(lightText).toBe('#0f172a');
    expect(darkText).toBe('#ffffff');
  });

  it('seleccionar dark aplica data-theme=dark y persiste', () => {
    service.init();
    service.select('light');
    service.select('dark');
    expect(service.preference()).toBe('dark');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('dark');
  });

  it('seleccionar system resuelve según prefers-color-scheme', () => {
    matchMediaMatches = false;
    service.init();
    service.select('system');
    expect(service.preference()).toBe('system');
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('system');
  });

  it('system oscuro aplica dark', () => {
    matchMediaMatches = true;
    service.init();
    service.select('system');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('lee preferencia desde ce-theme al init', () => {
    localStorage.setItem(CE_THEME_STORAGE_KEY, 'light');
    const nuevamente = new ThemeService();
    nuevamente.init();
    expect(nuevamente.preference()).toBe('light');
    expect(nuevamente.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('conserva system tras reinicio y sigue el esquema del SO', () => {
    localStorage.setItem(CE_THEME_STORAGE_KEY, 'system');
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
    localStorage.setItem(CE_THEME_STORAGE_KEY, 'neon' as ThemePreference);
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

  describe('compatibilidad legacy solvix-theme → ce-theme', () => {
    it('ce-theme válido tiene prioridad sobre solvix-theme', () => {
      localStorage.setItem(CE_THEME_STORAGE_KEY, 'light');
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark');
      expect(service.readStoredPreference()).toBe('light');
      service.init();
      expect(service.preference()).toBe('light');
      expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('light');
      expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBe('dark');
    });

    it('si solo existe solvix-theme válido, migra a ce-theme', () => {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'light');
      expect(service.readStoredPreference()).toBe('light');
      expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('light');
      expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBe('light');
      service.init();
      expect(service.preference()).toBe('light');
      expect(service.resolved()).toBe('light');
    });

    it('si ambas claves existen, conserva la nueva', () => {
      localStorage.setItem(CE_THEME_STORAGE_KEY, 'system');
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'light');
      matchMediaMatches = true;
      service.init();
      expect(service.preference()).toBe('system');
      expect(service.resolved()).toBe('dark');
      expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('system');
    });

    it('si ce-theme es inválida y legacy válida, usa la antigua y migra', () => {
      localStorage.setItem(CE_THEME_STORAGE_KEY, 'neon');
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'light');
      expect(service.readStoredPreference()).toBe('light');
      expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('light');
      service.init();
      expect(service.preference()).toBe('light');
    });

    it('si ambas son inválidas, aplica dark por defecto', () => {
      localStorage.setItem(CE_THEME_STORAGE_KEY, 'neon');
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'blue');
      service.init();
      expect(service.preference()).toBe('dark');
      expect(service.resolved()).toBe('dark');
    });

    it('escrituras futuras solo actualizan ce-theme', () => {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark');
      service.init();
      service.select('light');
      expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('light');
      expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBe('dark');
    });
  });
});
