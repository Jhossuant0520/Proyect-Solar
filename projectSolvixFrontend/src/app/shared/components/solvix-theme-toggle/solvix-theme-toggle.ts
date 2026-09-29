import { Component, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService, SolvixThemePreference } from '../../../core/services/theme.service';

@Component({
  selector: 'solvix-theme-toggle',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule],
  template: `
    <button
      type="button"
      class="theme-toggle"
      [matMenuTriggerFor]="themeMenu"
      [attr.aria-label]="'Tema actual: ' + labelPreferencia()"
    >
      <span class="material-symbols-outlined" aria-hidden="true">{{ iconPreferencia() }}</span>
    </button>

    <mat-menu #themeMenu="matMenu" class="theme-menu-panel" xPosition="before">
      <div class="theme-menu" role="group" aria-label="Seleccionar tema" (click)="$event.stopPropagation()">
        <p class="theme-menu__title">Tema</p>
        @for (opt of opciones; track opt.value) {
          <button
            type="button"
            class="theme-menu__option"
            [class.is-active]="theme.preference() === opt.value"
            [attr.aria-pressed]="theme.preference() === opt.value"
            (click)="elegir(opt.value)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{ opt.icon }}</span>
            <span class="theme-menu__label">{{ opt.label }}</span>
            @if (theme.preference() === opt.value) {
              <span class="material-symbols-outlined theme-menu__check" aria-hidden="true">check</span>
            }
          </button>
        }
      </div>
    </mat-menu>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .theme-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        border: 0;
        border-radius: 0.25rem;
        background: transparent;
        color: var(--color-text-muted, var(--solvix-text-muted));
        cursor: pointer;
        transition:
          color var(--motion-fast, 140ms) var(--ease-standard, ease),
          background-color var(--motion-fast, 140ms) var(--ease-standard, ease);
      }

      .theme-toggle:hover,
      .theme-toggle:focus-visible {
        color: var(--color-primary, var(--solvix-primary));
        outline: none;
      }

      .theme-toggle:focus-visible {
        outline: 2px solid var(--color-focus, var(--solvix-primary));
        outline-offset: 2px;
      }

      .theme-menu {
        min-width: 11.5rem;
        padding: 0.5rem;
        display: grid;
        gap: 0.2rem;
      }

      .theme-menu__title {
        margin: 0 0 0.35rem;
        padding: 0 0.45rem;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-muted, var(--solvix-text-muted));
        font-weight: 700;
      }

      .theme-menu__option {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.55rem;
        width: 100%;
        border: 0;
        border-radius: 0.4rem;
        background: transparent;
        color: var(--color-text-secondary, var(--solvix-text-secondary));
        font: inherit;
        font-size: 0.9rem;
        padding: 0.5rem 0.55rem;
        cursor: pointer;
        text-align: left;
      }

      .theme-menu__option:hover,
      .theme-menu__option:focus-visible {
        background: var(--color-primary-soft, var(--solvix-primary-soft));
        color: var(--color-primary, var(--solvix-primary));
        outline: none;
      }

      .theme-menu__option.is-active {
        background: var(--color-primary-soft, var(--solvix-primary-soft));
        color: var(--color-primary, var(--solvix-primary));
        font-weight: 600;
      }

      .theme-menu__check {
        font-size: 1.05rem;
      }

      .theme-menu__label {
        line-height: 1.2;
      }
    `
  ]
})
export class SolvixThemeToggleComponent {
  readonly theme = inject(ThemeService);

  readonly opciones: { value: SolvixThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Claro', icon: 'light_mode' },
    { value: 'dark', label: 'Oscuro', icon: 'dark_mode' },
    { value: 'system', label: 'Sistema', icon: 'contrast' }
  ];

  elegir(preference: SolvixThemePreference): void {
    this.theme.select(preference);
  }

  labelPreferencia(): string {
    const map: Record<SolvixThemePreference, string> = {
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema'
    };
    return map[this.theme.preference()];
  }

  iconPreferencia(): string {
    const pref = this.theme.preference();
    if (pref === 'system') {
      return 'contrast';
    }
    return pref === 'light' ? 'light_mode' : 'dark_mode';
  }
}
