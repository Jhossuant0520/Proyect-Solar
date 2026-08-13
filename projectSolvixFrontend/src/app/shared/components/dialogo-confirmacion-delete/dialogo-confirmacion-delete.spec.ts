import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoConfirmacionDelete } from './dialogo-confirmacion-delete';

describe('DialogoConfirmacionDelete', () => {
  let component: DialogoConfirmacionDelete;
  let fixture: ComponentFixture<DialogoConfirmacionDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogoConfirmacionDelete]
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
