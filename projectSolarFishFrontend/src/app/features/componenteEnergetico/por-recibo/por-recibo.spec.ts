import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PorRecibo } from './por-recibo';

describe('PorRecibo', () => {
  let component: PorRecibo;
  let fixture: ComponentFixture<PorRecibo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PorRecibo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PorRecibo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
