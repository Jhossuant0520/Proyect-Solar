import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero-homepage',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './hero-homepage.html',
  styleUrls: ['./hero-homepage.scss']
})
export class HeroHomepage implements OnInit {
  // Configuración del Usuario (Sintonía)
  consumoSintonizado: number = 400; // Valor inicial
  regionIdx: number = 0; // Índice de la región seleccionada

  // Regiones de Colombia y su potencial solar
  regiones = [
    { name: 'Andina (Media)', factor: 1.0, kwhPrice: 820 },
    { name: 'Caribe (Alta)', factor: 1.3, kwhPrice: 880 },
    { name: 'Pacífica (Baja)', factor: 0.85, kwhPrice: 790 },
    { name: 'Orinoquía (Media-Alta)', factor: 1.15, kwhPrice: 840 }
  ];

  // Resultados (Proyecciones de IA)
  proyeccionPaneles: number = 0;
  proyeccionPotencia: number = 0;
  proyeccionAhorro: number = 0;
  proyeccionRoi: number = 0;

  ngOnInit() {
    this.sintonizarPoder();
  }

  // Método principal que se ejecuta al cambiar cualquier input
  sintonizarPoder() {
    const region = this.regiones[this.regionIdx];
    
    // Lógica técnica simplificada pero reactiva
    this.proyeccionPaneles = Math.ceil((this.consumoSintonizado / (30 * 4.2)) / 0.55 * region.factor);
    this.proyeccionPotencia = Number((this.proyeccionPaneles * 0.55).toFixed(2));
    this.proyeccionAhorro = Math.round(this.consumoSintonizado * region.kwhPrice);
    
    // Costo estimado del sistema / Ahorro anual
    const costoEstimado = this.proyeccionPotencia * 4300000; // 4.3M COP por kWp
    this.proyeccionRoi = Number((costoEstimado / (this.proyeccionAhorro * 12)).toFixed(1));
  }

  // Método para cambiar de región rápidamente
  setRegion(index: number) {
    this.regionIdx = index;
    this.sintonizarPoder();
  }
}