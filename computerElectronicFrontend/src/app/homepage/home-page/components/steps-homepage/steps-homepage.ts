import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { prefersReducedMotion } from '../../../../shared/utils/count-up';

export interface StepItem {
  number: string;
  title: string;
  description: string;
  icon: string;
  note: string;
  noteIcon: string;
}

@Component({
  selector: 'app-steps-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './steps-homepage.html',
  styleUrl: './steps-homepage.scss'
})
export class StepsHomepage implements OnDestroy {
  @ViewChild('stepsSection', { static: true })
  private readonly stepsSection!: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  /** Solo true si IO está disponible y se habilitó motion (contenido visible por defecto). */
  motionEnabled = false;
  revealed = false;

  private observer: IntersectionObserver | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterNextRender(() => {
      this.setupReveal();
    });
  }

  steps: StepItem[] = [
    {
      number: '01',
      title: 'Trae tu equipo.',
      description:
        'Visítanos en nuestras instalaciones con tu computador, portátil o impresora. Nuestro equipo te recibirá y tomará nota detallada del problema.',
      icon: 'storefront',
      note: 'Recepción formal con orden',
      noteIcon: 'receipt_long'
    },
    {
      number: '02',
      title: 'Diagnóstico y Cotización.',
      description:
        'Nuestros técnicos revisarán el equipo a fondo y te entregaremos un diagnóstico preciso junto con un presupuesto transparente antes de cualquier arreglo.',
      icon: 'biotech',
      note: 'Cero cobros sorpresa',
      noteIcon: 'price_check'
    },
    {
      number: '03',
      title: 'Reparación y Entrega.',
      description:
        'Con tu aprobación, realizamos el mantenimiento o reparación con repuestos de calidad, dejándolo listo y probado para que pases a recogerlo.',
      icon: 'task_alt',
      note: 'Garantía por escrito',
      noteIcon: 'verified'
    }
  ];

  ngOnDestroy(): void {
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  private setupReveal(): void {
    if (this.motionEnabled || this.revealed) {
      return;
    }
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const el = this.stepsSection?.nativeElement;
    if (!el) {
      return;
    }

    try {
      this.observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting) || this.revealed) {
            return;
          }
          this.zone.run(() => this.markRevealed());
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );
      this.motionEnabled = true;
      // Evitar detectChanges() en AfterViewInit (NG0100 en dev).
      this.cdr.markForCheck();
      this.observer.observe(el);
      this.safetyTimer = setTimeout(() => {
        if (this.motionEnabled && !this.revealed) {
          this.zone.run(() => this.failOpen());
        }
      }, 8000);
    } catch {
      this.disconnectObserver();
    }
  }

  private markRevealed(): void {
    if (this.revealed) {
      return;
    }
    this.revealed = true;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  private failOpen(): void {
    this.motionEnabled = false;
    this.revealed = false;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
