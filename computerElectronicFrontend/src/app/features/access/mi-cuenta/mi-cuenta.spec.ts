import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { CuentaService } from '../../../core/services/cuenta.service';
import { AuthService } from '../../../core/services/auth.service';
import { MiCuenta } from './mi-cuenta';

describe('MiCuenta', () => {
  let component: MiCuenta;
  let fixture: ComponentFixture<MiCuenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiCuenta],
      providers: [
        {
          provide: CuentaService,
          useValue: {
            fotoUrl: signal<string | null>(null),
            getMisDatos: () => of({
              nombreUsuario: 'demo',
              email: 'demo@solvix.test',
              fechaCreacion: '01/01/2026 00:00',
              ultimoLogin: 'Nunca',
              fotoUrl: null
            }),
            actualizarFotoVisible: () => undefined
          }
        },
        {
          provide: AuthService,
          useValue: {
            obtenerNombreUsuario: () => 'demo',
            esAdmin: () => false
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MiCuenta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
