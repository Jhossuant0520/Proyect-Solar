import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolvixProgressFasesComponent } from './solvix-progress-fases';

describe('SolvixProgressFasesComponent', () => {
  let fixture: ComponentFixture<SolvixProgressFasesComponent>;
  let component: SolvixProgressFasesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolvixProgressFasesComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(SolvixProgressFasesComponent);
    component = fixture.componentInstance;
  });

  it('renderiza 5 fases en desktop', () => {
    component.estadoCodigo = 'PENDIENTE_APROBACION';
    component.variant = 'desktop';
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Recepción');
    expect(text).toContain('Diagnóstico');
    expect(text).toContain('Cotización y aprobación');
    expect(text).toContain('Reparación');
    expect(text).toContain('Entrega');
    expect(component.fases.find(f => f.estado === 'actual')?.codigo).toBe('COTIZACION');
  });

  it('en mobile muestra resumen compacto y permite expandir', () => {
    component.estadoCodigo = 'EN_DIAGNOSTICO';
    component.variant = 'mobile';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fase 2 de 5 · Diagnóstico');
    const toggle = fixture.nativeElement.querySelector('.fase-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Recepción');
  });

  it('marca aria-current en la fase actual', () => {
    component.estadoCodigo = 'LISTO';
    component.variant = 'desktop';
    fixture.detectChanges();
    const actual = fixture.nativeElement.querySelector('[aria-current="step"]');
    expect(actual).toBeTruthy();
    expect(actual.textContent).toContain('Entrega');
  });

  it('marca fase cancelada cuando se conoce el origen', () => {
    component.estadoCodigo = 'CANCELADO';
    component.faseAlCancelar = 'REPARACION';
    component.variant = 'desktop';
    fixture.detectChanges();
    expect(component.fases.find(f => f.codigo === 'REPARACION')?.estado).toBe('cancelada');
  });
});
