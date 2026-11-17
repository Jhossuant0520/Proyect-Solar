import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesHomepage } from './services-homepage';

describe('ServicesHomepage', () => {
  let component: ServicesHomepage;
  let fixture: ComponentFixture<ServicesHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServicesHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
