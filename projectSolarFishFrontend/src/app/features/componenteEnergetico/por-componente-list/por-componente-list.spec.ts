import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PorComponenteList } from './por-componente-list';

describe('PorComponenteList', () => {
  let component: PorComponenteList;
  let fixture: ComponentFixture<PorComponenteList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PorComponenteList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PorComponenteList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
