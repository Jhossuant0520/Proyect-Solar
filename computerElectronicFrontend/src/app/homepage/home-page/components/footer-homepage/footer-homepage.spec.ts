import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FooterHomepage } from './footer-homepage';

describe('FooterHomepage', () => {
  let component: FooterHomepage;
  let fixture: ComponentFixture<FooterHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterHomepage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prepara logo PNG y mantiene currentYear dinámico', () => {
    expect(component.logoSrc).toBe('/LogoEmpresa1.png');
    expect(component.currentYear).toBe(new Date().getFullYear());
    const logo = fixture.nativeElement.querySelector('.footer-homepage__logo') as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('/LogoEmpresa1.png');
  });

  it('expone navegación real sin href="#"', () => {
    const html = fixture.nativeElement.innerHTML as string;
    expect(html).not.toContain('href="#"');
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/Catalogo"]')).toBeTruthy();
  });
});
