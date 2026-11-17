import { Injectable, signal } from '@angular/core';

/** Preferencia guardada del usuario (no el tema resuelto). */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Tema efectivo aplicado a `html[data-theme]`. */
export type ResolvedTheme = 'light' | 'dark';

/** Clave canónica de persistencia. Escrituras futuras solo usan esta. */
export const CE_THEME_STORAGE_KEY = 'ce-theme';

/**
 * Clave legacy (pre-8E). Se lee si `ce-theme` falta o es inválida.
 * No eliminar en esta etapa: permite recuperación y migración gradual.
 * Candidata a retiro en una versión posterior tras confirmar adopción.
 */
export const LEGACY_THEME_STORAGE_KEY = 'solvix-theme';

const VALID_PREFERENCES = new Set<ThemePreference>(['light', 'dark', 'system']);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferenceSignal = signal<ThemePreference>('dark');
  private readonly resolvedSignal = signal<ResolvedTheme>('dark');
  private mediaQuery: MediaQueryList | null = null;
  private mediaListener: ((event: MediaQueryListEvent) => void) | null = null;
  private initialized = false;

  /** Preferencia del usuario: light | dark | system. */
  readonly preference = this.preferenceSignal.asReadonly();

  /** Tema efectivamente aplicado. */
  readonly resolved = this.resolvedSignal.asReadonly();

  /** Inicializa lectura de localStorage + listener de sistema. Idempotente. */
  init(): void {
    if (this.initialized || typeof document === 'undefined') {
      return;
    }
    this.initialized = true;
    const pref = this.readStoredPreference();
    this.preferenceSignal.set(pref);
    this.applyPreference(pref);
    this.bindSystemListener();
  }

  setPreference(preference: ThemePreference): void {
    if (!VALID_PREFERENCES.has(preference)) {
      return;
    }
    this.preferenceSignal.set(preference);
    this.persist(preference);
    this.applyPreference(preference);
  }

  /** Alias legible para plantillas. */
  select(preference: ThemePreference): void {
    this.setPreference(preference);
  }

  isSelected(preference: ThemePreference): boolean {
    return this.preferenceSignal() === preference;
  }

  /** Expone resolución del sistema (útil en tests). */
  resolveSystemTheme(matchesDark?: boolean): ResolvedTheme {
    if (typeof matchesDark === 'boolean') {
      return matchesDark ? 'dark' : 'light';
    }
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyPreference(preference: ThemePreference): void {
    const resolved: ResolvedTheme =
      preference === 'system' ? this.resolveSystemTheme() : preference;
    this.resolvedSignal.set(resolved);
    this.writeDataTheme(resolved);
  }

  private writeDataTheme(theme: ResolvedTheme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }

  /** Escrituras futuras: solo `ce-theme`. No borra la clave legacy. */
  private persist(preference: ThemePreference): void {
    try {
      localStorage.setItem(CE_THEME_STORAGE_KEY, preference);
    } catch {
      /* private mode / quota */
    }
  }

  /**
   * Lectura dual:
   * 1) `ce-theme` válido
   * 2) si no, `solvix-theme` válido → migrar a `ce-theme`
   * 3) default `dark`
   */
  readStoredPreference(): ThemePreference {
    try {
      const current = localStorage.getItem(CE_THEME_STORAGE_KEY);
      if (isThemePreference(current)) {
        return current;
      }

      const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
      if (isThemePreference(legacy)) {
        this.persist(legacy);
        return legacy;
      }
    } catch {
      /* ignore */
    }
    return 'dark';
  }

  private bindSystemListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    this.unbindSystemListener();
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaListener = () => {
      if (this.preferenceSignal() === 'system') {
        this.applyPreference('system');
      }
    };
    this.mediaQuery.addEventListener('change', this.mediaListener);
  }

  private unbindSystemListener(): void {
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener('change', this.mediaListener);
    }
    this.mediaQuery = null;
    this.mediaListener = null;
  }
}
