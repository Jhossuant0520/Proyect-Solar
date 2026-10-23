import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

const authServiceMock = {
  login: jasmine.createSpy('login'),
  guardarToken: jasmine.createSpy('guardarToken')
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();

    authServiceMock.login.calls.reset();
    authServiceMock.guardarToken.calls.reset();
    navigateSpy.calls.reset();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería iniciar con los campos vacíos y sin error', () => {
    expect(component.usuarioLogin).toBe('');
    expect(component.passwordLogin).toBe('');
    expect(component.error).toBe('');
  });

  it('debería guardar el token y navegar al dashboard si el login es exitoso', () => {
    authServiceMock.login.and.returnValue(of({ token: 'fake-jwt-token' }));

    component.usuarioLogin = 'admin';
    component.passwordLogin = '1234';
    component.login();

    expect(authServiceMock.guardarToken).toHaveBeenCalledWith('fake-jwt-token');
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(component.error).toBe('');
  });

  it('debería mostrar "Credenciales inválidas" si el backend retorna error', () => {
    authServiceMock.login.and.returnValue(throwError(() => ({ status: 401 })));

    component.usuarioLogin = 'usuario_malo';
    component.passwordLogin = 'clave_mala';
    component.login();

    expect(component.error).toBe('Credenciales inválidas');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(authServiceMock.guardarToken).not.toHaveBeenCalled();
  });

  it('debería llamar authService.login con el usuario y contraseña correctos', () => {
    authServiceMock.login.and.returnValue(of({ token: 'token123' }));

    component.usuarioLogin = 'juan';
    component.passwordLogin = 'pass123';
    component.login();

    expect(authServiceMock.login).toHaveBeenCalledWith('juan', 'pass123');
  });
});
