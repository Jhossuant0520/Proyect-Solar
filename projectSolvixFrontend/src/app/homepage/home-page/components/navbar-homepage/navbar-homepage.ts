import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar-homepage',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar-homepage.html',
  styleUrls: ['./navbar-homepage.scss']
})
export class NavbarHomepage {

  scrolled = false;
  activeSection = 'inicio';
  menuOpen = false;

  indicatorLeft = 0;

  menu = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'steps', label: 'Cómo funciona' },
    { id: 'services', label: 'Servicios' },
    { id: 'about', label: 'Nosotros' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contacto' }
  ];
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  moveIndicator(event: any) {
    this.indicatorLeft = event.target.offsetLeft;
  }

  /* 🔥 SCROLL SUAVE CORREGIDO */
  scrollToSection(event: Event, id: string) {
  event.preventDefault();

  this.activeSection = id;
  this.menuOpen = false;

  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`No se encontró #${id}`);
      return;
    }

    const offset = 100; // altura del navbar

    // ✅ Intenta primero con el scrolling nativo del elemento
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // ✅ Ajuste del offset del navbar (scrollIntoView no soporta offset directo)
    setTimeout(() => {
      window.scrollBy({ top: -offset, behavior: 'smooth' });
    }, 50);

  }, 50);
}

  /* 🔥 SCROLL SPY CORREGIDO */
  @HostListener('window:scroll', [])
  onScroll() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.scrolled = currentScroll > 60;

    const sections = this.menu.map(m => m.id);

    sections.forEach(sec => {
      const el = document.getElementById(sec);
      if (el) {
        const rect = el.getBoundingClientRect();
        const spyOffset = 120;
        if (rect.top <= spyOffset && rect.bottom > spyOffset) {
          this.activeSection = sec;
        }
      }
    });
  }
}