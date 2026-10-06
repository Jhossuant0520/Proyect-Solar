import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

@Component({
  selector: 'app-testimonials-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonials-homepage.html',
  styleUrl: './testimonials-homepage.scss'
})
export class TestimonialsHomepage {
  testimonials: Testimonial[] = [
    {
      quote:
        'Llevé mi portátil que no encendía y en Computer & Electronic le salvaron la vida y todos mis datos. El servicio fue rápido y muy profesional.',
      name: 'María F.',
      role: 'Cliente Particular',
      initials: 'MF'
    },
    {
      quote:
        'Nos instalaron el cableado estructurado y las cámaras en la oficina. Excelente trabajo. Llevan años siendo nuestros técnicos de confianza.',
      name: 'Carlos R.',
      role: 'Gerente de Operaciones',
      initials: 'CR'
    },
    {
      quote:
        'Fui por un arreglo de mi impresora y terminé comprando accesorios a muy buen precio. La atención es impecable.',
      name: 'Andrés G.',
      role: 'Usuario Frecuente',
      initials: 'AG'
    }
  ];
}
