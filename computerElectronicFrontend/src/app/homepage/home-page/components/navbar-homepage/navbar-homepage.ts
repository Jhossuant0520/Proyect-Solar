import { Component, HostListener, OnDestroy, inject } from '@angular/core';
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
export class NavbarHomepage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportScroller);

  scrolled = false;
  activeSection = 'inicio';
  menuOpen = false;

  /** Slot para el PNG oficial. Colocar el archivo en `public/LogoEmpresa1.png`. */
  readonly logoSrc = '/LogoEmpresa1.png';

  /**
   * Enlaces de la barra (orden fijo).
   * CTAs «Solicitar soporte» y «Acceso plataforma» viven en el template.
   * Destinos existentes: fragments inicio/services/about + /Catalogo.
   */
  menu: HomepageNavLink[] = [
    { label: 'Inicio', fragment: 'inicio' },
    { label: 'Servicios', fragment: 'services' },
    { label: 'Catálogo', path: '/Catalogo' },
    { label: 'Nosotros', fragment: 'about' }
  ];

  /** Cancela un scroll diferido pendiente al elegir otro ancla rápidamente. */
  private pendingScrollTimer: ReturnType<typeof setTimeout> | null = null;

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

  ngOnDestroy(): void {
    if (this.pendingScrollTimer !== null) {
      clearTimeout(this.pendingScrollTimer);
      this.pendingScrollTimer = null;
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  goToFragment(event: Event, fragment: string): void {
    event.preventDefault();
    this.activeSection = fragment;
    const wasMenuOpen = this.menuOpen;
    this.menuOpen = false;

    if (this.pendingScrollTimer !== null) {
      clearTimeout(this.pendingScrollTimer);
      this.pendingScrollTimer = null;
    }

    void this.router.navigate(['/'], { fragment }).then(() => {
      // Cerrar menú primero; luego scroll (el colapso cambia la altura del documento).
      const delayMs = wasMenuOpen ? 280 : 0;
      const run = (): void => {
        this.pendingScrollTimer = null;
        this.scrollToFragment(fragment);
      };
      if (delayMs > 0) {
        this.pendingScrollTimer = setTimeout(run, delayMs);
      } else {
        run();
      }
    });
  }

  private scrollToFragment(fragment: string): void {
    const el = document.getElementById(fragment);
    if (!el) {
      this.viewport.scrollToAnchor(fragment);
      return;
    }
    // Respeta scroll-margin-top de home-page.scss (navbar fija).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }

  isActive(item: HomepageNavLink): boolean {
    return !!item.fragment && this.activeSection === item.fragment;
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    const y = this.viewport.getScrollPosition()[1];
    // Flotante al inicio del Hero (~80–120 px); mismo listener, sin IO extra.
    this.scrolled = y > 96;
  }
}
