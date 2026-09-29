import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import {
  DEBOUNCE_PRODUCTO_VENTA_MS,
  LIMITE_BUSQUEDA_PRODUCTOS_VENTA,
  VentaFormComponent
} from './venta-form';
import { ProductoService } from '../../../../core/services/producto.service';
import { VentaService } from '../../../../core/services/venta.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { SolvixActionRevealService } from '../../../../shared/services/solvix-action-reveal.service';
import { ProductoModel } from '../../producto/productoClase';
import { VentaResponseDTO } from '../../../../core/models/venta.models';

function producto(parcial: Partial<ProductoModel> = {}): ProductoModel {
  return {
    id: 1,
    nombre: 'Disco único',
    marca: 'Genérica',
    categoriaId: 1,
    precioVentaActual: 250000,
    stockActual: 1,
    activo: true,
    ...parcial
  };
}

describe('VentaFormComponent', () => {
  let fixture: ComponentFixture<VentaFormComponent>;
  let component: VentaFormComponent;
  let productoService: jasmine.SpyObj<ProductoService>;
  let clienteService: jasmine.SpyObj<ClienteService>;
  let ventaService: jasmine.SpyObj<VentaService>;
  let feedback: jasmine.SpyObj<SolvixFeedbackService>;
  let actionReveal: jasmine.SpyObj<SolvixActionRevealService>;

  beforeEach(async () => {
    productoService = jasmine.createSpyObj('ProductoService', ['buscar', 'listar', 'obtenerPorCodigoBarras']);
    clienteService = jasmine.createSpyObj('ClienteService', ['buscar', 'listar']);
    ventaService = jasmine.createSpyObj('VentaService', ['crear']);
    feedback = jasmine.createSpyObj('SolvixFeedbackService', ['success', 'error', 'info', 'warning', 'show']);
    actionReveal = jasmine.createSpyObj('SolvixActionRevealService', ['success', 'info', 'reveal', 'error']);
    await TestBed.configureTestingModule({
      imports: [VentaFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ProductoService, useValue: productoService },
        { provide: ClienteService, useValue: clienteService },
        { provide: VentaService, useValue: ventaService },
        { provide: SolvixFeedbackService, useValue: feedback },
        { provide: SolvixActionRevealService, useValue: actionReveal },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(VentaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('no descarga catálogo ni clientes al abrir', () => {
    expect(productoService.listar).not.toHaveBeenCalled();
    expect(clienteService.listar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-cliente-buscador')).not.toBeNull();
  });

  it('busca productos en servidor con debounce y límite', fakeAsync(() => {
    productoService.buscar.and.returnValue(of([producto()]));
    const input = fixture.nativeElement.querySelector('input[type=search][aria-label^="Buscar producto"]') as HTMLInputElement;
    input.value = 'di';
    input.dispatchEvent(new Event('input'));
    tick(100);
    input.value = 'disco';
    input.dispatchEvent(new Event('input'));
    tick(DEBOUNCE_PRODUCTO_VENTA_MS);
    fixture.detectChanges();

    expect(productoService.buscar).toHaveBeenCalledTimes(1);
    expect(productoService.buscar).toHaveBeenCalledWith('disco', LIMITE_BUSQUEDA_PRODUCTOS_VENTA);
    expect(fixture.nativeElement.textContent).toContain('Disco único');
  }));

  it('stock 1 y cantidad 1 es válido y se registra', () => {
    ventaService.crear.and.returnValue(of({ id: 9, numero: 'V-1' } as unknown as VentaResponseDTO));
    component.agregarProducto(producto());
    expect(component.detalles.at(0).valid).toBeTrue();
    expect(actionReveal.success).toHaveBeenCalled();

    component.registrar();
    expect(ventaService.crear).toHaveBeenCalled();
    expect(ventaService.crear.calls.mostRecent().args[0].detalles[0]).toEqual(
      jasmine.objectContaining({ productoId: 1, cantidad: 1 })
    );
    expect(feedback.success).toHaveBeenCalled();
  });

  it('cantidad mayor al stock muestra mensaje claro y no registra', () => {
    component.agregarProducto(producto({ stockActual: 2 }));
    component.detalles.at(0).patchValue({ cantidad: 3 });
    fixture.detectChanges();

    expect(component.detalles.at(0).hasError('stockInsuficiente')).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Stock insuficiente: disponible 2 u.');

    component.registrar();
    expect(ventaService.crear).not.toHaveBeenCalled();
    expect(component.submitError).toContain('stock disponible');

    component.detalles.at(0).patchValue({ cantidad: 2 });
    expect(component.detalles.at(0).valid).toBeTrue();
  });

  it('producto sin stock no se agrega', () => {
    component.agregarProducto(producto({ stockActual: 0 }));
    expect(component.detalles.length).toBe(0);
    expect(feedback.warning).toHaveBeenCalled();
  });
});
