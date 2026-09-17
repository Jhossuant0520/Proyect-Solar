import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicioRepuestosPanelComponent } from './servicio-repuestos-panel';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { RepuestoOrdenServicioResponseDTO } from '../../../../core/models/orden-servicio.models';
import { PlanificarRepuestoDialogComponent } from './planificar-repuesto-dialog/planificar-repuesto-dialog';
import { CantidadRepuestoDialogComponent } from './cantidad-repuesto-dialog/cantidad-repuesto-dialog';

function linea(
  parcial: Partial<RepuestoOrdenServicioResponseDTO> = {}
): RepuestoOrdenServicioResponseDTO {
  return {
    id: 1,
    ordenServicioId: 12,
    productoId: 7,
    productoNombre: 'SSD 512GB',
    codigoBarras: '770123',
    cantidadPlanificada: 2,
    cantidadConsumida: 0,
    cantidadDevuelta: 0,
    cantidadNetaConsumida: 0,
    cantidadPendiente: 2,
    costoHistorico: null,
    costoConocido: false,
    productoActivo: true,
    estado: 'PLANIFICADO',
    anulado: false,
    puedeEditar: true,
    puedeEliminar: true,
    puedeConsumir: true,
    puedeDevolver: false,
    ...parcial
  };
}

describe('ServicioRepuestosPanelComponent', () => {
  let fixture: ComponentFixture<ServicioRepuestosPanelComponent>;
  let component: ServicioRepuestosPanelComponent;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let dialogOpen: jasmine.Spy;

  beforeEach(async () => {
    ordenService = jasmine.createSpyObj('OrdenServicioService', [
      'listarRepuestos',
      'anularRepuesto',
      'planificarRepuesto',
      'consumirRepuesto'
    ]);
    ordenService.listarRepuestos.and.returnValue(of([linea()]));

    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(undefined)
    });
    dialogOpen = dialogSpy.open;

    await TestBed.configureTestingModule({
      imports: [ServicioRepuestosPanelComponent, NoopAnimationsModule],
      providers: [
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: ProductoService, useValue: jasmine.createSpyObj('ProductoService', ['listar']) },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialogSpy })
      .compileComponents();

    fixture = TestBed.createComponent(ServicioRepuestosPanelComponent);
    component = fixture.componentInstance;
    component.ordenId = 12;
    component.estado = 'EN_REPARACION';
    component.canManage = true;
  });

  function triggerLoad(): void {
    component.ngOnChanges({
      ordenId: {
        currentValue: 12,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    tick();
    fixture.detectChanges();
  }

  it('lista líneas con cantidades y chip de estado', fakeAsync(() => {
    triggerLoad();
    expect(ordenService.listarRepuestos).toHaveBeenCalledWith(12);
    expect(component.state).toBe('ready');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('SSD 512GB');
    expect(text).toContain('Planificado');
    expect(text).toContain('Pendiente');
  }));

  it('muestra costo histórico no disponible cuando costo es null', fakeAsync(() => {
    ordenService.listarRepuestos.and.returnValue(
      of([linea({ costoHistorico: null, costoConocido: false })])
    );
    triggerLoad();
    expect(fixture.nativeElement.textContent).toContain('Costo histórico no disponible');
    expect(fixture.nativeElement.textContent).not.toContain('$0');
  }));

  it('muestra badge de producto inactivo', fakeAsync(() => {
    ordenService.listarRepuestos.and.returnValue(of([linea({ productoActivo: false })]));
    triggerLoad();
    expect(fixture.nativeElement.textContent).toContain('Producto inactivo');
  }));

  it('abre diálogo de agregar y refresca al planificar', fakeAsync(() => {
    const creada = linea({ id: 2, productoNombre: 'RAM 16GB' });
    dialogOpen.and.returnValue({
      afterClosed: () => of(creada)
    });
    ordenService.listarRepuestos.and.returnValues(of([linea()]), of([linea(), creada]));

    triggerLoad();
    component.abrirAgregar();
    tick();
    fixture.detectChanges();

    expect(dialogOpen).toHaveBeenCalledWith(
      PlanificarRepuestoDialogComponent,
      jasmine.objectContaining({ data: { ordenId: 12 } })
    );
    expect(ordenService.listarRepuestos).toHaveBeenCalledTimes(2);
  }));

  it('abre diálogo de consumir con máximo pendiente', fakeAsync(() => {
    dialogOpen.and.returnValue({
      afterClosed: () => of(linea({ cantidadConsumida: 1, cantidadPendiente: 1, estado: 'PARCIAL' }))
    });
    triggerLoad();

    component.abrirConsumir(linea({ puedeConsumir: true, cantidadPendiente: 2 }));
    tick();

    expect(dialogOpen).toHaveBeenCalledWith(
      CantidadRepuestoDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({ modo: 'consumir', maxCantidad: 2 })
      })
    );
  }));

  it('emite pending al cargar', fakeAsync(() => {
    const spy = jasmine.createSpy('repuestosChange');
    component.repuestosChange.subscribe(spy);
    ordenService.listarRepuestos.and.returnValue(
      of([linea({ cantidadPendiente: 3 }), linea({ id: 2, cantidadPendiente: 1, anulado: true })])
    );
    triggerLoad();
    expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ pending: 3 }));
  }));

  it('muestra empty cuando no hay líneas', fakeAsync(() => {
    ordenService.listarRepuestos.and.returnValue(of([]));
    triggerLoad();
    expect(component.state).toBe('empty');
    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no hay repuestos en esta orden.'
    );
  }));

  it('muestra error al fallar la carga', fakeAsync(() => {
    ordenService.listarRepuestos.and.returnValue(throwError(() => ({ status: 500 })));
    triggerLoad();
    expect(component.state).toBe('error');
  }));
});
