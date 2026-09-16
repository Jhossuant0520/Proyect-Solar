import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicioDetailComponent } from './servicio-detail';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { OrdenServicioResponseDTO } from '../../../../core/models/orden-servicio.models';

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

describe('ServicioDetailComponent — diagnóstico y trabajo', () => {
  let fixture: ComponentFixture<ServicioDetailComponent>;
  let component: ServicioDetailComponent;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let router: Router;

  beforeEach(async () => {
    ordenService = jasmine.createSpyObj('OrdenServicioService', [
      'obtenerPorId',
      'actualizar',
      'cambiarEstado'
    ]);
    ordenService.obtenerPorId.and.returnValue(of(ordenBase()));
    ordenService.actualizar.and.returnValue(
      of(ordenBase({ diagnostico: 'Fuente dañada', problemaReportado: 'No enciende' }))
    );
    ordenService.cambiarEstado.and.returnValue(of(ordenBase({ estado: 'EN_DIAGNOSTICO' })));

    await TestBed.configureTestingModule({
      imports: [ServicioDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '12' } } }
        },
        { provide: OrdenServicioService, useValue: ordenService },
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
    expect(text).toContain('Qué indicó el cliente al entregar el equipo.');
    expect(text).toContain('Qué encontró el técnico al revisar el equipo.');
    expect(text).toContain('Qué trabajo o reparación se realizó.');
    expect(text).toContain('Información adicional importante sobre la orden.');
    expect(text).toContain('No enciende');
    expect(text).toContain('Urgente');
  }));

  it('inicializa el formulario con los valores de la orden', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.form.controls.problemaReportado.value).toBe('No enciende');
    expect(component.form.controls.diagnostico.value).toBe('');
    expect(component.form.controls.trabajoRealizado.value).toBe('');
    expect(component.form.controls.observaciones.value).toBe('Urgente');
  }));

  it('destaca problema reportado en RECEPCIONADO', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.campoDestacado).toBe('problemaReportado');
    const destacado = fixture.nativeElement.querySelector(
      '.campo-tecnico.is-destacado[data-campo="problemaReportado"]'
    );
    expect(destacado).toBeTruthy();
  }));

  it('permite editar y guardar textos sin cambiar cliente/equipo/estado', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    expect(component.editando).toBeTrue();
    component.form.controls.diagnostico.setValue('Fuente dañada');
    expect(component.hayCambiosTextos).toBeTrue();
    component.guardarTextos();
    tick();

    expect(ordenService.actualizar).toHaveBeenCalled();
    const [id, body] = ordenService.actualizar.calls.mostRecent().args;
    expect(id).toBe(12);
    expect(body.clienteId).toBe(4);
    expect(body.equipoId).toBe(9);
    expect(body.diagnostico).toBe('Fuente dañada');
    expect(component.editando).toBeFalse();
    expect(component.orden?.estado).toBe('RECEPCIONADO');
    expect(component.orden?.clienteId).toBe(4);
    expect(component.orden?.equipoId).toBe(9);
  }));

  it('cancela la edición y restaura valores', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    component.form.controls.diagnostico.setValue('Borrador');
    component.cancelarEdicion();
    expect(component.editando).toBeFalse();
    expect(component.form.controls.diagnostico.value).toBe('');
    expect(ordenService.actualizar).not.toHaveBeenCalled();
  }));

  it('no envía PUT si no hubo cambios', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    expect(component.hayCambiosTextos).toBeFalse();
    component.guardarTextos();
    tick();
    expect(ordenService.actualizar).not.toHaveBeenCalled();
    expect(component.editando).toBeFalse();
  }));

  it('modo lectura en CERRADO', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'CERRADO', fechaCierre: '2026-03-10T12:00:00' }))
    );
    fixture.detectChanges();
    tick();
    expect(component.puedeEditar(component.orden!.estado)).toBeFalse();
    expect(component.esResumenCompleto).toBeTrue();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('solo lectura');
    expect(text).not.toContain('Editar información');
    component.iniciarEdicion();
    expect(component.editando).toBeFalse();
  }));

  it('modo lectura en CANCELADO', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'CANCELADO' })));
    fixture.detectChanges();
    tick();
    expect(component.puedeEditar(component.orden!.estado)).toBeFalse();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('solo lectura');
    expect(fixture.nativeElement.querySelector('button.btn-tech-secondary')).toBeFalsy();
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
    expect(component.editando).toBeTrue();
  }));

  it('cambia estado con POST separado del formulario técnico', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.cambiarEstado('EN_DIAGNOSTICO');
    tick();
    expect(ordenService.cambiarEstado).toHaveBeenCalledWith(12, { estado: 'EN_DIAGNOSTICO' });
    expect(ordenService.actualizar).not.toHaveBeenCalled();
  }));

  it('vuelve al listado', () => {
    const navigate = spyOn(router, 'navigate');
    component.volver();
    expect(navigate).toHaveBeenCalledWith(['/servicios']);
  });
});
