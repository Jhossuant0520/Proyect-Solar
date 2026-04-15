import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModulDemandaRecibo } from './modul-demanda-recibo';

describe('ModulDemandaRecibo', () => {
  let component: ModulDemandaRecibo;
  let fixture: ComponentFixture<ModulDemandaRecibo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModulDemandaRecibo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModulDemandaRecibo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
