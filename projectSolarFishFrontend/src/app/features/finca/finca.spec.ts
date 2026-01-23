import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Finca } from './finca';

describe('Finca', () => {
  let component: Finca;
  let fixture: ComponentFixture<Finca>;

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
