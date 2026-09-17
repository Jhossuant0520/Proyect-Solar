import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteEquiposPanelComponent } from './cliente-equipos-panel';
import { EquipoService } from '../../../../core/services/equipo.service';
import { EquipoResponseDTO } from '../../../../core/models/equipo.models';

const equipoActivo: EquipoResponseDTO = {
  id: 9,
  clienteId: 4,
  clienteNombre: 'Ana Ruiz',
  tipoEquipo: 'PORTATIL',
  marca: 'HP',
  modelo: 'LaserJet',
  numeroSerie: 'ABC123',
  nombre: 'Impresora oficina',
  observaciones: null,
  activo: true,
  fechaRegistro: '2026-01-01T10:00:00'
};

describe('ClienteEquiposPanelComponent', () => {
  let fixture: ComponentFixture<ClienteEquiposPanelComponent>;
  let component: ClienteEquiposPanelComponent;
  let equipoService: jasmine.SpyObj<EquipoService>;
  let dialog: MatDialog;

  beforeEach(async () => {
    equipoService = jasmine.createSpyObj('EquipoService', [
      'listar',
      'crear',
      'actualizar',
      'desactivar'
    ]);
    equipoService.listar.and.returnValue(of([equipoActivo]));
    equipoService.crear.and.returnValue(of(equipoActivo));
    equipoService.actualizar.and.returnValue(of(equipoActivo));
    equipoService.desactivar.and.returnValue(of({ ...equipoActivo, activo: false }));

    await TestBed.configureTestingModule({
      imports: [ClienteEquiposPanelComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: EquipoService, useValue: equipoService },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteEquiposPanelComponent);
    component = fixture.componentInstance;
    dialog = TestBed.inject(MatDialog);
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(true)
    } as ReturnType<MatDialog['open']>);
    component.clienteId = 4;
    component.clienteActivo = true;
    component.bloqueado = false;
  });

  it('lista equipos del cliente', fakeAsync(() => {
    fixture.detectChanges();
    component.ngOnChanges({
      clienteId: {
        currentValue: 4,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    tick();
    fixture.detectChanges();

    expect(equipoService.listar).toHaveBeenCalledWith({ clienteId: 4, soloActivos: true });
    expect(component.state).toBe('ready');
    expect(fixture.nativeElement.textContent).toContain('ABC123');
    expect(fixture.nativeElement.textContent).toContain('Activo');
  }));

  it('muestra empty cuando no hay equipos', fakeAsync(() => {
    equipoService.listar.and.returnValue(of([]));
    component.ngOnChanges({
      clienteId: {
        currentValue: 4,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    tick();
    fixture.detectChanges();
    expect(component.state).toBe('empty');
    expect(fixture.nativeElement.textContent).toContain(
      'Este cliente todavía no tiene equipos registrados.'
    );
  }));

  it('muestra error al fallar la carga', fakeAsync(() => {
    equipoService.listar.and.returnValue(throwError(() => new Error('fail')));
    component.ngOnChanges({
      clienteId: {
        currentValue: 4,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    tick();
    fixture.detectChanges();
    expect(component.state).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los equipos.');
  }));

  it('crea equipo con clienteId fijo', fakeAsync(() => {
    component.ngOnChanges({
      clienteId: {
        currentValue: 4,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    tick();
    component.abrirCrear();
    component.form.patchValue({
      tipoEquipo: 'IMPRESORA',
      marca: 'HP',
      modelo: 'M404',
      numeroSerie: 'ABC123',
      nombre: 'Impresora oficina'
    });
    component.guardar();
    tick();

    expect(equipoService.crear).toHaveBeenCalled();
    const body = equipoService.crear.calls.mostRecent().args[0];
    expect(body.clienteId).toBe(4);
    expect(body.tipoEquipo).toBe('IMPRESORA');
    expect(body.numeroSerie).toBe('ABC123');
  }));

  it('edita equipo sin cambiar cliente', fakeAsync(() => {
    component.ngOnChanges({
      clienteId: {
        currentValue: 4,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    tick();
    component.abrirEditar(equipoActivo);
    component.form.controls.nombre.setValue('Alias nuevo');
    component.guardar();
    tick();

    expect(equipoService.actualizar).toHaveBeenCalledWith(
      9,
      jasmine.objectContaining({ clienteId: 4, nombre: 'Alias nuevo' })
    );
  }));

  it('desactiva equipo con soft-delete', fakeAsync(() => {
    component.ngOnChanges({
      clienteId: {
        currentValue: 4,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    tick();
    (component as unknown as { dialog: MatDialog }).dialog = {
      open: () => ({ afterClosed: () => of(true) })
    } as unknown as MatDialog;
    component.desactivar(equipoActivo);
    tick();
    expect(equipoService.desactivar).toHaveBeenCalledWith(9);
  }));
});
