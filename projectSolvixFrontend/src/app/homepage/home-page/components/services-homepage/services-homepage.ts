import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { prefersReducedMotion } from '../../../../shared/utils/count-up';

export interface ServiceItem {
  title: string;
  description: string;
  badge: string;
  icon: string;
  wide?: boolean;
  tags?: string[];
}

@Component({
  selector: 'app-services-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-homepage.html',
  styleUrls: ['./services-homepage.scss']
})
export class ServicesHomepage implements OnDestroy {
  @ViewChild('servicesSection', { static: true })
  private readonly servicesSection!: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  /** Solo true si IO está disponible y se habilitó motion (contenido visible por defecto). */
  motionEnabled = false;
  revealed = false;

  private observer: IntersectionObserver | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterNextRender(() => {
      this.setupReveal();
    });
  }

  servicios: ServiceItem[] = [
    {
      title: 'Mantenimiento y Reparación',
      description:
        'Especialistas en portátiles, equipos Todo en Uno, computadores de escritorio e impresoras multimarca con diagnóstico micrométrico.',
      badge: 'Especialistas',
      icon: 'build_circle',
      tags: ['Soporte multimarca']
    },
    {
      title: 'Venta de Tecnología',
      description:
        'Computadores de última generación, periféricos, repuestos y accesorios de las mejores marcas para usuarios corporativos y domésticos.',
      badge: 'Equipos Nuevos',
      icon: 'laptop_mac',
      tags: ['Hardware certificado']
    },
    {
      title: 'Seguridad Electrónica',
      description:
        'Suministro, configuración e instalación profesional de cámaras de seguridad CCTV, alarmas de intrusión y sistemas de control de acceso.',
      badge: 'Seguridad 24/7',
      icon: 'security',
      tags: ['Monitoreo en vivo']
    },
    {
      title: 'Redes y Conectividad',
      description:
        'Diseño e implementación de cableado estructurado categoría 6A, organización de racks, switches y redes WiFi de alto tráfico para oficinas y negocios.',
      badge: 'Infraestructura',
      icon: 'hub',
      tags: ['Cableado certificado']
    },
    {
      title: 'Centro de Impresión y Digitalización',
      description:
        'Servicios rápidos de fotocopiado e impresión de alta calidad. Asistencia en digitalización, escaneo de alta fidelidad y soluciones para documentos comerciales o personales.',
      badge: 'Soluciones para Oficinas y Particulares',
      icon: 'scanner',
      wide: true,
      tags: ['Láser & Color', 'Entrega Inmediata']
    }
  ];

  ngOnDestroy(): void {
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  private setupReveal(): void {
    if (this.motionEnabled || this.revealed) {
      return;
    }
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const el = this.servicesSection?.nativeElement;
    if (!el) {
      return;
    }

    try {
      this.observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting) || this.revealed) {
            return;
          }
          this.zone.run(() => this.markRevealed());
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );
      this.motionEnabled = true;
      // Evitar detectChanges() en AfterViewInit (NG0100 en dev).
      this.cdr.markForCheck();
      this.observer.observe(el);
      this.safetyTimer = setTimeout(() => {
        if (this.motionEnabled && !this.revealed) {
          this.zone.run(() => this.failOpen());
        }
      }, 8000);
    } catch {
      this.disconnectObserver();
    }
  }

  private markRevealed(): void {
    if (this.revealed) {
      return;
    }
    this.revealed = true;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  private failOpen(): void {
    this.motionEnabled = false;
    this.revealed = false;
    this.cdr.markForCheck();
    this.clearSafetyTimer();
    this.disconnectObserver();
  }

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
