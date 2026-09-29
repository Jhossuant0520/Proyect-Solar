import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { EstadoOrdenServicio } from '../../../core/models/orden-servicio.models';
import {
  FasePublicaOrden,
  progresoFasesPublicas,
  resumenFaseActual
} from '../../../features/panelAdmin/servicios/estado-orden-ux';
import { prefersReducedMotion } from '../../utils/count-up';

export type ProgressFasesVariant = 'desktop' | 'compact' | 'mobile' | 'public';

/**
 * Stepper de 5 fases reutilizable (consulta pública + detalle interno).
 * Solo presentación; no cambia estados.
 */
@Component({
  selector: 'solvix-progress-fases',
  standalone: true,
  template: `
    @if (variant === 'mobile' || variant === 'compact') {
      <div class="fase-compacta" [class.is-expanded]="expandido">
        <button
          type="button"
          class="fase-toggle"
          (click)="toggle()"
          [attr.aria-expanded]="expandido"
        >
          @if (resumen; as r) {
            <span class="fase-toggle-text">Fase {{ r.numero }} de {{ r.total }} · {{ r.label }}</span>
          } @else {
            <span class="fase-toggle-text">Orden cancelada</span>
          }
          <span
            class="material-symbols-outlined fase-chevron"
            [class.is-open]="expandido"
            aria-hidden="true"
          >expand_more</span>
        </button>
        @if (expandido) {
          <ol class="fases fases--vertical" aria-label="Progreso del servicio">
            @for (fase of fases; track fase.codigo) {
              <li
                class="fase fase--{{ fase.estado }}"
                [class.fase--just-changed]="justChanged && fase.estado === 'actual'"
                [attr.aria-current]="fase.estado === 'actual' ? 'step' : null"
              >
                <span class="fase-num" aria-hidden="true">{{ fase.numero }}</span>
                <span class="fase-label">{{ fase.label }}</span>
              </li>
            }
          </ol>
        }
      </div>
    } @else {
      <ol
        class="fases"
        [class.fases--desktop]="variant === 'desktop'"
        [class.fases--public]="variant === 'public'"
        [class.fases--advanced]="justChanged"
        aria-label="Progreso del servicio"
      >
        @for (fase of fases; track fase.codigo; let last = $last) {
          <li
            class="fase fase--{{ fase.estado }}"
            [class.fase--just-changed]="justChanged && fase.estado === 'actual'"
            [attr.aria-current]="fase.estado === 'actual' ? 'step' : null"
          >
            <span class="fase-num" aria-hidden="true">{{ fase.numero }}</span>
            <span class="fase-label">{{ fase.label }}</span>
            @if (!last) {
              <span
                class="fase-connector"
                [class.is-filled]="fase.estado === 'completada'"
                [class.is-filling]="justChanged && fase.estado === 'completada'"
                aria-hidden="true"
              ></span>
            }
          </li>
        }
      </ol>
    }
  `,
  styleUrl: './solvix-progress-fases.scss'
})
export class SolvixProgressFasesComponent implements OnChanges, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() estadoCodigo: EstadoOrdenServicio | string | null = null;
  /** Fase previa al cancelar (para marcar dónde se detuvo). */
  @Input() faseAlCancelar: FasePublicaOrden | null = null;
  @Input() variant: ProgressFasesVariant = 'desktop';
  /** En mobile/compact: si el detalle vertical inicia abierto. */
  @Input() expandidoInicial = false;

  expandido = false;
  justChanged = false;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expandidoInicial']) {
      this.expandido = this.expandidoInicial;
    }

    if (changes['estadoCodigo']) {
      const first = changes['estadoCodigo'].firstChange;
      const prev = changes['estadoCodigo'].previousValue;
      const curr = changes['estadoCodigo'].currentValue;
      if (!first && prev != null && curr != null && prev !== curr && !prefersReducedMotion()) {
        this.triggerJustChanged();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
  }

  get fases() {
    return progresoFasesPublicas(this.estadoCodigo, { faseAlCancelar: this.faseAlCancelar });
  }

  get resumen() {
    return resumenFaseActual(this.estadoCodigo);
  }

  toggle(): void {
    this.expandido = !this.expandido;
  }

  private triggerJustChanged(): void {
    this.justChanged = true;
    this.cdr.markForCheck();
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
    this.flashTimer = setTimeout(() => {
      this.justChanged = false;
      this.flashTimer = null;
      this.cdr.markForCheck();
    }, 600);
  }
}
