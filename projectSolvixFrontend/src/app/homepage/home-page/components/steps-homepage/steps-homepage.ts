import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StepItem {
  number: string;
  title: string;
  description: string;
  variant: 'primary' | 'neon' | 'secondary' | 'filled';
}

@Component({
  selector: 'app-steps-homepage',
  imports: [CommonModule],
  templateUrl: './steps-homepage.html',
  styleUrl: './steps-homepage.scss'
})
export class StepsHomepage {
  steps: StepItem[] = [
    {
      number: '01',
      title: 'Cuéntanos tu consumo',
      description: 'Ingresa tus datos reales de energía.',
      variant: 'primary'
    },
    {
      number: '02',
      title: 'Indica tu ubicación',
      description: 'Para calcular la radiación solar.',
      variant: 'neon'
    },
    {
      number: '03',
      title: 'Analizamos el recurso solar',
      description: 'Algoritmos avanzados en acción.',
      variant: 'secondary'
    },
    {
      number: '04',
      title: 'Descubre tu sistema',
      description: 'Resultados precisos y listos.',
      variant: 'filled'
    }
  ];
}
