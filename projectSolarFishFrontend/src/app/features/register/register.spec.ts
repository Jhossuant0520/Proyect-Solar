import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Register } from './register';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { UserService } from '../../core/services/user.service';
import { of, throwError } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

describe('Register Component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  beforeEach(async () => {

    const spy = jasmine.createSpyObj('UserService', ['registrar']);

    await TestBed.configureTestingModule({
      imports: [
        Register,
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: UserService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;

    fixture.detectChanges();
  });

  // ✅ 1. Creación del componente
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ✅ 2. Formulario inválido inicialmente
  it('should have invalid form initially', () => {
    expect(component.form.invalid).toBeTrue();
  });

  // ✅ 3. Validación: passwords no coinciden
  it('should mark error when passwords do not match', () => {
    component.form.setValue({
      nombreUsuario: 'testuser',
      email: 'test@test.com',
      passwordUsuario: '12345678',
      confirmarPassword: '12345679'
    });

    expect(component.form.errors?.['passwordsMismatch']).toBeTrue();
  });

  // ✅ 4. Validación: formulario válido
  it('should be valid when all fields are correct', () => {
    component.form.setValue({
      nombreUsuario: 'testuser',
      email: 'test@test.com',
      passwordUsuario: '12345678',
      confirmarPassword: '12345678'
    });

    expect(component.form.valid).toBeTrue();
  });

  // ✅ 5. No debe enviar si el formulario es inválido
  it('should not call service if form is invalid', () => {
    component.onSubmit();
    expect(userServiceSpy.registrar).not.toHaveBeenCalled();
  });

  // ✅ 6. Envío exitoso
  it('should set registroExitoso to true on success', () => {
    userServiceSpy.registrar.and.returnValue(of({}));

    component.form.setValue({
      nombreUsuario: 'testuser',
      email: 'test@test.com',
      passwordUsuario: '12345678',
      confirmarPassword: '12345678'
    });

    component.onSubmit();

    expect(userServiceSpy.registrar).toHaveBeenCalled();
    expect(component.registroExitoso).toBeTrue();
    expect(component.cargando).toBeFalse();
  });

  // ✅ 7. Manejo de error tipo string
  it('should handle string error response', () => {
    userServiceSpy.registrar.and.returnValue(
      throwError(() => ({ error: 'Error simple' }))
    );

    component.form.setValue({
      nombreUsuario: 'testuser',
      email: 'test@test.com',
      passwordUsuario: '12345678',
      confirmarPassword: '12345678'
    });

    component.onSubmit();

    expect(component.errorMensaje).toBe('Error simple');
    expect(component.cargando).toBeFalse();
  });

  // ✅ 8. Manejo de error con message
  it('should handle error with message property', () => {
    userServiceSpy.registrar.and.returnValue(
      throwError(() => ({ error: { message: 'Mensaje de error' } }))
    );

    component.form.setValue({
      nombreUsuario: 'testuser',
      email: 'test@test.com',
      passwordUsuario: '12345678',
      confirmarPassword: '12345678'
    });

    component.onSubmit();

    expect(component.errorMensaje).toBe('Mensaje de error');
  });

  // ✅ 9. Getter emailValue
  it('should return email value correctly', () => {
    component.form.get('email')?.setValue('correo@test.com');
    expect(component.emailValue).toBe('correo@test.com');
  });

});