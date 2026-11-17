import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CuentaService } from '../../core/services/cuenta.service';
import { AdminRecordSearchService } from '../../core/services/admin-record-search.service';
import { AdminLayoutComponent } from './admin-layout';
import { AdminTopbarComponent } from './admin-topbar';

describe('Admin topbar search stacking', () => {
  let layoutFixture: ComponentFixture<AdminLayoutComponent>;
  let topbar: AdminTopbarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            estaAutenticado: () => true,
            esAdmin: () => true,
            obtenerNombreUsuario: () => 'Admin',
            cerrarSesion: () => undefined
          }
        },
        {
          provide: CuentaService,
          useValue: {
            getMisDatos: () => of(null),
            fotoUrl: signal(null),
            actualizarFotoVisible: () => undefined
          }
        },
        {
          provide: AdminRecordSearchService,
          useValue: {
            search: () =>
              of({
                groups: [
                  {
                    kind: 'cliente',
                    label: 'Clientes',
                    icon: 'group',
                    hits: [
                      {
                        kind: 'cliente',
                        group: 'Clientes',
                        id: 9,
                        title: 'Cliente Demo',
                        meta: 'CC 123',
                        path: '/clientes/9',
                        icon: 'group'
                      }
                    ]
                  }
                ],
                total: 1,
                hasError: false
              })
          }
        }
      ]
    }).compileComponents();

    layoutFixture = TestBed.createComponent(AdminLayoutComponent);
    layoutFixture.detectChanges();
    topbar = layoutFixture.debugElement.query(
      de => de.componentInstance instanceof AdminTopbarComponent
    )?.componentInstance;
  });

  it('el topbar queda por encima del contenido principal (causa del solapamiento)', () => {
    const root = layoutFixture.nativeElement as HTMLElement;
    const bar = root.querySelector('.admin-topbar') as HTMLElement;
    const content = root.querySelector('.admin-shell__content') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(content).toBeTruthy();

    const zBar = Number.parseInt(getComputedStyle(bar).zIndex, 10);
    const zContent = Number.parseInt(getComputedStyle(content).zIndex, 10);
    expect(zBar).toBeGreaterThan(zContent);
  });

  it('el dropdown opaco queda anclado y acepta puntero', () => {
    expect(topbar).toBeTruthy();
    topbar.query = 'cli';
    topbar.open = true;
    topbar.groups = [
      {
        kind: 'cliente',
        label: 'Clientes',
        icon: 'group',
        hits: [
          {
            kind: 'cliente',
            group: 'Clientes',
            id: 9,
            title: 'Cliente Demo',
            meta: 'CC 123',
            path: '/clientes/9',
            icon: 'group'
          }
        ]
      }
    ];
    topbar.flatHits = topbar.groups[0].hits;
    topbar.activeIndex = 0;
    layoutFixture.detectChanges();

    const panel = layoutFixture.nativeElement.querySelector('.admin-topbar__results') as HTMLElement;
    expect(panel).toBeTruthy();
    const style = getComputedStyle(panel);
    expect(style.position).toBe('absolute');
    expect(style.pointerEvents).not.toBe('none');
    // Fondo sólido (no transparent / not empty)
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(style.backgroundColor).not.toBe('transparent');
  });
});
