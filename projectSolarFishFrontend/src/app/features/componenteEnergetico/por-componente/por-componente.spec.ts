import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PorComponente } from './por-componente';

describe('PorComponente', () => {
  let component: PorComponente;
  let fixture: ComponentFixture<PorComponente>;

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
