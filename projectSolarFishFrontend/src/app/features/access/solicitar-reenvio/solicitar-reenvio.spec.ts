import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolicitarReenvio } from './solicitar-reenvio';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { UserService } from '../../core/services/user.service';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('SolicitarReenvio Component', () => {

  let component: SolicitarReenvio;
  let fixture: ComponentFixture<SolicitarReenvio>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  beforeEach(async () => {

    const spy = jasmine.createSpyObj('UserService', ['reenviarVerificacion']);

    await TestBed.configureTestingModule({
      imports: [
        SolicitarReenvio,
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: UserService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitarReenvio);
    component = fixture.componentInstance;
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;

    fixture.detectChanges();
  });

  // ✅ 1. Creación
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ✅ 2. Formulario inválido al inicio
  it('should have invalid form initially', () => {
    expect(component.form.invalid).toBeTrue();
  });

  // ✅ 3. Validación email requerido
  it('should mark email as required', () => {
    const emailControl = component.form.get('email');
    emailControl?.setValue('');
    expect(emailControl?.valid).toBeFalse();
  });

  // ✅ 4. Validación email formato incorrecto
  it('should validate email format', () => {
    const emailControl = component.form.get('email');
    emailControl?.setValue('correo-invalido');
    expect(emailControl?.valid).toBeFalse();
  });

  // ✅ 5. Formulario válido
  it('should be valid with correct email', () => {
    component.form.setValue({
      email: 'test@test.com'
    });

    expect(component.form.valid).toBeTrue();
  });

  // ✅ 6. No debe llamar servicio si el form es inválido
  it('should not call service if form is invalid', () => {
    component.onSubmit();
    expect(userServiceSpy.reenviarVerificacion).not.toHaveBeenCalled();
  });

  // ✅ 7. Envío exitoso
  it('should set enviado=true on success', () => {
    userServiceSpy.reenviarVerificacion.and.returnValue(of({}));

    component.form.setValue({
      email: 'test@test.com'
    });

    component.onSubmit();

    expect(userServiceSpy.reenviarVerificacion).toHaveBeenCalledWith('test@test.com');
    expect(component.enviado).toBeTrue();
    expect(component.cargando).toBeFalse();
  });

  // ✅ 8. Manejo de error con "mensaje"
  it('should handle error with mensaje property', () => {
    userServiceSpy.reenviarVerificacion.and.returnValue(
      throwError(() => ({ error: { mensaje: 'Error backend' } }))
    );

    component.form.setValue({
      email: 'test@test.com'
    });

    component.onSubmit();

    expect(component.errorMensaje).toBe('Error backend');
    expect(component.cargando).toBeFalse();
  });

  // ✅ 9. Manejo de error con "message"
  it('should handle error with message property', () => {
    userServiceSpy.reenviarVerificacion.and.returnValue(
      throwError(() => ({ error: { message: 'Error message' } }))
    );

    component.form.setValue({
      email: 'test@test.com'
    });

    component.onSubmit();

    expect(component.errorMensaje).toBe('Error message');
  });

  // ✅ 10. Error genérico
  it('should handle unknown error', () => {
    userServiceSpy.reenviarVerificacion.and.returnValue(
      throwError(() => ({ error: {} }))
    );

    component.form.setValue({
      email: 'test@test.com'
    });

    component.onSubmit();

    expect(component.errorMensaje).toBe('Error al enviar. Intenta nuevamente.');
  });

});