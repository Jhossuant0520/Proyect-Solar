import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsHomepage } from './steps-homepage';

describe('StepsHomepage', () => {
  let component: StepsHomepage;
  let fixture: ComponentFixture<StepsHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepsHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
