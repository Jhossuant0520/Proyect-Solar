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
  ViewChild
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SolvixSectionHeaderComponent } from '../../../../../shared/components/solvix-section-header/solvix-section-header';
import { Agrupacion, SeccionEstado, SerieMetrica, VentasSeriePunto } from '../../models/dashboard.models';
import { formatMoney } from '../../utils/dashboard-format';
import { SectionStateComponent } from '../section-state/section-state';

Chart.register(...registerables);

@Component({
  selector: 'solvix-sales-evolution',
  standalone: true,
  imports: [SolvixSectionHeaderComponent, SectionStateComponent],
  templateUrl: './sales-evolution.html',
  styleUrl: './sales-evolution.scss'
})
export class SalesEvolutionComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() points: VentasSeriePunto[] = [];
  @Input() metrica: SerieMetrica = 'ventasNetas';
  @Input() agrupacion: Agrupacion = 'MES';
  @Input() state: SeccionEstado = 'ready';
  @Output() metricaChange = new EventEmitter<SerieMetrica>();
  @Output() agrupacionChange = new EventEmitter<Agrupacion>();
  @Output() retry = new EventEmitter<void>();

  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;

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

  private renderChart(): void {
    if (!this.canvas || this.state !== 'ready') {
      return;
    }

    this.chart?.destroy();
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const color = this.metrica === 'devoluciones'
      ? '#ffb4ab'
      : this.metrica === 'ganancia'
        ? '#10b981'
        : this.metrica === 'ventas'
          ? '#38bdf8'
          : '#4fd1ff';

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.points.map(point => point.etiqueta),
        datasets: [{
          data: this.points.map(point => point[this.metrica]),
          borderColor: color,
          backgroundColor: 'rgba(79, 209, 255, 0.12)',
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
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
            grid: { color: 'rgba(61, 72, 78, 0.35)' }
          },
          y: {
            ticks: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: value => formatMoney(Number(value), true)
            },
            grid: { color: 'rgba(61, 72, 78, 0.35)' }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }
}
