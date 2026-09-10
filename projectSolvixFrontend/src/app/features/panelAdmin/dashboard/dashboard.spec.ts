import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { DashboardComponent } from './dashboard';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AnalyticsService,
          useValue: {
            resumen: () => of({
              ventasBrutas: 0,
              devoluciones: 0,
              ventasNetas: 0,
              costoVentas: null,
              gananciaBruta: null,
              margenBruto: null,
              pedidos: 0,
              ticketPromedio: null,
              estadoVentas: 'SIN_DATOS',
              estadoGanancia: 'SIN_DATOS',
              estadoMargen: 'SIN_DATOS',
              estadoTicket: 'SIN_DATOS',
              lineasSinCosto: 0,
              comparativa: null,
              periodo: null
            }),
            ventas: () => of({ periodo: null, puntos: [], estado: 'SIN_DATOS' }),
            topProductos: () => of([]),
            bajoRendimiento: () => of([]),
            categorias: () => of([]),
            inventario: () => of({
              stockTotal: 0,
              valorInventario: null,
              stockInicial: 0,
              valorInventarioInicial: null,
              stockFinal: 0,
              valorInventarioFinal: null,
              inventarioPromedio: null,
              productosSinValuacionHistorica: 0,
              unidadesIngresadas: 0,
              unidadesDevueltasProveedor: 0,
              inventarioDisponible: 0,
              unidadesVendidas: 0,
              costoVentas: null,
              inventoryTurnover: null,
              sellThrough: null,
              velocidadVenta: null,
              diasInventario: null,
              productosStockCritico: 0,
              umbralStockCritico: 0,
              productosSinCosto: 0,
              estadoValorInventario: 'SIN_DATOS',
              estadoTurnover: 'SIN_DATOS',
              estadoSellThrough: 'SIN_DATOS',
              estadoDiasInventario: 'SIN_DATOS',
              periodo: null
            }),
            abc: () => of({
              periodo: null,
              criterio: 'INGRESOS',
              limiteA: null,
              limiteB: null,
              total: null,
              productos: [],
              estado: 'SIN_DATOS'
            })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
