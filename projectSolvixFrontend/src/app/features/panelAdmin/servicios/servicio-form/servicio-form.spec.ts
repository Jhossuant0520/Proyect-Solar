import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicioFormComponent } from './servicio-form';
import { ClienteService } from '../../../../core/services/cliente.service';
import { EquipoService } from '../../../../core/services/equipo.service';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { EquipoResponseDTO } from '../../../../core/models/equipo.models';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';

const clienteAna: ClienteResponseDTO = {
  id: 4,
  nombre: 'Ana Ruiz',
  tipoCliente: 'PERSONA',
  consumidorFinal: false,
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  email: null,
  telefono: '300',
  notas: null,
  activo: true,
  fechaRegistro: null
};

const equipo: EquipoResponseDTO = {
  id: 9,
  clienteId: 4,
  clienteNombre: 'Ana Ruiz',
  tipoEquipo: 'PORTATIL',
  marca: 'Dell',
  modelo: 'XPS',
  numeroSerie: 'SN',
  referenciaInterna: 'Notebook',
  observaciones: null,
  activo: true,
  fechaRegistro: null
};

describe('ServicioFormComponent — wizard', () => {
  let fixture: ComponentFixture<ServicioFormComponent>;
  let component: ServicioFormComponent;
  let clienteService: jasmine.SpyObj<ClienteService>;
  let equipoService: jasmine.SpyObj<EquipoService>;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let feedback: jasmine.SpyObj<SolvixFeedbackService>;
  let router: Router;
  let queryParams: Record<string, string | null> = {};

  beforeEach(async () => {
    queryParams = {};
    clienteService = jasmine.createSpyObj('ClienteService', ['crear', 'obtenerPorId', 'buscar']);
    equipoService = jasmine.createSpyObj('EquipoService', ['crear', 'obtenerPorId', 'buscar']);
    ordenService = jasmine.createSpyObj('OrdenServicioService', ['crear']);
    feedback = jasmine.createSpyObj('SolvixFeedbackService', ['success', 'error', 'info']);
    clienteService.crear.and.returnValue(of({ ...clienteAna, id: 55, nombre: 'Nuevo' }));
    clienteService.obtenerPorId.and.returnValue(of(clienteAna));
    clienteService.buscar.and.returnValue(of([clienteAna]));
    equipoService.crear.and.returnValue(of({ ...equipo, id: 99, marca: 'HP' }));
    equipoService.obtenerPorId.and.returnValue(of(equipo));
    equipoService.buscar.and.returnValue(of([equipo]));

    await TestBed.configureTestingModule({
      imports: [ServicioFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParams[key] ?? null
              }
            }
          }
        },
        { provide: ClienteService, useValue: clienteService },
        { provide: EquipoService, useValue: equipoService },
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: SolvixFeedbackService, useValue: feedback },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('inicia listo sin cargar catálogos completos', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.paso).toBe(1);
    expect(component.loadState).toBe('ready');
    expect(fixture.nativeElement.querySelector('app-cliente-buscador')).not.toBeNull();
    expect(clienteService.obtenerPorId).not.toHaveBeenCalled();
  }));

  it('selecciona cliente y avanza a equipos con buscador', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.onClienteSeleccionado(clienteAna);
    component.continuarDesdeCliente();
    fixture.detectChanges();
    expect(component.paso).toBe(2);
    expect(fixture.nativeElement.querySelector('app-equipo-buscador')).not.toBeNull();
  }));

  it('crea cliente inline y lo preselecciona', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.abrirCrearCliente();
    component.clienteInline.setValue({ nombre: 'Nuevo', telefono: '', numeroDocumento: '' });
    component.guardarClienteInline();
    tick();
    expect(clienteService.crear).toHaveBeenCalled();
    expect(component.form.controls.clienteId.value).toBe(55);
  }));

  it('crea equipo inline y lo preselecciona', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.onClienteSeleccionado(clienteAna);
    component.continuarDesdeCliente();
    component.abrirCrearEquipo();
    component.equipoInline.patchValue({ tipoEquipo: 'IMPRESORA', marca: 'HP' });
    component.guardarEquipoInline();
    tick();
    expect(equipoService.crear).toHaveBeenCalled();
    expect(component.form.controls.equipoId.value).toBe(99);
  }));

  it('abre firma de recepción y navega tras éxito (D.2)', fakeAsync(() => {
    const navigate = spyOn(router, 'navigate');
    fixture.detectChanges();
    tick();
    component.onClienteSeleccionado(clienteAna);
    component.onEquipoSeleccionado(equipo);
    component.paso = 3;
    component.form.controls.problemaReportado.setValue('No enciende');
    fixture.detectChanges();

    const openSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of({ ordenId: 22, numero: 'OS-2026-000022' })
    });
    Object.defineProperty(component, 'dialog', {
      value: { open: openSpy },
      configurable: true
    });

    component.guardar();
    tick();
    expect(openSpy).toHaveBeenCalled();
    expect(feedback.success).toHaveBeenCalledWith('Recepción registrada');
    expect(navigate).toHaveBeenCalledWith(['/servicios', 22], {
      queryParams: { esperarComprobante: '1' }
    });
  }));

  it('preselecciona cliente por query param sin listar todo', fakeAsync(() => {
    queryParams = { clienteId: '4' };
    fixture = TestBed.createComponent(ServicioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    expect(clienteService.obtenerPorId).toHaveBeenCalledWith(4);
    expect(component.form.controls.clienteId.value).toBe(4);
    expect(component.paso).toBe(2);
  }));

  it('preselecciona cliente y equipo por query params', fakeAsync(() => {
    queryParams = { clienteId: '4', equipoId: '9' };
    fixture = TestBed.createComponent(ServicioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    expect(component.form.controls.clienteId.value).toBe(4);
    expect(component.form.controls.equipoId.value).toBe(9);
    expect(component.paso).toBe(3);
  }));

  it('limpia equipo al cambiar de cliente', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.onClienteSeleccionado(clienteAna);
    component.onEquipoSeleccionado(equipo);
    component.onClienteSeleccionado({ ...clienteAna, id: 5, nombre: 'Otro' });
    expect(component.form.controls.equipoId.value).toBeNull();
    expect(component.equipoSeleccionado).toBeNull();
  }));

  it('muestra error si el prefill de cliente falla', fakeAsync(() => {
    queryParams = { clienteId: '4' };
    clienteService.obtenerPorId.and.returnValue(throwError(() => new Error('fail')));
    fixture = TestBed.createComponent(ServicioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    expect(component.loadState).toBe('error');
  }));
});
