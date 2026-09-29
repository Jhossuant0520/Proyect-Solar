import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { DashboardComponent } from './dashboard';

const resumenOk = {
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
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let analytics: {
    resumen: jasmine.Spy;
    ventas: jasmine.Spy;
    topProductos: jasmine.Spy;
    bajoRendimiento: jasmine.Spy;
    categorias: jasmine.Spy;
    inventario: jasmine.Spy;
    abc: jasmine.Spy;
  };

  beforeEach(async () => {
    analytics = {
      resumen: jasmine.createSpy('resumen').and.returnValue(of(resumenOk)),
      ventas: jasmine.createSpy('ventas').and.returnValue(of({ periodo: null, puntos: [], estado: 'SIN_DATOS' })),
      topProductos: jasmine.createSpy('topProductos').and.returnValue(of([])),
      bajoRendimiento: jasmine.createSpy('bajoRendimiento').and.returnValue(of([])),
      categorias: jasmine.createSpy('categorias').and.returnValue(of([])),
      inventario: jasmine.createSpy('inventario').and.returnValue(of({
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
      })),
      abc: jasmine.createSpy('abc').and.returnValue(of({
        periodo: null,
        criterio: 'INGRESOS',
        limiteA: null,
        limiteB: null,
        total: null,
        productos: [],
        estado: 'SIN_DATOS'
      }))
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AnalyticsService, useValue: analytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('activa refreshing al actualizar y lo libera al completar resumen', () => {
    const pending = new Subject<typeof resumenOk>();
    analytics.resumen.and.returnValue(pending.asObservable());

    expect(component.refreshing()).toBeFalse();
    component.onRefresh();
    expect(component.refreshing()).toBeTrue();

    pending.next(resumenOk);
    pending.complete();
    expect(component.refreshing()).toBeFalse();
  });
});
