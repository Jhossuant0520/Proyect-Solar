import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ServiceItem {
  title: string;
  description: string;
  footer: string;
  variant: 'primary' | 'neon' | 'secondary';
  icon: 'bolt' | 'sun' | 'grid' | 'power';
}

@Component({
  selector: 'app-services-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-homepage.html',
  styleUrls: ['./services-homepage.scss']
})
export class ServicesHomepage {
  servicios: ServiceItem[] = [
    {
      title: 'Consumo energético',
      description: 'Análisis detallado de tu historial para proyectar demanda.',
      footer: 'Precisión del 99%',
      variant: 'primary',
      icon: 'bolt'
    },
    {
      title: 'Análisis solar',
      description: 'Mapeo de radiación solar basado en coordenadas exactas.',
      footer: 'Datos climáticos reales',
      variant: 'neon',
      icon: 'sun'
    },
    {
      title: 'Dimensionamiento',
      description: 'Cálculo exacto del número y tipo de paneles necesarios.',
      footer: 'Máxima eficiencia',
      variant: 'secondary',
      icon: 'grid'
    },
    {
      title: 'Selección de inversor',
      description: 'Recomendación del equipo óptimo para tu instalación.',
      footer: 'Compatibilidad total',
      variant: 'primary',
      icon: 'power'
    }
  ];
}
