import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DialogoConfirmacionDelete, DialogoConfirmacionData } from './dialogo-confirmacion-delete';

describe('DialogoConfirmacionDelete', () => {
  let component: DialogoConfirmacionDelete;
  let fixture: ComponentFixture<DialogoConfirmacionDelete>;
  let mockData: DialogoConfirmacionData;

  beforeEach(async () => {
    mockData = { mensaje: '¿Eliminar este registro?' };

    await TestBed.configureTestingModule({
      imports: [DialogoConfirmacionDelete],
      providers: [
        { provide: MAT_DIALOG_DATA, useFactory: () => mockData },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogoConfirmacionDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.esDanger).toBeTrue();
    expect(component.icono).toBe('delete');
  });

  it('identifica acción de completar con icono positivo y estilo primary', () => {
    component.data = { mensaje: '¿Completar esta venta? El inventario se descuenta ahora.' };
    fixture.detectChanges();

    expect(component.esDanger).toBeFalse();
    expect(component.esWarning).toBeFalse();
    expect(component.tipo).toBe('primary');
    expect(component.icono).toBe('check_circle');
    expect(component.confirmText).toBe('Completar');
    expect(component.kicker).toBe('Confirmar operación');
  });

  it('identifica acción de cancelar con estilo warning', () => {
    component.data = { mensaje: '¿Cancelar esta venta pendiente?' };
    fixture.detectChanges();

    expect(component.esWarning).toBeTrue();
    expect(component.tipo).toBe('warning');
    expect(component.icono).toBe('cancel');
    expect(component.confirmText).toBe('Sí, cancelar');
  });

  it('respeta parámetros explícitos provistos', () => {
    component.data = {
      titulo: '¿Completar compra ahora?',
      kicker: 'Ingreso a bodega',
      mensaje: '¿Deseas dar ingreso al inventario?',
      icono: 'inventory_2',
      confirmText: 'Ingresar productos',
      cancelText: 'Volver atrás',
      tipo: 'primary'
    };
    fixture.detectChanges();

    expect(component.titulo).toBe('¿Completar compra ahora?');
    expect(component.kicker).toBe('Ingreso a bodega');
    expect(component.icono).toBe('inventory_2');
    expect(component.confirmText).toBe('Ingresar productos');
    expect(component.cancelText).toBe('Volver atrás');
    expect(component.confirmRank).toBe('primary');
  });
});
