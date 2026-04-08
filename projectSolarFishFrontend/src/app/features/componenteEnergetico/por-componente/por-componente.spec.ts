import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PorComponenteForm } from './por-componente';

describe('PorComponenteForm', () => {
  let component: PorComponenteForm;
  let fixture: ComponentFixture<PorComponenteForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PorComponente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PorComponente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
