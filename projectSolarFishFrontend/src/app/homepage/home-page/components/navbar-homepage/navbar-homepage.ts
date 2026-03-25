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
    { id: 'como', label: 'Cómo funciona' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'faq', label: 'FAQ' }
  ];

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  setActive(id: string) {
    this.activeSection = id;
  }

  moveIndicator(event: any) {
    this.indicatorLeft = event.target.offsetLeft;
  }

  /* SCROLL SPY + SUAVE */
  @HostListener('window:scroll', [])
  onScroll() {
    this.scrolled = window.scrollY > 60;

    const sections = this.menu.map(m => m.id);

    sections.forEach(sec => {
      const el = document.getElementById(sec);
      if (el) {
        const top = el.offsetTop - 100;
        const height = el.offsetHeight;

        if (window.scrollY >= top && window.scrollY < top + height) {
          this.activeSection = sec;
        }
      }
    });
  }
}