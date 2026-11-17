import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsHomepage } from './stats-homepage';

describe('StatsHomepage', () => {
  let component: StatsHomepage;
  let fixture: ComponentFixture<StatsHomepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsHomepage]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsHomepage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('conserva el contenido oficial de métricas', () => {
    expect(component.stats).toEqual([
      {
        value: '+20 Años',
        description: 'Experiencia sólida en el mercado informático',
        icon: 'calendar_month'
      },
      {
        value: '+15,000',
        description: 'Equipos reparados y optimizados con éxito',
        icon: 'devices'
      },
      {
        value: '100%',
        description: 'Garantía real en nuestro servicio técnico',
        icon: 'verified'
      },
      {
        value: '24/48 hrs',
        description: 'Tiempo promedio de diagnóstico inicial',
        icon: 'bolt'
      }
    ]);
  });

  it('usa clases semánticas y no utilities de Stitch', () => {
    const root = fixture.nativeElement.querySelector('.stats') as HTMLElement;
    const cards = fixture.nativeElement.querySelectorAll('.stats-card');
    expect(root).toBeTruthy();
    expect(cards.length).toBe(4);
    expect(root.className).not.toContain('bg-surface-container-lowest');
    expect(root.className).not.toContain('py-space-xl');
    expect(root.className).not.toContain('w-full');
  });

  it('inicia el count-up desde 0 con formato comercial', () => {
    expect(component.animatedValues[0]).toBe('+0 Años');
    expect(component.animatedValues[1]).toBe('+0');
    expect(component.animatedValues[2]).toBe('0%');
    expect(component.animatedValues[3]).toBe('0/48 hrs');
  });
});
