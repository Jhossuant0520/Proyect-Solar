import { Component, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

export interface AboutFocusItem {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-about-homepage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about-homepage.html',
  styleUrls: ['./about-homepage.scss']
})
export class AboutHomepage {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportScroller);

  /**
   * Enfoque derivado de las capacidades ya publicadas en Servicios / Hero / Footer.
   * Sin cifras, años, ubicaciones ni certificaciones nuevas.
   */
  readonly focuses: AboutFocusItem[] = [
    {
      title: 'Servicio técnico',
      description:
        'Mantenimiento y reparación de portátiles, equipos Todo en Uno, computadores de escritorio e impresoras, con diagnóstico en nuestras instalaciones.',
      icon: 'build_circle'
    },
    {
      title: 'Tecnología y catálogo',
      description:
        'Venta de equipos, periféricos, repuestos y accesorios. Puedes explorar lo disponible en nuestro catálogo de productos.',
      icon: 'laptop_mac'
    },
    {
      title: 'Seguridad y redes',
      description:
        'Cámaras CCTV, alarmas, control de acceso, cableado estructurado y conectividad para hogares y entornos de trabajo.',
      icon: 'security'
    }
  ];

  goToContact(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/'], { fragment: 'contact' }).then(() => {
      const el = document.getElementById('contact');
      if (!el) {
        this.viewport.scrollToAnchor('contact');
        return;
      }
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({
        block: 'start',
        behavior: reduceMotion ? 'instant' : 'smooth'
      });
    });
  }
}
