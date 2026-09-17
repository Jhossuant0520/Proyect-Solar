import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicioDetailComponent } from './servicio-detail';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import {
  HistorialEstadoOrdenServicioResponseDTO,
  OrdenServicioResponseDTO,
  TransicionOrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';

function ordenBase(parcial: Partial<OrdenServicioResponseDTO> = {}): OrdenServicioResponseDTO {
  return {
    id: 12,
    numero: 'OS-2026-000012',
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
    observaciones: 'Urgente',
    fechaRecepcion: '2026-03-01T10:00:00',
    fechaActualizacion: '2026-03-01T10:00:00',
    fechaCierre: null,
    createdBy: 'admin',
    ...parcial
  };
}

function transicion(
  orden: OrdenServicioResponseDTO,
  parcial: Partial<TransicionOrdenServicioResponseDTO> = {}
): TransicionOrdenServicioResponseDTO {
  return {
    orden,
    estadoAnterior: 'RECEPCIONADO',
    estadoNuevo: orden.estado,
    motivo: '',
    observacion: null,
    usuario: 'admin',
    fechaCambio: '2026-03-01T11:00:00',
    mensaje: 'OK',
    ...parcial
  };
}

describe('ServicioDetailComponent — workflow', () => {
  let fixture: ComponentFixture<ServicioDetailComponent>;
  let component: ServicioDetailComponent;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;

  beforeEach(async () => {
    ordenService = jasmine.createSpyObj('OrdenServicioService', [
      'obtenerPorId',
      'actualizar',
      'cambiarEstado',
      'completarDiagnostico',
      'completarReparacion',
      'registrarNuevaFalla',
      'listarHistorial',
      'listarRepuestos'
    ]);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    ordenService.obtenerPorId.and.returnValue(of(ordenBase()));
    ordenService.listarHistorial.and.returnValue(of([]));
    ordenService.listarRepuestos.and.returnValue(of([]));
    ordenService.actualizar.and.returnValue(
      of(ordenBase({ diagnostico: 'Fuente dañada', problemaReportado: 'No enciende' }))
    );
    ordenService.cambiarEstado.and.returnValue(
      of(transicion(ordenBase({ estado: 'EN_DIAGNOSTICO' })))
    );
    ordenService.completarDiagnostico.and.returnValue(
      of(
        transicion(ordenBase({ estado: 'DIAGNOSTICADO', diagnostico: 'Fuente dañada' }), {
          estadoAnterior: 'EN_DIAGNOSTICO',
          estadoNuevo: 'DIAGNOSTICADO'
        })
      )
    );
    ordenService.completarReparacion.and.returnValue(
      of(
        transicion(ordenBase({ estado: 'LISTO', trabajoRealizado: 'Cambio de fuente' }), {
          estadoAnterior: 'EN_REPARACION',
          estadoNuevo: 'LISTO'
        })
      )
    );
    ordenService.registrarNuevaFalla.and.returnValue(
      of(
        transicion(ordenBase({ estado: 'REQUIERE_APROBACION_ADICIONAL' }), {
          estadoAnterior: 'EN_REPARACION',
          estadoNuevo: 'REQUIERE_APROBACION_ADICIONAL'
        })
      )
    );

    await TestBed.configureTestingModule({
      imports: [ServicioDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '12' } } }
        },
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('muestra los cuatro campos técnicos con hints', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Problema reportado');
    expect(text).toContain('Diagnóstico');
    expect(text).toContain('Trabajo realizado');
    expect(text).toContain('Observaciones');
    expect(text).toContain('No enciende');
  }));

  it('RECEPCIONADO: Iniciar diagnóstico llama cambiarEstado sin motivo y sin bloqueo de error', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal?.boton).toBe('Iniciar diagnóstico');
    expect(component.estadoError).toBe('');
    expect(component.guiaTecnica).toBe('');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Iniciar diagnóstico');
    expect(text).not.toContain('bloqueo');

    component.ejecutarAccionPrincipal();
    tick();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(ordenService.cambiarEstado).toHaveBeenCalledWith(12, {
      nuevoEstado: 'EN_DIAGNOSTICO'
    });
    expect(ordenService.cambiarEstado).not.toHaveBeenCalledWith(
      12,
      jasmine.objectContaining({ motivo: jasmine.anything() })
    );
  }));

  it('no abre modal de motivo genérico al iniciar diagnóstico', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.ejecutarAccionPrincipal();
    tick();
    expect(dialog.open).not.toHaveBeenCalled();
  }));

  it('EN_DIAGNOSTICO: Guardar diagnóstico llama completarDiagnostico', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'EN_DIAGNOSTICO', diagnostico: null }))
    );
    fixture.detectChanges();
    tick();

    expect(component.accionPrincipal?.boton).toBe('Ir al diagnóstico');
    expect(component.accionPrincipal?.destino).toBe('DIAGNOSTICADO');

    component.iniciarEdicion();
    component.form.controls.diagnostico.setValue('Fuente dañada');
    component.guardarTextos();
    tick();

    expect(ordenService.completarDiagnostico).toHaveBeenCalledWith(12, {
      problemaReportado: 'No enciende',
      diagnostico: 'Fuente dañada',
      observaciones: 'Urgente'
    });
    expect(ordenService.cambiarEstado).not.toHaveBeenCalled();
    expect(component.orden?.estado).toBe('DIAGNOSTICADO');
  }));

  it('tras iniciar diagnóstico enfoca la guía de ficha técnica', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.ejecutarAccionPrincipal();
    tick();
    flushMicrotasks();
    expect(component.orden?.estado).toBe('EN_DIAGNOSTICO');
    expect(component.editando).toBeTrue();
    expect(component.guiaTecnica).toContain('diagnóstico');
  }));

  it('COTIZADO muestra contexto de aprobación', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'COTIZADO' })));
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('pendiente de aprobación');
    expect(text).toContain('Cotización inicial');
    expect(component.accionPrincipal?.destino).toBe('APROBADO');
  }));

  it('Marcar listo sin trabajo realizado muestra guía técnica', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'EN_REPARACION', trabajoRealizado: null }))
    );
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal?.boton).toBe('Marcar como listo');

    component.ejecutarAccionPrincipal();
    tick();

    expect(ordenService.completarReparacion).not.toHaveBeenCalled();
    expect(component.editando).toBeTrue();
    expect(component.guiaTecnica).toContain('trabajo realizado');
  }));

  it('EN_REPARACION muestra botón de nueva falla', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'EN_REPARACION' })));
    fixture.detectChanges();
    tick();
    expect(component.accionFalla?.destino).toBe('REQUIERE_APROBACION_ADICIONAL');
    expect(component.accionFalla?.boton).toBe('Registrar nueva falla');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Registrar nueva falla');
  }));

  it('muestra timeline de historial', fakeAsync(() => {
    const hist: HistorialEstadoOrdenServicioResponseDTO[] = [
      {
        id: 1,
        ordenServicioId: 12,
        estadoAnterior: 'RECEPCIONADO',
        estadoNuevo: 'EN_DIAGNOSTICO',
        motivo: 'Inicio',
        observacion: null,
        usuario: 'admin',
        fechaCambio: '2026-03-01T11:00:00'
      }
    ];
    ordenService.listarHistorial.and.returnValue(of(hist));
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Historial de la orden');
    expect(text).toContain('Inicio');
    expect(text).toContain('admin');
    expect(ordenService.listarHistorial).toHaveBeenCalledWith(12);
  }));

  it('permite editar y guardar textos fuera de diagnóstico', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    component.form.controls.diagnostico.setValue('Fuente dañada');
    component.guardarTextos();
    tick();
    expect(ordenService.actualizar).toHaveBeenCalled();
    expect(ordenService.completarDiagnostico).not.toHaveBeenCalled();
  }));

  it('modo lectura en CERRADO', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'CERRADO', fechaCierre: '2026-03-10T12:00:00' }))
    );
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal).toBeNull();
    expect(component.puedeEditar(component.orden!.estado)).toBeFalse();
  }));

  it('muestra error humano al fallar el guardado', fakeAsync(() => {
    ordenService.actualizar.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'No se puede editar una orden CERRADO.' }
          })
      )
    );
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    component.form.controls.diagnostico.setValue('Nuevo');
    component.guardarTextos();
    tick();
    expect(component.editError).toContain('cerrada o cancelada');
  }));

  it('vuelve al listado', () => {
    const navigate = spyOn(router, 'navigate');
    component.volver();
    expect(navigate).toHaveBeenCalledWith(['/servicios']);
  });
});
