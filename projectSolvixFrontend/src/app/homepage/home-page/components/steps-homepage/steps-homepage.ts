import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StepItem {
  number: string;
  title: string;
  description: string;
  icon: string;
  note: string;
  noteIcon: string;
}

@Component({
  selector: 'app-steps-homepage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './steps-homepage.html',
  styleUrl: './steps-homepage.scss'
})
export class StepsHomepage {
  steps: StepItem[] = [
    {
      number: '01',
      title: 'Trae tu equipo.',
      description:
        'Visítanos en nuestras instalaciones con tu computador, portátil o impresora. Nuestro equipo te recibirá y tomará nota detallada del problema.',
      icon: 'storefront',
      note: 'Recepción formal con orden',
      noteIcon: 'receipt_long'
    },
    {
      number: '02',
      title: 'Diagnóstico y Cotización.',
      description:
        'Nuestros técnicos revisarán el equipo a fondo y te entregaremos un diagnóstico preciso junto con un presupuesto transparente antes de cualquier arreglo.',
      icon: 'biotech',
      note: 'Cero cobros sorpresa',
      noteIcon: 'price_check'
    },
    {
      number: '03',
      title: 'Reparación y Entrega.',
      description:
        'Con tu aprobación, realizamos el mantenimiento o reparación con repuestos de calidad, dejándolo listo y probado para que pases a recogerlo.',
      icon: 'task_alt',
      note: 'Garantía por escrito',
      noteIcon: 'verified'
    }
  ];
}
