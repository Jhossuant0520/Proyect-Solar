import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { ServicioListComponent } from './servicio-list';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { OrdenServicioResponseDTO } from '../../../../core/models/orden-servicio.models';

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

describe('ServicioListComponent', () => {
  let fixture: ComponentFixture<ServicioListComponent>;
  let component: ServicioListComponent;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let clienteService: jasmine.SpyObj<ClienteService>;
  let router: Router;

  beforeEach(async () => {
    ordenService = jasmine.createSpyObj('OrdenServicioService', ['listar']);
    clienteService = jasmine.createSpyObj('ClienteService', ['listar']);
    ordenService.listar.and.returnValue(of([orden]));
    clienteService.listar.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ServicioListComponent],
      providers: [
        provideRouter([{ path: 'servicios/:id', component: ServicioListComponent }]),
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: ClienteService, useValue: clienteService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('pasa a loading y luego ready con número, cliente, equipo y estado', fakeAsync(() => {
    expect(component.state).toBe('loading');
    fixture.detectChanges();
    tick();
    expect(component.state).toBe('ready');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('OS-2026-000001');
    expect(text).toContain('Ana Ruiz');
    expect(text).toContain('Recepcionado');
  }));

  it('muestra empty cuando no hay órdenes', fakeAsync(() => {
    ordenService.listar.and.returnValue(of([]));
    fixture.detectChanges();
    tick();
    expect(component.state).toBe('empty');
    expect(fixture.nativeElement.textContent).toContain('Aún no hay órdenes de servicio.');
  }));

  it('muestra error y permite reintentar', fakeAsync(() => {
    ordenService.listar.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    tick();
    expect(component.state).toBe('error');
    ordenService.listar.and.returnValue(of([orden]));
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
    expect(navigate).toHaveBeenCalledWith(['/servicios', 'nueva']);
  });
});
