import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';

/** D.7 — apariencia profesional de firma (PNG autosuficiente). */
export const SOLVIX_FIRMA_FONDO = '#FFFFFF';
export const SOLVIX_FIRMA_TRAZO = '#000000';

/**
 * Lienzo de firma manuscrita reutilizable (recepción / entrega).
 * Fondo blanco sólido + trazo negro; PNG exportado sin depender de CSS/tema.
 */
@Component({
  selector: 'solvix-signature-pad',
  standalone: true,
  template: `
    <div class="firma-wrap">
      <canvas #firmaCanvas class="firma-canvas" [attr.aria-label]="ariaLabel"></canvas>
    </div>
    <div class="firma-bar">
      <span class="firma-status" [class.ok]="firmado">
        {{ firmado ? 'Firma capturada' : 'Sin firma' }}
      </span>
      <button type="button" class="limpiar" (click)="limpiar()">Limpiar</button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .firma-wrap {
        border-radius: 10px;
        border: 1px solid color-mix(in srgb, var(--color-border, #94a3b8) 70%, transparent);
        background: ${SOLVIX_FIRMA_FONDO};
        overflow: hidden;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
      }
      .firma-canvas {
        display: block;
        width: 100%;
        height: 200px;
        touch-action: none;
        cursor: crosshair;
        user-select: none;
        background: ${SOLVIX_FIRMA_FONDO};
      }
      .firma-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-top: 0.45rem;
        flex-wrap: wrap;
      }
      .firma-status {
        font-size: 0.82rem;
        color: var(--color-text-muted, var(--solvix-text-muted));
      }
      .firma-status.ok {
        color: var(--color-success, var(--solvix-success));
      }
      .limpiar {
        min-height: var(--solvix-touch-min, 44px);
        border-radius: 8px;
        border: 1px solid var(--color-border, var(--solvix-border));
        background: transparent;
        color: var(--color-text-primary, var(--solvix-text));
        padding: 0.35rem 0.8rem;
        font: inherit;
        cursor: pointer;
      }
      .limpiar:hover {
        border-color: var(--color-primary, var(--solvix-primary));
      }
      @media (max-width: 767px) {
        .firma-canvas {
          height: 220px;
        }
      }
    `
  ]
})
export class SolvixSignaturePadComponent implements AfterViewInit, OnDestroy {
  @ViewChild('firmaCanvas') firmaCanvas?: ElementRef<HTMLCanvasElement>;
  @Output() readonly firmadoChange = new EventEmitter<boolean>();
  @Output() readonly firmaBase64Change = new EventEmitter<string | null>();

  ariaLabel = 'Área de firma del cliente';
  firmado = false;

  /** Expuestos para tests D.7. */
  readonly colorFondo = SOLVIX_FIRMA_FONDO;
  readonly colorTrazo = SOLVIX_FIRMA_TRAZO;

  private dibujando = false;
  private ctx: CanvasRenderingContext2D | null = null;
  private firmaBase64: string | null = null;
  private pointerIds = new Set<number>();

  ngAfterViewInit(): void {
    queueMicrotask(() => this.initCanvas());
  }

  ngOnDestroy(): void {
    this.detachPointer();
  }

  /** Data URL PNG o null. */
  getFirmaBase64(): string | null {
    return this.firmaBase64;
  }

  limpiar(): void {
    if (!this.ctx || !this.firmaCanvas) {
      return;
    }
    const canvas = this.firmaCanvas.nativeElement;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.restore();
    this.pintarFondo();
    this.setFirmado(false, null);
  }

  private initCanvas(): void {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    this.detachPointer();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(280, Math.floor(canvas.clientWidth || 480));
    const height = this.alturaFirma();
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;

    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(ratio, ratio);
    this.ctx.strokeStyle = SOLVIX_FIRMA_TRAZO;
    this.ctx.lineWidth = 2.25;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.setFirmado(false, null);
    this.pintarFondo();
    this.attachPointer(canvas);
  }

  private pintarFondo(): void {
    if (!this.ctx || !this.firmaCanvas) {
      return;
    }
    const canvas = this.firmaCanvas.nativeElement;
    const w = canvas.clientWidth || 480;
    const h = this.alturaFirma();
    this.ctx.fillStyle = SOLVIX_FIRMA_FONDO;
    this.ctx.fillRect(0, 0, w, h);
  }

  private alturaFirma(): number {
    return window.matchMedia('(max-width: 767px)').matches ? 220 : 200;
  }

  private attachPointer(canvas: HTMLCanvasElement): void {
    const pos = (e: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = (canvas.clientWidth || rect.width) / rect.width;
      const scaleY = (canvas.clientHeight || rect.height) / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    canvas.onpointerdown = e => {
      e.preventDefault();
      if (!this.ctx) {
        return;
      }
      this.dibujando = true;
      this.pointerIds.add(e.pointerId);
      const p = pos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    canvas.onpointermove = e => {
      if (!this.dibujando || !this.ctx || !this.pointerIds.has(e.pointerId)) {
        return;
      }
      e.preventDefault();
      const p = pos(e);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
      if (!this.firmado) {
        this.setFirmado(true, null);
      }
    };

    const end = (e: PointerEvent) => {
      if (!this.pointerIds.has(e.pointerId)) {
        return;
      }
      this.pointerIds.delete(e.pointerId);
      this.dibujando = this.pointerIds.size > 0;
      if (this.firmado) {
        this.capturarFirma();
      }
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    canvas.onpointerup = end;
    canvas.onpointercancel = end;
  }

  /**
   * Exporta PNG con fondo blanco real (no transparente) composando sobre
   * un lienzo auxiliar — no depende de CSS ni del tema de la UI.
   */
  private capturarFirma(): void {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas || !this.firmado) {
      this.setFirmado(false, null);
      return;
    }
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ex = exportCanvas.getContext('2d');
    if (!ex) {
      this.setFirmado(true, canvas.toDataURL('image/png'));
      return;
    }
    ex.fillStyle = SOLVIX_FIRMA_FONDO;
    ex.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ex.drawImage(canvas, 0, 0);
    this.setFirmado(true, exportCanvas.toDataURL('image/png'));
  }

  private setFirmado(ok: boolean, base64: string | null): void {
    this.firmado = ok;
    this.firmaBase64 = base64;
    this.firmadoChange.emit(ok);
    this.firmaBase64Change.emit(base64);
  }

  private detachPointer(): void {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    canvas.onpointerdown = null;
    canvas.onpointermove = null;
    canvas.onpointerup = null;
    canvas.onpointercancel = null;
    this.pointerIds.clear();
    this.dibujando = false;
  }
}
