import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { ServicioListComponent, DEBOUNCE_BUSQUEDA_ORDENES_MS } from './servicio-list';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { OrdenServicioResponseDTO } from '../../../../core/models/orden-servicio.models';
import { PaginaResponseDTO } from '../../../../core/models/cotizacion-comercial.models';

const orden: OrdenServicioResponseDTO = {
  id: 1,
  numero: 'OS-2026-000001',
  clienteId: 4,
  clienteNombre: 'Ana Ruiz',
  equipoId: 9,
  equipoTipo: 'PORTATIL',
  equipoMarca: 'Dell',
  equipoModelo: 'XPS',
  equipoNombre: 'Notebook',
  estado: 'RECEPCIONADO',
  problemaReportado: 'No enciende',
  diagnostico: null,
  trabajoRealizado: null,
  observaciones: null,
  fechaRecepcion: '2026-03-01T10:00:00',
  fechaActualizacion: '2026-03-01T10:00:00',
  fechaCierre: null,
  createdBy: 'admin'
};

function pagina(
  contenido: OrdenServicioResponseDTO[],
  extras: Partial<PaginaResponseDTO<OrdenServicioResponseDTO>> = {}
): PaginaResponseDTO<OrdenServicioResponseDTO> {
  return {
    contenido,
    pagina: 0,
    tamano: 20,
    totalElementos: contenido.length,
    totalPaginas: contenido.length ? 1 : 0,
    ...extras
  };
}

describe('ServicioListComponent', () => {
  let fixture: ComponentFixture<ServicioListComponent>;
  let component: ServicioListComponent;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let router: Router;

  beforeEach(async () => {
    ordenService = jasmine.createSpyObj('OrdenServicioService', ['listar']);
    ordenService.listar.and.returnValue(of(pagina([orden], { totalElementos: 1, totalPaginas: 1 })));

    await TestBed.configureTestingModule({
      imports: [ServicioListComponent],
      providers: [
        provideRouter([{ path: 'servicios/:id', component: ServicioListComponent }]),
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: ClienteService, useValue: jasmine.createSpyObj('ClienteService', ['buscar']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('carga la primera página server-side sin listar todos los clientes', fakeAsync(() => {
    expect(component.state).toBe('loading');
    fixture.detectChanges();
    tick();
    expect(component.state).toBe('ready');
    expect(ordenService.listar).toHaveBeenCalledWith(
      jasmine.objectContaining({ pagina: 0, tamano: 20 })
    );
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('OS-2026-000001');
    expect(text).toContain('Ana Ruiz');
    expect(fixture.nativeElement.querySelector('app-cliente-buscador')).not.toBeNull();
  }));

  it('muestra empty cuando no hay órdenes', fakeAsync(() => {
    ordenService.listar.and.returnValue(of(pagina([])));
    fixture.detectChanges();
    tick();
    expect(component.state).toBe('empty');
    expect(fixture.nativeElement.textContent).toContain('Aún no hay órdenes de servicio.');
  }));

  it('debouncea la búsqueda parcial y pide página 0', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    ordenService.listar.calls.reset();
    component.onSearch({ target: { value: '125' } } as unknown as Event);
    tick(DEBOUNCE_BUSQUEDA_ORDENES_MS - 50);
    expect(ordenService.listar).not.toHaveBeenCalled();
    tick(50);
    expect(ordenService.listar).toHaveBeenCalledWith(
      jasmine.objectContaining({ q: '125', pagina: 0 })
    );
  }));

  it('muestra error y permite reintentar', fakeAsync(() => {
    ordenService.listar.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    tick();
    expect(component.state).toBe('error');
    ordenService.listar.and.returnValue(of(pagina([orden])));
    component.cargar();
    tick();
    expect(component.state).toBe('ready');
  }));

  it('navega al detalle', fakeAsync(() => {
    const navigate = spyOn(router, 'navigate');
    fixture.detectChanges();
    tick();
    component.abrir(1);
    expect(navigate).toHaveBeenCalledWith(['/servicios', 1]);
  }));

  it('navega a nueva orden', () => {
    const navigate = spyOn(router, 'navigate');
    component.nueva();
    expect(navigate).toHaveBeenCalledWith(['/servicios/nueva']);
  });
});
