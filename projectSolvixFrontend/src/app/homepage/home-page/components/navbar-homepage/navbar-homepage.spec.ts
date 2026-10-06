import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

import { NavbarHomepage } from './navbar-homepage';

describe('NavbarHomepage', () => {
  let component: NavbarHomepage;
  let fixture: ComponentFixture<NavbarHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarHomepage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prepara el logo para el PNG oficial y no usa el SVG generado', () => {
    const logo = fixture.nativeElement.querySelector('.ce-nav__logo') as HTMLImageElement;
    expect(component.logoSrc).toBe('/LogoEmpresa1.png');
    expect(logo.getAttribute('src')).toBe('/LogoEmpresa1.png');
    expect(logo.getAttribute('alt')).toContain('Computer');
  });

  it('no deja subrayado permanente en los enlaces de navegación', () => {
    const links: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.ce-nav__link'));
    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => {
      expect(link.className).not.toContain('underline');
      expect(link.className).not.toContain('border-b-2');
    });
  });

  it('envía Solicitar soporte al fragmento contact', () => {
    const support = fixture.debugElement.queryAll(By.css('.ce-nav__cta--primary'))
      .map(el => el.nativeElement as HTMLAnchorElement)
      .find(el => el.textContent?.includes('Solicitar soporte'));
    expect(support).toBeTruthy();
    expect(support?.getAttribute('href')).toContain('/#contact');
  });

  it('muestra Portal de clientes hacia /login y no un icono de usuario aislado', () => {
    const portal = fixture.nativeElement.querySelector('.ce-nav__cta--secondary') as HTMLAnchorElement;
    expect(portal.textContent).toContain('Portal de clientes');
    expect(portal.getAttribute('href')).toBe('/login');
    expect(fixture.nativeElement.querySelector('[aria-label="Iniciar sesión"]')).toBeNull();
  });

  it('abre y cierra el menú móvil con menuOpen', () => {
    expect(component.menuOpen).toBeFalse();
    component.toggleMenu();
    fixture.detectChanges();
    expect(component.menuOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('.ce-nav__toggle').getAttribute('aria-expanded')).toBe('true');
  });
});
