import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CountUpHandle, prefersReducedMotion, runCountUp } from '../../../../shared/utils/count-up';

export interface HomepageStat {
  value: string;
  description: string;
  icon: string;
}

interface StatMotion {
  prefix: string;
  target: number;
  suffix: string;
  useGrouping: boolean;
  durationMs: number;
}

@Component({
  selector: 'app-stats-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-homepage.html',
  styleUrl: './stats-homepage.scss'
})
export class StatsHomepage implements AfterViewInit, OnDestroy {
  @ViewChild('statsSection', { static: true })
  private readonly statsSection!: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);

  stats: HomepageStat[] = [
    {
      value: '+20 Años',
      description: 'Experiencia sólida en el mercado informático',
      icon: 'calendar_month'
    },
    {
      value: '+15,000',
      description: 'Equipos reparados y optimizados con éxito',
      icon: 'devices'
    },
    {
      value: '100%',
      description: 'Garantía real en nuestro servicio técnico',
      icon: 'verified'
    },
    {
      value: '24/48 hrs',
      description: 'Tiempo promedio de diagnóstico inicial',
      icon: 'bolt'
    }
  ];

  /** Prefijo / número animado / sufijo (el `value` oficial no se altera). */
  animatedValues: string[] = this.stats.map(() => '');

  private readonly motions: StatMotion[] = [
    { prefix: '+', target: 20, suffix: ' Años', useGrouping: false, durationMs: 1800 },
    { prefix: '+', target: 15000, suffix: '', useGrouping: true, durationMs: 2400 },
    { prefix: '', target: 100, suffix: '%', useGrouping: false, durationMs: 2000 },
    { prefix: '', target: 24, suffix: '/48 hrs', useGrouping: false, durationMs: 1700 }
  ];

  private observer: IntersectionObserver | null = null;
  private handles: CountUpHandle[] = [];
  private hasAnimated = false;

  constructor() {
    this.animatedValues = this.motions.map(m => this.formatDisplay(m, 0));
  }

  ngAfterViewInit(): void {
    if (prefersReducedMotion()) {
      this.snapToFinal();
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        if (!visible || this.hasAnimated) {
          return;
        }
        this.hasAnimated = true;
        this.startCountUp();
        this.observer?.disconnect();
        this.observer = null;
      },
      { threshold: 0.3 }
    );

    this.observer.observe(this.statsSection.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.cancelAnimations();
  }

  private startCountUp(): void {
    this.cancelAnimations();
    this.handles = this.motions.map((motion, index) =>
      runCountUp(
        0,
        motion.target,
        motion.durationMs,
        mid => {
          this.animatedValues[index] = this.formatDisplay(motion, mid);
          this.cdr.markForCheck();
        },
        final => {
          this.animatedValues[index] = this.formatDisplay(motion, final);
          this.cdr.markForCheck();
        }
      )
    );
  }

  private snapToFinal(): void {
    this.hasAnimated = true;
    this.animatedValues = this.motions.map(m => this.formatDisplay(m, m.target));
    this.cdr.markForCheck();
  }

  private cancelAnimations(): void {
    this.handles.forEach(handle => handle.cancel());
    this.handles = [];
  }

  private formatDisplay(motion: StatMotion, value: number): string {
    const rounded = Math.round(value);
    const numberText = motion.useGrouping
      ? rounded.toLocaleString('en-US')
      : String(rounded);
    return `${motion.prefix}${numberText}${motion.suffix}`;
  }
}
