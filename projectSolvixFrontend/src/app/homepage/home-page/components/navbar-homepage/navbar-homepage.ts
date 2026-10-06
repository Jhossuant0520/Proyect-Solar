import { Component, HostListener, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

export interface HomepageNavLink {
  label: string;
  fragment?: string;
  path?: string;
}

@Component({
  selector: 'app-navbar-homepage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar-homepage.html',
  styleUrls: ['./navbar-homepage.scss']
})
export class NavbarHomepage {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportScroller);

  scrolled = false;
  activeSection = 'inicio';
  menuOpen = false;

  /** Slot para el PNG oficial. Colocar el archivo en `public/LogoEmpresa1.png`. */
  readonly logoSrc = '/LogoEmpresa1.png';

  menu: HomepageNavLink[] = [
    { label: 'Inicio', fragment: 'inicio' },
    { label: 'Servicios', fragment: 'services' },
    { label: 'Catálogo de Equipos', path: '/Catalogo' },
    { label: 'Sobre Nosotros', fragment: 'about' },
    { label: 'Testimonios', fragment: 'testimonials' },
    { label: 'FAQ', fragment: 'faq' }
  ];

  constructor() {
    this.viewport.setOffset([0, 100]);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const fragment = this.router.parseUrl(this.router.url).fragment;
        if (fragment) {
          this.activeSection = fragment;
        }
        this.menuOpen = false;
      });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  goToFragment(event: Event, fragment: string): void {
    event.preventDefault();
    this.activeSection = fragment;
    this.menuOpen = false;
    void this.router.navigate(['/'], { fragment }).then(() => {
      this.viewport.scrollToAnchor(fragment);
    });
  }

  isActive(item: HomepageNavLink): boolean {
    return !!item.fragment && this.activeSection === item.fragment;
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    const position = this.viewport.getScrollPosition();
    this.scrolled = position[1] > 60;
  }
}
