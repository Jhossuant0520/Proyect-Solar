import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FincaComponent } from './finca';
import { FincaService } from '../../core/services/finca.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser'; // 👈 para buscar en el DOM

// ── MOCKS ──────────────────────────────────────────────────────────────────
const fincaServiceMock = {
  registrarFinca:     jasmine.createSpy('registrarFinca'),
  actualizarFinca:    jasmine.createSpy('actualizarFinca'),
  obtenerFincaPorId:  jasmine.createSpy('obtenerFincaPorId'),
};

const routerMock = {
  navigate: jasmine.createSpy('navigate')
};

const snackBarMock = {
  open: jasmine.createSpy('open')
};

// ActivatedRoute sin parámetros (modo creación)
const activatedRouteMock = {
  snapshot: { paramMap: { get: () => null } }
};

describe('FincaComponent', () => {
  let component: FincaComponent;
  let fixture: ComponentFixture<FincaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FincaComponent, NoopAnimationsModule],
      providers: [
        { provide: FincaService,   useValue: fincaServiceMock },
        { provide: Router,         useValue: routerMock },
        { provide: MatSnackBar,    useValue: snackBarMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FincaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Limpiar spies antes de cada prueba
    fincaServiceMock.registrarFinca.calls.reset();
    fincaServiceMock.actualizarFinca.calls.reset();
    fincaServiceMock.obtenerFincaPorId.calls.reset();
    routerMock.navigate.calls.reset();
    snackBarMock.open.calls.reset();
  });

  // ══════════════════════════════════════════════════════════════════
  //  PRUEBAS UNITARIAS — lógica del .ts
  // ══════════════════════════════════════════════════════════════════

  it('[U-01] debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('[U-02] debería iniciar en modo creación (modoEdicion = false)', () => {
    expect(component.modoEdicion).toBeFalse();
    expect(component.fincaId).toBeUndefined();
  });

  it('[U-03] el formulario debería ser inválido cuando está vacío', () => {
    expect(component.fincaForm.invalid).toBeTrue();
  });

  it('[U-04] el formulario debería ser válido con todos los campos correctos', () => {
    component.fincaForm.setValue({
      nombreFinca:       'Finca El Sol',
      ubicacionFinca:    'Tolima',
      propietarioFinca:  'Carlos Pérez',
      superficieFinca:   2500,
      actividadPrincipal:'Piscicultura'
    });
    expect(component.fincaForm.valid).toBeTrue();
  });

  it('[U-05] superficieFinca debería ser inválida con valor 0', () => {
    component.fincaForm.get('superficieFinca')?.setValue(0);
    expect(component.fincaForm.get('superficieFinca')?.hasError('min')).toBeTrue();
  });

  it('[U-06] no debería llamar registrarFinca si el formulario es inválido', () => {
    component.onSubmit();
    expect(fincaServiceMock.registrarFinca).not.toHaveBeenCalled();
  });

  it('[U-07] debería llamar registrarFinca con los datos del formulario al guardar', () => {
    fincaServiceMock.registrarFinca.and.returnValue(of({}));
    component.fincaForm.setValue({
      nombreFinca: 'Finca El Sol', ubicacionFinca: 'Tolima',
      propietarioFinca: 'Carlos', superficieFinca: 1000, actividadPrincipal: 'Piscicultura'
    });
    component.onSubmit();
    expect(fincaServiceMock.registrarFinca).toHaveBeenCalled();
  });

  it('[U-08] debería resetear el formulario tras registrar exitosamente', () => {
    fincaServiceMock.registrarFinca.and.returnValue(of({}));
    component.fincaForm.setValue({
      nombreFinca: 'F1', ubicacionFinca: 'L1',
      propietarioFinca: 'P1', superficieFinca: 100, actividadPrincipal: 'A1'
    });
    component.onSubmit();
    expect(component.fincaForm.value.nombreFinca).toBeNull();
  });

  it('[U-09] debería mostrar snackbar de error si registrarFinca falla', () => {
    fincaServiceMock.registrarFinca.and.returnValue(throwError(() => new Error('error')));
    component.fincaForm.setValue({
      nombreFinca: 'F1', ubicacionFinca: 'L1',
      propietarioFinca: 'P1', superficieFinca: 100, actividadPrincipal: 'A1'
    });
    component.onSubmit();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      '❌ Error al registrar finca', 'Cerrar', jasmine.any(Object)
    );
  });

  it('[U-10] onCancel en modo creación debería resetear el formulario', () => {
    component.modoEdicion = false;
    component.fincaForm.get('nombreFinca')?.setValue('Test');
    component.onCancel();
    expect(component.fincaForm.value.nombreFinca).toBeNull();
  });

  it('[U-11] onCancel en modo edición debería navegar a /listaFinca', () => {
    component.modoEdicion = true;
    component.onCancel();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/listaFinca']);
  });

  it('[U-12] en modo edición debería llamar actualizarFinca en lugar de registrarFinca', () => {
    fincaServiceMock.actualizarFinca.and.returnValue(of({}));
    component.modoEdicion = true;
    component.fincaId = 5;
    component.fincaForm.setValue({
      nombreFinca: 'F1', ubicacionFinca: 'L1',
      propietarioFinca: 'P1', superficieFinca: 100, actividadPrincipal: 'A1'
    });
    component.onSubmit();
    expect(fincaServiceMock.actualizarFinca).toHaveBeenCalledWith(5, jasmine.any(Object));
    expect(fincaServiceMock.registrarFinca).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════════
  //  PRUEBAS FUNCIONALES — comportamiento desde el DOM/HTML
  // ══════════════════════════════════════════════════════════════════

  it('[F-01] debería mostrar el título "Registro de Finca" en modo creación', () => {
    // Busca el h2 en el DOM compilado
    const h2 = fixture.debugElement.query(By.css('h2'));
    expect(h2.nativeElement.textContent).toContain('Registro de Finca');
  });

  it('[F-02] el botón Guardar debería estar deshabilitado si el formulario es inválido', () => {
    // Busca el botón de tipo submit en el DOM
    const boton = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(boton.nativeElement.disabled).toBeTrue();
  });

  it('[F-03] el botón Guardar debería habilitarse cuando el formulario es válido', () => {
    component.fincaForm.setValue({
      nombreFinca: 'Finca El Sol', ubicacionFinca: 'Tolima',
      propietarioFinca: 'Carlos', superficieFinca: 1000, actividadPrincipal: 'Piscicultura'
    });
    fixture.detectChanges(); // 👈 actualiza el DOM con los nuevos valores
    const boton = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(boton.nativeElement.disabled).toBeFalse();
  });

  it('[F-04] debería mostrar error "El nombre es obligatorio" si el campo está tocado y vacío', () => {
    // Simula que el usuario tocó el campo y lo dejó vacío
    const control = component.fincaForm.get('nombreFinca');
    control?.markAsTouched();
    fixture.detectChanges();
    const error = fixture.debugElement.query(By.css('mat-error'));
    expect(error.nativeElement.textContent).toContain('El nombre es obligatorio');
  });

  it('[F-05] debería mostrar el texto "Guardar" en el botón en modo creación', () => {
    const boton = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(boton.nativeElement.textContent).toContain('Guardar');
  });

  it('[F-06] debería mostrar "Actualizar" en el botón cuando modoEdicion es true', () => {
    component.modoEdicion = true;
    fixture.detectChanges(); // 👈 actualiza el DOM
    const boton = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(boton.nativeElement.textContent).toContain('Actualizar');
  });

  it('[F-07] debería mostrar "Editar Finca" en el título cuando modoEdicion es true', () => {
    component.modoEdicion = true;
    fixture.detectChanges();
    const h2 = fixture.debugElement.query(By.css('h2'));
    expect(h2.nativeElement.textContent).toContain('Editar Finca');
  });

  it('[F-08] al hacer click en Cancelar debería resetear el formulario', () => {
    component.fincaForm.get('nombreFinca')?.setValue('Test');
    const btnCancelar = fixture.debugElement.query(By.css('button[color="warn"]'));
    btnCancelar.nativeElement.click(); // 👈 simula click real en el DOM
    fixture.detectChanges();
    expect(component.fincaForm.value.nombreFinca).toBeNull();
  });

  it('[F-09] escribir en el input nombreFinca debería actualizar el valor del formulario', () => {
    const input = fixture.debugElement.query(By.css('input[formControlName="nombreFinca"]'));
    input.nativeElement.value = 'Finca Nueva';
    input.nativeElement.dispatchEvent(new Event('input')); // 👈 simula escritura
    fixture.detectChanges();
    expect(component.fincaForm.get('nombreFinca')?.value).toBe('Finca Nueva');
  });

  it('[F-10] debería mostrar el ID de la finca cuando modoEdicion es true', () => {
    component.modoEdicion = true;
    component.fincaId = 42;
    fixture.detectChanges();
    const span = fixture.debugElement.query(By.css('.finca-id'));
    expect(span.nativeElement.textContent).toContain('42');
  });

});