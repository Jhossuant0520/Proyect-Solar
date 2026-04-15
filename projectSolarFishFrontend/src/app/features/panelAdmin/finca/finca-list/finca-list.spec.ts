import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FincaList } from './finca-list';

describe('FincaList', () => {
  let component: FincaList;
  let fixture: ComponentFixture<FincaList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FincaList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FincaList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
