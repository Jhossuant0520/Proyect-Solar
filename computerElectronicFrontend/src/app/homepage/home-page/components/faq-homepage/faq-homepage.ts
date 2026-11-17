import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FaqItem {
  q: string;
  a: string;
}

@Component({
  selector: 'app-faq-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq-homepage.html',
  styleUrl: './faq-homepage.scss'
})
export class FaqHomepage {
  activeIndex: number | null = 0;
  hoverIndex: number | null = null;

  faq: FaqItem[] = [
    {
      q: '¿Cuánto tiempo tarda el diagnóstico de un equipo?',
      a: 'Generalmente, entregamos un diagnóstico completo en un plazo de 24 a 48 horas hábiles. En casos de urgencia corporativa, disponemos de protocolo prioritario.'
    },
    {
      q: '¿Tienen garantía las reparaciones?',
      a: 'Sí, todas nuestras reparaciones y repuestos instalados cuentan con garantía certificada por escrito para tu total tranquilidad.'
    },
    {
      q: '¿Reparan todas las marcas?',
      a: 'Sí, trabajamos con marcas líderes como HP, Lenovo, Dell, Asus, Epson, Canon, entre otras, disponiendo de diagramas esquemáticos y componentes originales.'
    },
    {
      q: '¿Hacen visitas a domicilio para empresas?',
      a: 'Sí, ofrecemos soporte en sitio para empresas, mantenimiento preventivo de parques informáticos, mantenimiento de redes y revisión periódica de cámaras de seguridad.'
    }
  ];

  toggle(index: number): void {
    this.activeIndex = this.activeIndex === index ? null : index;
  }

  setHover(index: number | null): void {
    this.hoverIndex = index;
  }

  isActive(index: number): boolean {
    return this.activeIndex === index;
  }

  isHovered(index: number): boolean {
    return this.hoverIndex === index;
  }
}
