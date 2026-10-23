import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DialogoConfirmacionDelete } from './dialogo-confirmacion-delete';

describe('DialogoConfirmacionDelete', () => {
  let component: DialogoConfirmacionDelete;
  let fixture: ComponentFixture<DialogoConfirmacionDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoConfirmacionDelete],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { mensaje: '¿Eliminar este registro?' } },
        { provide: MatDialogRef, useValue: { close: () => undefined } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogoConfirmacionDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
