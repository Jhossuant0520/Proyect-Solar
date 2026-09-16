import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
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
  telefono: null,
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

describe('ServicioFormComponent', () => {
  let fixture: ComponentFixture<ServicioFormComponent>;
  let component: ServicioFormComponent;
  let clienteService: jasmine.SpyObj<ClienteService>;
  let equipoService: jasmine.SpyObj<EquipoService>;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let router: Router;

  beforeEach(async () => {
    clienteService = jasmine.createSpyObj('ClienteService', ['listar']);
    equipoService = jasmine.createSpyObj('EquipoService', ['listarPorCliente']);
    ordenService = jasmine.createSpyObj('OrdenServicioService', ['crear']);
    clienteService.listar.and.returnValue(of([clienteAna, consumidor]));
    equipoService.listarPorCliente.and.returnValue(of([equipo]));
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

  it('oculta consumidor final del select', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.clientesSeleccionables.map(c => c.id)).toEqual([4]);
    expect(component.clientesSeleccionables.some(c => c.consumidorFinal)).toBeFalse();
  }));

  it('no permite equipo sin cliente y carga equipos al seleccionar', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.form.controls.equipoId.disabled).toBeTrue();
    expect(component.equiposState).toBe('idle');

    component.form.controls.clienteId.setValue(4);
    component.onClienteChange();
    tick();

    expect(equipoService.listarPorCliente).toHaveBeenCalledWith(4, true);
    expect(component.equiposState).toBe('ready');
    expect(component.form.controls.equipoId.enabled).toBeTrue();
    expect(component.equipos.length).toBe(1);
  }));

  it('limpia equipo al cambiar de cliente', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.form.controls.clienteId.setValue(4);
    component.onClienteChange();
    tick();
    component.form.controls.equipoId.setValue(9);

    const otro: EquipoResponseDTO = { ...equipo, id: 11, clienteId: 5 };
    equipoService.listarPorCliente.and.returnValue(of([otro]));
    component.form.controls.clienteId.setValue(5);
    component.onClienteChange();
    tick();

    expect(component.form.controls.equipoId.value).toBeNull();
    expect(component.equipos.map(e => e.id)).toEqual([11]);
  }));

  it('crea la orden y navega al detalle', fakeAsync(() => {
    const navigate = spyOn(router, 'navigate');
    fixture.detectChanges();
    tick();
    component.form.controls.clienteId.setValue(4);
    component.onClienteChange();
    tick();
    component.form.controls.equipoId.setValue(9);
    component.form.controls.problemaReportado.setValue('No enciende');
    component.guardar();
    tick();

    expect(ordenService.crear).toHaveBeenCalled();
    const body = ordenService.crear.calls.mostRecent().args[0];
    expect(body.clienteId).toBe(4);
    expect(body.equipoId).toBe(9);
    expect((body as { numero?: string }).numero).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith(['/servicios', 22]);
  }));

  it('muestra error de carga de clientes', fakeAsync(() => {
    clienteService.listar.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    tick();
    expect(component.loadState).toBe('error');
  }));
});
