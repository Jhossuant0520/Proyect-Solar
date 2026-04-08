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
      a: 'Para darte el pronóstico más preciso y el cálculo de ahorro para tu hogar exacto. No compartimos tu ubicación con terceros.',
      icon: 'assets/icons/map.png'
    },
    {
      q: '¿Es realmente gratis?',
      a: 'Sí, completamente gratis para hogares colombianos. No hay costos ocultos ni suscripciones.',
      icon: 'assets/icons/money.png'
    },
    {
      q: '¿Qué tan preciso es el cálculo?',
      a: 'Utilizamos datos reales de irradiación solar y consumo energético para ofrecer resultados confiables y cercanos a la realidad.',
      icon: 'assets/icons/chart.png'
    },
    {
      q: '¿Mis datos están seguros?',
      a: 'Sí. Usamos autenticación segura, cifrado y tu información nunca se comparte.',
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