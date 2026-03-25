import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // 🔥 IMPORTANTE

@Component({
  selector: 'app-hero-homepage',
  standalone: true,
  imports: [FormsModule, CommonModule], // 🔥 AQUÍ
  templateUrl: './hero-homepage.html',
  styleUrls: ['./hero-homepage.scss']
})
export class HeroHomepage {

  consumo: number = 300;
  ciudad: string = 'media';

  paneles: number = 0;
  ahorro: number = 0;
  potencia: number = 0;
  roi: number = 0;

  calcular() {
    let factor = 1;

    if (this.ciudad === 'alta') factor = 1.2;
    if (this.ciudad === 'baja') factor = 0.8;

    this.paneles = Math.round((this.consumo / 40) * factor);
    this.potencia = Number((this.paneles * 0.4).toFixed(1));
    this.ahorro = this.paneles * 200000;
    this.roi = Number((5 / factor).toFixed(1));
  }
}