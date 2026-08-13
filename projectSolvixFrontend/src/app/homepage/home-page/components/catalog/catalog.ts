import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss'
})
export class Catalog {

  categoriaSeleccionada = 'TODOS';

  equipos = [
    {
      nombre: 'Computador All-in-One HP 24”',
      precio: 1299,
      categoria: 'COMPUTO',
      imagen: 'https://##',
      caracteristicas: [
        'Intel Core i5 12th Gen',
        '8 GB RAM DDR4',
        'SSD 512 GB',
        'Windows 11 Pro'
      ]
    },
    {
      nombre: 'Laptop Lenovo ThinkPad E14',
      precio: 999,
      categoria: 'COMPUTO',
      imagen: 'https://i.ibb.co/KX3W8v7/canon-g3110.png',
      caracteristicas: [
        'AMD Ryzen 5 7530U',
        '16 GB RAM',
        'SSD 1 TB',
        'Pantalla FHD 14”'
      ]
    },
    {
      nombre: 'Impresora Canon G3110',
      precio: 320,
      categoria: 'IMPRESION',
      imagen: 'https://i.ibb.co/KX3W8v7/canon-g3110.png',
      caracteristicas: [
        'Impresión a color',
        'WiFi',
        'Sistema continuo'
      ]
    },
    {
      nombre: 'Kit Panel Solar Portátil 200W',
      precio: 450,
      categoria: 'SOLAR',
      imagen: 'https://i.ibb.co/3N9sZqG/panel.png',
      caracteristicas: [
        'Portátil',
        'Alta eficiencia',
        'Uso exterior'
      ]
    },
    {
      nombre: 'Inversor Solar Inteligente 3KW',
      precio: 780,
      categoria: 'SOLAR',
      imagen: 'https://i.ibb.co/3N9sZqG/panel.png',
      caracteristicas: [
        'Monitoreo inteligente',
        'Alta eficiencia',
        'Instalación fácil'
      ]
    }
  ];

  /* FILTRO */
  get equiposFiltrados() {
    if (this.categoriaSeleccionada === 'TODOS') {
      return this.equipos;
    }
    return this.equipos.filter(e => e.categoria === this.categoriaSeleccionada);
  }

  seleccionarCategoria(cat: string) {
    this.categoriaSeleccionada = cat;
  }

  /* WHATSAPP */
  getWhatsAppLink(equipo: any): string {
    const numero = '573172901206';
    const mensaje = `Hola! Estoy interesado en: *${equipo.nombre}* - Precio: $${equipo.precio}`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  }
}