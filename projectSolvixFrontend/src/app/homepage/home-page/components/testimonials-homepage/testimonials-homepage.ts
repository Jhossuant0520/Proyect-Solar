import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  photo: string;
  variant: 'primary' | 'neon' | 'secondary';
  highlight?: boolean;
}

@Component({
  selector: 'app-testimonials-homepage',
  imports: [CommonModule],
  templateUrl: './testimonials-homepage.html',
  styleUrl: './testimonials-homepage.scss'
})
export class TestimonialsHomepage {
  testimonials: Testimonial[] = [
    {
      quote: 'Antes de usar SOLVIX, las cotizaciones eran confusas. Esta herramienta me dio la claridad exacta de cuántos paneles necesitaba basándose en mis recibos reales.',
      name: 'Carlos M.',
      role: 'Propietario residencial',
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
      variant: 'primary'
    },
    {
      quote: 'La precisión del cálculo de horas solares para mi ubicación específica hizo que la decisión de inversión fuera mucho más segura. Excelente herramienta.',
      name: 'Elena R.',
      role: 'Negocio comercial',
      photo: 'https://randomuser.me/api/portraits/women/44.jpg',
      variant: 'neon',
      highlight: true
    },
    {
      quote: 'Como instalador, recomiendo a mis clientes que pasen primero por SOLVIX. Simplifica el diseño inicial y genera confianza.',
      name: 'Ing. Roberto G.',
      role: 'Instalador solar',
      photo: 'https://randomuser.me/api/portraits/men/65.jpg',
      variant: 'secondary'
    }
  ];
}
