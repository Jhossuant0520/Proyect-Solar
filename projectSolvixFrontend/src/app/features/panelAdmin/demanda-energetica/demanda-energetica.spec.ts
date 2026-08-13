import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemandaEnergetica } from './demanda-energetica';

describe('DemandaEnergeticaComponent', () => {
  let component: DemandaEnergetica;
  let fixture: ComponentFixture<DemandaEnergetica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemandaEnergetica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemandaEnergetica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
