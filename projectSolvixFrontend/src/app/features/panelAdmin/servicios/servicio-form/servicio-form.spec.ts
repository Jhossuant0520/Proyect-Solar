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

const consumidor: ClienteResponseDTO = {
  ...clienteAna,
  id: 1,
  nombre: 'Consumidor final',
  tipoCliente: 'CONSUMIDOR_FINAL',
  consumidorFinal: true
};

const equipo: EquipoResponseDTO = {
  id: 9,
  clienteId: 4,
  clienteNombre: 'Ana Ruiz',
  tipoEquipo: 'PORTATIL',
  marca: 'Dell',
  modelo: 'XPS',
  numeroSerie: 'SN',
  nombre: 'Notebook',
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
  let router: Router;
  let queryParams: Record<string, string | null> = {};

  beforeEach(async () => {
    queryParams = {};
    clienteService = jasmine.createSpyObj('ClienteService', ['listar', 'crear']);
    equipoService = jasmine.createSpyObj('EquipoService', ['listarPorCliente', 'crear']);
    ordenService = jasmine.createSpyObj('OrdenServicioService', ['crear']);
    clienteService.listar.and.returnValue(of([clienteAna, consumidor]));
    clienteService.crear.and.returnValue(of({ ...clienteAna, id: 55, nombre: 'Nuevo' }));
    equipoService.listarPorCliente.and.returnValue(of([equipo]));
    equipoService.crear.and.returnValue(of({ ...equipo, id: 99, marca: 'HP' }));
    ordenService.crear.and.returnValue(
      of({
        id: 22,
        numero: 'OS-2026-000022',
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
        fechaRecepcion: null,
        fechaActualizacion: null,
        fechaCierre: null,
        createdBy: 'admin'
      })
    );

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
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('inicia en paso cliente', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.paso).toBe(1);
    expect(component.clientesSeleccionables.map(c => c.id)).toEqual([4]);
  }));

  it('selecciona cliente y avanza a equipos', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.seleccionarCliente(4);
    tick();
    component.continuarDesdeCliente();
    expect(component.paso).toBe(2);
    expect(equipoService.listarPorCliente).toHaveBeenCalledWith(4, true);
    expect(component.equipos.length).toBe(1);
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

  it('filtra equipos por cliente y permite crear equipo inline', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.seleccionarCliente(4);
    tick();
    component.continuarDesdeCliente();
    component.abrirCrearEquipo();
    component.equipoInline.patchValue({ tipoEquipo: 'IMPRESORA', marca: 'HP' });
    component.guardarEquipoInline();
    tick();
    expect(equipoService.crear).toHaveBeenCalled();
    expect(component.form.controls.equipoId.value).toBe(99);
  }));

  it('crea OT desde recepción', fakeAsync(() => {
    const navigate = spyOn(router, 'navigate');
    fixture.detectChanges();
    tick();
    component.seleccionarCliente(4);
    tick();
    component.seleccionarEquipo(9);
    component.paso = 3;
    component.form.controls.problemaReportado.setValue('No enciende');
    component.guardar();
    tick();
    expect(ordenService.crear).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/servicios', 22]);
  }));

  it('preselecciona cliente por query param', fakeAsync(() => {
    queryParams = { clienteId: '4' };
    fixture = TestBed.createComponent(ServicioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
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

  it('cambia equipos al seleccionar otro cliente', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.seleccionarCliente(4);
    tick();
    component.seleccionarEquipo(9);
    const otro: EquipoResponseDTO = { ...equipo, id: 11, clienteId: 5 };
    equipoService.listarPorCliente.and.returnValue(of([otro]));
    component.seleccionarCliente(5);
    tick();
    expect(component.form.controls.equipoId.value).toBeNull();
    expect(component.equipos.map(e => e.id)).toEqual([11]);
  }));

  it('muestra error de carga', fakeAsync(() => {
    clienteService.listar.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    tick();
    expect(component.loadState).toBe('error');
  }));
});
