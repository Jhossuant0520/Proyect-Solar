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
  equipos = [
    {
      nombre: 'Computador All-in-One HP 24”',
      precio: 1299,
      imagen: 'https://www.pcware.com.co/wp-content/uploads/2019/09/HP-20-C408LA_2.jpg',
      destacado: true,
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
      imagen: 'https://i.ibb.co/KX3W8v7/canon-g3110.png',
      caracteristicas: [
        'AMD Ryzen 5 7530U',
        '16 GB RAM',
        'SSD 1 TB',
        'Pantalla FHD 14”'
      ]
    },
    {
      nombre: 'Impresora Multifuncional Canon G3110',
      precio: 320,
      imagen: 'https://i.ibb.co/KX3W8v7/canon-g3110.png',
      caracteristicas: [
        'Impresión a color',
        'Escáner y copiado',
        'Conectividad WiFi',
        'Sistema de tinta continua'
      ]
    },
    {
      nombre: 'Impresora Multifuncional Canon G3110',
      precio: 320,
      imagen: 'https://i.ibb.co/KX3W8v7/canon-g3110.png',
      caracteristicas: [
        'Impresión a color',
        'Escáner y copiado',
        'Conectividad WiFi',
        'Sistema de tinta continua'
      ]
    },
    {
      nombre: 'Impresora Multifuncional Canon G3110',
      precio: 320,
      imagen: 'https://i.ibb.co/KX3W8v7/canon-g3110.png',
      caracteristicas: [
        'Impresión a color',
        'Escáner y copiado',
        'Conectividad WiFi',
        'Sistema de tinta continua'
      ]
    }
  ];

  getWhatsAppLink(equipo: any): string {
    const numero = '573172901206'; // Tu número de WhatsApp
    const mensaje = `Hola! Estoy interesado en: *${equipo.nombre}* - Precio: $${equipo.precio}`;
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    return `https://wa.me/${numero}?text=${mensajeCodificado}`;
  }
}
