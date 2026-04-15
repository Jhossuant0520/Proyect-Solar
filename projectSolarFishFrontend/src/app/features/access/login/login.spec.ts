import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';  // 👈 para simular respuestas del backend

// Mocks — objetos falsos que simulan AuthService y Router
const authServiceMock = {
  login: jasmine.createSpy('login'),       // 👈 espía la función login
  guardarToken: jasmine.createSpy('guardarToken') // 👈 espía guardarToken
};

const routerMock = {
  navigate: jasmine.createSpy('navigate') // 👈 espía el navigate
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock }, // 👈 inyecta el mock
        { provide: Router, useValue: routerMock }            // 👈 inyecta el mock
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Limpiar los spies antes de cada prueba
    authServiceMock.login.calls.reset();
    authServiceMock.guardarToken.calls.reset();
    routerMock.navigate.calls.reset();
  });

  // ─────────────────────────────────────────
  // PRUEBA 1 — El componente existe
  // ─────────────────────────────────────────
  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────────────────
  // PRUEBA 2 — Variables inician vacías
  // ─────────────────────────────────────────
  it('debería iniciar con los campos vacíos y sin error', () => {
    expect(component.usuarioLogin).toBe('');
    expect(component.passwordLogin).toBe('');
    expect(component.error).toBe('');
  });

  // ─────────────────────────────────────────
  // PRUEBA 3 — Login exitoso → guarda token y redirige
  // ─────────────────────────────────────────
  it('debería guardar el token y navegar al dashboard si el login es exitoso', () => {
    // ARRANGE — simula que el backend responde con un token
    authServiceMock.login.and.returnValue(of({ token: 'fake-jwt-token' }));

    component.usuarioLogin = 'admin';
    component.passwordLogin = '1234';

    // ACT
    component.login();

    // ASSERT
    expect(authServiceMock.guardarToken).toHaveBeenCalledWith('fake-jwt-token');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.error).toBe(''); // no debe haber error
  });

  // ─────────────────────────────────────────
  // PRUEBA 4 — Login fallido → muestra error
  // ─────────────────────────────────────────
  it('debería mostrar "Credenciales inválidas" si el backend retorna error', () => {
    // ARRANGE — simula que el backend responde con error 401
    authServiceMock.login.and.returnValue(throwError(() => ({ status: 401 })));

    component.usuarioLogin = 'usuario_malo';
    component.passwordLogin = 'clave_mala';

    // ACT
    component.login();

    // ASSERT
    expect(component.error).toBe('Credenciales inválidas');
    expect(routerMock.navigate).not.toHaveBeenCalled(); // NO debe redirigir
    expect(authServiceMock.guardarToken).not.toHaveBeenCalled(); // NO debe guardar token
  });

  // ─────────────────────────────────────────
  // PRUEBA 5 — authService.login es llamado con los datos correctos
  // ─────────────────────────────────────────
  it('debería llamar authService.login con el usuario y contraseña correctos', () => {
    authServiceMock.login.and.returnValue(of({ token: 'token123' }));

    component.usuarioLogin = 'juan';
    component.passwordLogin = 'pass123';

    component.login();

    expect(authServiceMock.login).toHaveBeenCalledWith('juan', 'pass123');
  });

});

