import { Injectable, signal } from '@angular/core';

/** Preferencia guardada del usuario (no el tema resuelto). */
export type SolvixThemePreference = 'light' | 'dark' | 'system';

/** Tema efectivo aplicado a `html[data-theme]`. */
export type SolvixResolvedTheme = 'light' | 'dark';

export const SOLVIX_THEME_STORAGE_KEY = 'solvix-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferenceSignal = signal<SolvixThemePreference>('dark');
  private readonly resolvedSignal = signal<SolvixResolvedTheme>('dark');
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

  setPreference(preference: SolvixThemePreference): void {
    if (preference !== 'light' && preference !== 'dark' && preference !== 'system') {
      return;
    }
    this.preferenceSignal.set(preference);
    this.persist(preference);
    this.applyPreference(preference);
  }

  /** Alias legible para plantillas. */
  select(preference: SolvixThemePreference): void {
    this.setPreference(preference);
  }

  isSelected(preference: SolvixThemePreference): boolean {
    return this.preferenceSignal() === preference;
  }

  /** Expone resolución del sistema (útil en tests). */
  resolveSystemTheme(matchesDark?: boolean): SolvixResolvedTheme {
    if (typeof matchesDark === 'boolean') {
      return matchesDark ? 'dark' : 'light';
    }
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyPreference(preference: SolvixThemePreference): void {
    const resolved: SolvixResolvedTheme =
      preference === 'system' ? this.resolveSystemTheme() : preference;
    this.resolvedSignal.set(resolved);
    this.writeDataTheme(resolved);
  }

  private writeDataTheme(theme: SolvixResolvedTheme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }

  private persist(preference: SolvixThemePreference): void {
    try {
      localStorage.setItem(SOLVIX_THEME_STORAGE_KEY, preference);
    } catch {
      /* private mode / quota */
    }
  }

  readStoredPreference(): SolvixThemePreference {
    try {
      const raw = localStorage.getItem(SOLVIX_THEME_STORAGE_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        return raw;
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
