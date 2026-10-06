import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeroHomepage } from './hero-homepage';

describe('HeroHomepage', () => {
  let component: HeroHomepage;
  let fixture: ComponentFixture<HeroHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroHomepage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HeroHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('destaca tecnología en azul limpio sin franja amarilla', () => {
    const title = fixture.nativeElement.querySelector('.hero__title') as HTMLElement;
    const highlight = fixture.nativeElement.querySelector('.hero__title-highlight') as HTMLElement;
    expect(title.textContent).toContain('Expertos en devolverle la vida a tu');
    expect(highlight.textContent?.trim()).toBe('tecnología.');
    expect(highlight.querySelector('*')).toBeNull();
  });

  it('elimina Protocolo ISO-9001 ready del panel', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('ISO-9001');
    expect(text).toContain('Atención presencial activa');
  });

  it('expone los cuatro indicadores del panel sin clases Stitch masivas', () => {
    const items = fixture.nativeElement.querySelectorAll('.hero-panel__item');
    expect(items.length).toBe(4);
    const section = fixture.nativeElement.querySelector('.hero') as HTMLElement;
    expect(section.className).not.toContain('bg-surface-container');
    expect(section.className).not.toContain('py-space-xl');
  });

  it('mantiene botones sin underline y con destinos Angular', () => {
    const primary = fixture.nativeElement.querySelector('.hero__btn--primary') as HTMLAnchorElement;
    const secondary = fixture.nativeElement.querySelector('.hero__btn--secondary') as HTMLAnchorElement;
    expect(primary.className).not.toContain('underline');
    expect(secondary.className).not.toContain('underline');
    expect(primary.getAttribute('href')).toBe('/Catalogo');
    expect(secondary.getAttribute('href')).toContain('/#contact');
  });
});
