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
    }).compileComponents();

    fixture = TestBed.createComponent(CtaHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mantiene el WhatsApp real y el headline oficial', () => {
    expect(component.whatsappUrl).toBe('https://wa.me/573172901206');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('¿Necesitas una reparación confiable o tecnología nueva?');
    expect(fixture.nativeElement.querySelector('.cta-homepage')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href*="wa.me/573172901206"]')).toBeTruthy();
  });
});
