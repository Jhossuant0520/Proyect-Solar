import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import { Chart, ChartConfiguration, Plugin, registerables } from 'chart.js';
import { ThemeService } from '../../../../../core/services/theme.service';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { prefersReducedMotion } from '../../../../../shared/utils/count-up';
import { Agrupacion, SeccionEstado, SerieMetrica, VentasSeriePunto } from '../../models/dashboard.models';
import { formatMoney } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

Chart.register(...registerables);

/** Crosshair vertical sutil al hover/tap del punto activo (Chart.js canvas). */
const solvixCrosshairPlugin: Plugin<'line'> = {
  id: 'solvixCrosshair',
  afterDraw(chart) {
    const active = chart.getActiveElements();
    if (!active.length) {
      return;
    }
    const { ctx, chartArea, canvas } = chart;
    const crosshair =
      getComputedStyle(canvas).getPropertyValue('--ce-chart-crosshair').trim() ||
      'color-mix(in srgb, #006194 40%, transparent)';
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = crosshair;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }
};

@Component({
  selector: 'solvix-sales-evolution',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent],
  templateUrl: './sales-evolution.html',
  styleUrl: './sales-evolution.scss'
})
export class SalesEvolutionComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly theme = inject(ThemeService);

  @Input() points: VentasSeriePunto[] = [];
  @Input() metrica: SerieMetrica = 'ventasNetas';
  @Input() agrupacion: Agrupacion = 'MES';
  @Input() state: SeccionEstado = 'ready';
  @Output() metricaChange = new EventEmitter<SerieMetrica>();
  @Output() agrupacionChange = new EventEmitter<Agrupacion>();
  @Output() retry = new EventEmitter<void>();

  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;

  constructor() {
    effect(() => {
      this.theme.resolved();
      queueMicrotask(() => this.renderChart());
    });
  }

  readonly metricas: { id: SerieMetrica; label: string }[] = [
    { id: 'ventas', label: 'Ventas brutas' },
    { id: 'devoluciones', label: 'Devoluciones' },
    { id: 'ventasNetas', label: 'Ventas netas' },
    { id: 'ganancia', label: 'Ganancia' }
  ];

  readonly agrupaciones: { id: Agrupacion; label: string }[] = [
    { id: 'DIA', label: 'Día' },
    { id: 'SEMANA', label: 'Semana' },
    { id: 'MES', label: 'Mes' },
    { id: 'ANIO', label: 'Año' }
  ];

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] || changes['metrica'] || changes['state'] || changes['agrupacion']) {
      queueMicrotask(() => this.renderChart());
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private cssVar(name: string, fallback: string): string {
    const el = this.canvas?.nativeElement;
    if (!el || typeof window === 'undefined') {
      return fallback;
    }
    const value = getComputedStyle(el).getPropertyValue(name).trim();
    return value || fallback;
  }

  private chartDuration(): number {
    if (prefersReducedMotion()) {
      return 0;
    }
    if (typeof window === 'undefined') {
      return 700;
    }
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--motion-chart')
      .trim();
    const ms = Number.parseFloat(raw);
    return Number.isFinite(ms) && ms >= 0 ? ms : 700;
  }

  private seriesColor(): string {
    if (this.metrica === 'devoluciones') {
      return this.cssVar('--ce-chart-danger', this.cssVar('--solvix-error', '#ba1a1a'));
    }
    if (this.metrica === 'ganancia') {
      return this.cssVar('--ce-chart-success', this.cssVar('--solvix-success', '#047857'));
    }
    if (this.metrica === 'ventas') {
      return this.cssVar('--ce-chart-secondary', this.cssVar('--solvix-secondary', '#007bb9'));
    }
    return this.cssVar('--ce-chart-primary', this.cssVar('--solvix-primary', '#006194'));
  }

  private renderChart(): void {
    if (!this.canvas || this.state !== 'ready') {
      return;
    }

    this.chart?.destroy();
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const color = this.seriesColor();
    const fill = this.cssVar('--ce-chart-fill', 'color-mix(in srgb, #006194 12%, transparent)');
    const tick = this.cssVar('--solvix-text-muted', '#5a6570');
    const grid = this.cssVar('--solvix-border-subtle', '#e8eef5');
    const duration = this.chartDuration();

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.points.map(point => point.etiqueta),
        datasets: [{
          data: this.points.map(point => point[this.metrica]),
          borderColor: color,
          backgroundColor: fill,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointHoverBackgroundColor: color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: item => formatMoney(Number(item.raw), true)
            }
          }
        },
        scales: {
          x: {
            ticks: { color: tick, font: { family: 'Inter, sans-serif', size: 10 } },
            grid: { color: grid }
          },
          y: {
            ticks: {
              color: tick,
              font: { family: 'Inter, sans-serif', size: 10 },
              callback: value => formatMoney(Number(value), true)
            },
            grid: { color: grid }
          }
        }
      },
      plugins: duration > 0 ? [solvixCrosshairPlugin] : []
    };

    this.chart = new Chart(ctx, config);
  }
}
