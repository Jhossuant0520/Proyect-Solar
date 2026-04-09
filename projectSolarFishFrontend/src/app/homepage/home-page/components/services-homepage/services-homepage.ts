import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-services-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-homepage.html',
  styleUrl: './services-homepage.scss'
})
export class ServicesHomepage {

  servicios = [
    {
      titulo: 'Cálculo Inteligente',
      descripcion: 'Obtén en segundos la cantidad exacta de paneles solares para tu hogar.',
      icono: '⚡'
    },
    {
      titulo: 'Ahorro Energético',
      descripcion: 'Reduce tu factura eléctrica con estimaciones reales y personalizadas.',
      icono: '💰'
    },
    {
      titulo: 'Tecnología Avanzada',
      descripcion: 'Simulación basada en datos reales y eficiencia energética moderna.',
      icono: '🧠'
    },
    {
      titulo: 'Resultados Inmediatos',
      descripcion: 'Sin procesos largos ni técnicos, obtén todo en minutos.',
      icono: '⏱️'
    }
  ];

}

