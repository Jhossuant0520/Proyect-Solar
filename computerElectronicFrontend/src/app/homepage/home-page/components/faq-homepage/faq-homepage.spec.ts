import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaqHomepage } from './faq-homepage';

describe('FaqHomepage', () => {
  let component: FaqHomepage;
  let fixture: ComponentFixture<FaqHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqHomepage]
    }).compileComponents();

    fixture = TestBed.createComponent(FaqHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa acordeón con activeIndex y toggle', () => {
    expect(component.activeIndex).toBe(0);
    component.toggle(0);
    expect(component.activeIndex).toBeNull();
    component.toggle(2);
    expect(component.activeIndex).toBe(2);
  });

  it('expone aria-expanded y no usa fondos Stitch masivos en el root', () => {
    const root = fixture.nativeElement.querySelector('.faq') as HTMLElement;
    const trigger = fixture.nativeElement.querySelector('.faq-item__trigger') as HTMLButtonElement;
    expect(root.className).not.toContain('bg-surface-container-low');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(getComputedStyle(trigger).backgroundColor).not.toBe('rgb(128, 128, 128)');
  });

  it('conserva las preguntas oficiales', () => {
    expect(component.faq.length).toBe(4);
    expect(component.faq[0].q).toContain('diagnóstico');
  });
});
