import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  SOLVIX_FIRMA_FONDO,
  SOLVIX_FIRMA_TRAZO,
  SolvixSignaturePadComponent
} from './solvix-signature-pad';

describe('SolvixSignaturePadComponent D.7', () => {
  let fixture: ComponentFixture<SolvixSignaturePadComponent>;
  let component: SolvixSignaturePadComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolvixSignaturePadComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(SolvixSignaturePadComponent);
    component = fixture.componentInstance;
    // Dimensiones visibles para initCanvas
    Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 400
    });
    fixture.detectChanges();
  });

  it('usa fondo blanco y trazo negro (no tema)', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    expect(component.colorFondo).toBe('#FFFFFF');
    expect(component.colorTrazo).toBe('#000000');
    expect(SOLVIX_FIRMA_FONDO).toBe('#FFFFFF');
    expect(SOLVIX_FIRMA_TRAZO).toBe('#000000');

    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    const ctx = canvas.getContext('2d');
    const stroke = String(ctx?.strokeStyle ?? '').toLowerCase();
    expect(stroke === '#000000' || stroke === '#000' || stroke === 'rgb(0, 0, 0)').toBeTrue();
  }));

  it('limpia y deja sin firma', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    component.firmado = true;
    component.limpiar();
    expect(component.firmado).toBeFalse();
    expect(component.getFirmaBase64()).toBeNull();
  }));

  it('exporta PNG data URL tras dibujar', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    // Simular trazo
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(40, 40);
    ctx.stroke();
    (component as unknown as { firmado: boolean }).firmado = true;
    (component as unknown as { capturarFirma: () => void }).capturarFirma();
    const data = component.getFirmaBase64();
    expect(data).toBeTruthy();
    expect(data!.startsWith('data:image/png;base64,')).toBeTrue();
  }));

  it('muestra estado Sin firma al iniciar', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin firma');
    expect(component.firmado).toBeFalse();
  }));
});
