import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaqHomepage } from './faq-homepage';

describe('FaqHomepage', () => {
  let component: FaqHomepage;
  let fixture: ComponentFixture<FaqHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqHomepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FaqHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
