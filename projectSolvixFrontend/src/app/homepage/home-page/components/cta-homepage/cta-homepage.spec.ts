import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CtaHomepage } from './cta-homepage';

describe('CtaHomepage', () => {
  let component: CtaHomepage;
  let fixture: ComponentFixture<CtaHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CtaHomepage],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CtaHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
