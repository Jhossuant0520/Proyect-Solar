import { Component } from '@angular/core';

@Component({
  selector: 'app-services-homepage',
  imports: [],
  templateUrl: './services-homepage.html',
  styleUrl: './services-homepage.scss'
})
export class ServicesHomepage {

  // 🔥 EFECTO LUZ DINÁMICA (NO AFECTA RUTAS)
  onMouseMove(event: MouseEvent) {
  const card = event.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  card.style.setProperty('--x', `${x}px`);
  card.style.setProperty('--y', `${y}px`);
}

}