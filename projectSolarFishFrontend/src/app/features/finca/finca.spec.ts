import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FincaComponent } from './finca';

describe('FincaComponent', () => {
  let component: FincaComponent;
  let fixture: ComponentFixture<FincaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Finca]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Finca);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
