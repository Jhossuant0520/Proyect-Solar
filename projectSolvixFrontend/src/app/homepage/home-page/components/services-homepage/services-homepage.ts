import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ServiceItem {
  title: string;
  description: string;
  badge: string;
  icon: string;
  wide?: boolean;
  tags?: string[];
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
      title: 'Mantenimiento y Reparación',
      description:
        'Especialistas en portátiles, equipos Todo en Uno, computadores de escritorio e impresoras multimarca con diagnóstico micrométrico.',
      badge: 'Especialistas',
      icon: 'build_circle',
      tags: ['Soporte multimarca']
    },
    {
      title: 'Venta de Tecnología',
      description:
        'Computadores de última generación, periféricos, repuestos y accesorios de las mejores marcas para usuarios corporativos y domésticos.',
      badge: 'Equipos Nuevos',
      icon: 'laptop_mac',
      tags: ['Hardware certificado']
    },
    {
      title: 'Seguridad Electrónica',
      description:
        'Suministro, configuración e instalación profesional de cámaras de seguridad CCTV, alarmas de intrusión y sistemas de control de acceso.',
      badge: 'Seguridad 24/7',
      icon: 'security',
      tags: ['Monitoreo en vivo']
    },
    {
      title: 'Redes y Conectividad',
      description:
        'Diseño e implementación de cableado estructurado categoría 6A, organización de racks, switches y redes WiFi de alto tráfico para oficinas y negocios.',
      badge: 'Infraestructura',
      icon: 'hub',
      tags: ['Cableado certificado']
    },
    {
      title: 'Centro de Impresión y Digitalización',
      description:
        'Servicios rápidos de fotocopiado e impresión de alta calidad. Asistencia en digitalización, escaneo de alta fidelidad y soluciones para documentos comerciales o personales.',
      badge: 'Soluciones para Oficinas y Particulares',
      icon: 'scanner',
      wide: true,
      tags: ['Láser & Color', 'Entrega Inmediata']
    }
  ];
}
