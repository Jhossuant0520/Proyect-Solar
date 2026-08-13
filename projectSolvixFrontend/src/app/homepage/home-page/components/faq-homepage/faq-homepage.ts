import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-faq-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq-homepage.html',
  styleUrl: './faq-homepage.scss'
})
export class FaqHomepage {

  // 🔥 Estado del acordeón (solo uno abierto)
  activeIndex: number | null = 0;

  // 🔥 Hover dinámico (para efectos visuales en SCSS)
  hoverIndex: number | null = null;

  // 🚀 DATA estructurada (más profesional)
  faq = [
    {
      q: '¿Por qué necesitan mi ubicación?',
      a: 'Para conocer las horas sol pico exactas de tu región. Sin este dato, el cálculo sería genérico y poco confiable. Tu ubicación solo se usa para el cálculo y nunca se comparte con terceros.',
      icon: 'assets/icons/map.png'
    },
    {
      q: '¿Es realmente gratis?',
      a: 'Sí, completamente. Solvix es una herramienta gratuita para hogares colombianos. No hay costos ocultos ni suscripciones.',
      icon: 'assets/icons/money.png'
    },
    {
      q: '¿Qué tan preciso es el cálculo?',
      a: 'El algoritmo utiliza tu consumo real en kWh, las horas sol pico de tu municipio (datos de PVGIS/NASA), la eficiencia del panel seleccionado y los factores de pérdida del sistema. Los resultados son una estimación técnicamente sólida, equivalente a la que haría un profesional del sector.',
      icon: 'assets/icons/chart.png'
    },
    {
      q: '¿Mis datos están seguros?',
      a: 'Sí. Usamos autenticación con verificación por correo y JWT para proteger tu sesión. Tu información de consumo y ubicación no se comparte con nadie y es solo tuya.',
      icon: 'assets/icons/security.png'
    }
  ];

  // 🔁 Toggle inteligente
  toggle(index: number): void {
    this.activeIndex = this.activeIndex === index ? null : index;
  }

  // ✨ Hover (para glow dinámico)
  setHover(index: number | null): void {
    this.hoverIndex = index;
  }

  // 🎯 Helpers (más limpio para HTML)
  isActive(index: number): boolean {
    return this.activeIndex === index;
  }

  isHovered(index: number): boolean {
    return this.hoverIndex === index;
  }

}