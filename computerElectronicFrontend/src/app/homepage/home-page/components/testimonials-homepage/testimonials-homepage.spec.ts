import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestimonialsHomepage } from './testimonials-homepage';

describe('TestimonialsHomepage', () => {
  let component: TestimonialsHomepage;
  let fixture: ComponentFixture<TestimonialsHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialsHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestimonialsHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
