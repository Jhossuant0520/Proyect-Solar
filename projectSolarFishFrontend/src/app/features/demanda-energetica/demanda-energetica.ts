import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { BaseChartDirective } from '@rinminase/ng-charts';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FincaService } from '../../core/services/finca.service';
import { DemandaEnergeticaService } from '../../core/services/demanda-energetica.service';
import { fincaModel } from '../finca/fincaClase';
import { DemandaEnergeticaClase } from './demandaEnergeticaClase';
import { MatTableModule } from '@angular/material/table';
import { ChartsModule } from '@rinminase/ng-charts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@Component({
  selector: 'app-demanda-energetica',
  standalone: true,
  templateUrl: './demanda-energetica.html',
  styleUrls: ['./demanda-energetica.scss'],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    ChartsModule,
    MatProgressSpinnerModule
  ]
})
export class DemandaEnergetica implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  fincas: fincaModel[] = [];
  fincaSeleccionada?: number;
  demanda?: DemandaEnergeticaClase;
  cargando = false;
  faseCarga: 'calculando' | 'renderizando' = 'calculando';

  displayedColumns: string[] = [
    'demandaDiaria',
    'demandaMensual',
    'demandaAnual',
    'demandaAC',
    'demandaDC'
  ];

  barChartData: any = null;
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 14,
            weight: '600'
          },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(26, 35, 56, 0.9)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 12
          },
          color: '#1A2338'
        },
        title: {
          display: true,
          text: 'Consumo (Wh/día)',
          font: {
            size: 14,
            weight: '600'
          },
          color: '#1A2338'
        },
        grid: {
          color: 'rgba(77, 182, 172, 0.1)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 12
          },
          color: '#1A2338'
        },
        grid: {
          display: false
        }
      }
    }
  };

  constructor(
    private fincaService: FincaService,
    private demandaService: DemandaEnergeticaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarFincas();
  }

  cargarFincas(): void {
    this.fincaService.listarFincas().subscribe({
      next: (data) => (this.fincas = data),
      error: () => this.snackBar.open('⚠️ Error al cargar fincas', 'Cerrar', { duration: 3000 })
    });
  }

  calcularDemanda(): void {
    if (!this.fincaSeleccionada) {
      this.snackBar.open('⚠️ Selecciona una finca primero', 'Cerrar', { duration: 3000 });
      return;
    }

    this.cargando = true;
    this.demanda = undefined; // Limpiar resultados anteriores
    this.barChartData = null; // Limpiar gráfico anterior

    this.demandaService.calcularDemanda(this.fincaSeleccionada).subscribe({
      next: (data) => {
        this.demanda = data;
        
        // Cambiar a fase de renderizado
        this.faseCarga = 'renderizando';
        this.cdr.detectChanges();
        
        // Generar el gráfico inmediatamente
        this.mostrarGrafico();
        
        // Mantener el loading activo hasta que los resultados se rendericen completamente
        setTimeout(() => {
          this.cargando = false;
          this.faseCarga = 'calculando';
          this.cdr.detectChanges();
          
          // Forzar actualización del gráfico después de que se oculte el loading
          setTimeout(() => {
            if (this.chart) {
              this.chart.update();
            }
            this.cdr.detectChanges();
          }, 100);
          
          this.snackBar.open('✅ Demanda calculada correctamente', 'Cerrar', { duration: 3000 });
        }, 1500); // 1500ms de delay para asegurar que se renderice todo (tabla + gráfico)
      },
      error: (err) => {
        console.error('Error al calcular demanda:', err);
        this.cargando = false;
        this.faseCarga = 'calculando';
        this.snackBar.open('❌ Error al calcular demanda', 'Cerrar', { duration: 3000 });
      }
    });
  }

  mostrarGrafico(): void {
    if (!this.demanda) {
      console.warn('No hay datos de demanda para mostrar el gráfico');
      return;
    }

    // Asegurar que los valores sean números
    const demandaAC = Number(this.demanda.demandaAC) || 0;
    const demandaDC = Number(this.demanda.demandaDC) || 0;

    console.log('Generando gráfico con datos:', { demandaAC, demandaDC });

    this.barChartData = {
      labels: ['Demanda Energética (Wh/día)'],
      datasets: [
        { 
          label: 'Cargas AC', 
          data: [demandaAC], 
          backgroundColor: '#4DB6AC',
          borderColor: '#3a9d94',
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 80
        },
        { 
          label: 'Cargas DC', 
          data: [demandaDC], 
          backgroundColor: '#FFD700',
          borderColor: '#ffed4e',
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 80
        }
      ]
    };
    
    console.log('barChartData generado:', this.barChartData);
    
    // Forzar detección de cambios y actualizar el gráfico
    this.cdr.detectChanges();
    
    // Actualizar el gráfico después de un pequeño delay
    setTimeout(() => {
      if (this.chart) {
        console.log('Actualizando gráfico...');
        this.chart.update();
      } else {
        console.warn('Chart directive no encontrado');
      }
    }, 300);
  }
}
