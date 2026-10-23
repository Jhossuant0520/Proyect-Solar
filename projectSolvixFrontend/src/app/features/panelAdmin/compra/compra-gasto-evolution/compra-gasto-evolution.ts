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
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ThemeService } from '../../../../core/services/theme.service';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { Agrupacion, SeccionEstado } from '../../dashboard/models/dashboard.models';
import { formatMoney } from '../../dashboard/utils/dashboard-format';
import { SectionStateComponent } from '../../dashboard/components/section-state/section-state';
import { CompraSerieMetrica, CompraSeriePunto } from '../compra-mapper';

Chart.register(...registerables);

@Component({
  selector: 'solvix-compra-gasto-evolution',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent],
  templateUrl: './compra-gasto-evolution.html',
  styleUrl: './compra-gasto-evolution.scss'
})
export class CompraGastoEvolutionComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly theme = inject(ThemeService);

  @Input() points: CompraSeriePunto[] = [];
  @Input() metrica: CompraSerieMetrica = 'comprasNetas';
  @Input() agrupacion: Agrupacion = 'MES';
  @Input() state: SeccionEstado = 'ready';
  @Output() metricaChange = new EventEmitter<CompraSerieMetrica>();
  @Output() agrupacionChange = new EventEmitter<Agrupacion>();
  @Output() retry = new EventEmitter<void>();

  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;

  constructor() {
    effect(() => {
      this.theme.resolved();
      queueMicrotask(() => this.renderChart());
    });
  }

  readonly metricas: { id: CompraSerieMetrica; label: string }[] = [
    { id: 'compras', label: 'Compras del período' },
    { id: 'devoluciones', label: 'Devoluciones' },
    { id: 'comprasNetas', label: 'Compras netas' }
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

  private seriesColor(): string {
    if (this.metrica === 'devoluciones') {
      return this.cssVar('--ce-chart-danger', this.cssVar('--solvix-error', '#ba1a1a'));
    }
    if (this.metrica === 'compras') {
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
          pointBackgroundColor: color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
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
      }
    };

    this.chart = new Chart(ctx, config);
  }
}
