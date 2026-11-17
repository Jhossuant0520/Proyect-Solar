import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

import { AboutHomepage } from './about-homepage';

describe('AboutHomepage', () => {
  let component: AboutHomepage;
  let fixture: ComponentFixture<AboutHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutHomepage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AboutHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('presenta Computer & Electronic sin contenido solar de SOLVIX', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Computer & Electronic');
    expect(text).toContain('Servicio técnico');
    expect(text).not.toContain('energía solar');
    expect(text).not.toContain('SOLVIX');
  });

  it('enlaza el CTA principal al fragmento contact', () => {
    const contact = fixture.debugElement
      .queryAll(By.css('.ce-about__btn--primary'))
      .map(el => el.nativeElement as HTMLAnchorElement)[0];
    expect(contact).toBeTruthy();
    expect(contact.getAttribute('href')).toContain('/#contact');
  });
});
