import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ViewportScroller } from '@angular/common';

@Component({
  selector: 'app-navbar-homepage',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar-homepage.html',
  styleUrls: ['./navbar-homepage.scss']
})
export class NavbarHomepage implements OnInit, AfterViewInit, OnDestroy {
  menuOpen = false;
  isScrolled = false;
  activeSection = 'inicio';

  constructor(
    private router: Router,
    private renderer: Renderer2,
    private viewportScroller: ViewportScroller
  ) {}

  ngOnInit(): void {
    // Componente inicializado
  }

  ngAfterViewInit(): void {
    // Se ejecuta después de que Angular haya pintado el DOM
    setTimeout(() => {
      this.updateActiveSection();
    }, 50);
  }

  ngOnDestroy(): void {
    // Limpiar clases del body al destruir el componente
    this.renderer.removeClass(document.body, 'menu-open');
  }

  /**
   * Toggle del menú móvil
   */
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;

    if (this.menuOpen) {
      this.renderer.addClass(document.body, 'menu-open');
    } else {
      this.renderer.removeClass(document.body, 'menu-open');
    }
  }

  /**
   * Cerrar menú móvil
   */
  closeMenu(): void {
    this.menuOpen = false;
    this.renderer.removeClass(document.body, 'menu-open');
  }

  /**
   * Scroll suave a una sección
   */
  scrollToSection(sectionId: string): void {
    this.closeMenu();
    this.activeSection = sectionId;

    // Pequeño delay para permitir cierre de menú y reflow
    setTimeout(() => {
      const element = document.getElementById(sectionId) as HTMLElement | null;

      if (!element) {
        // Intento alternativo: buscar por clase
        const alternativeElement = this.findElementByAlternative(sectionId);
        if (alternativeElement) {
          this.performScrollAngular(alternativeElement);
        }
        return;
      }

      this.performScrollAngular(element);
    }, this.menuOpen ? 300 : 50);
  }

  /**
   * Realizar scroll suave detectando el contenedor scrolleable correcto
   */
  private performScrollAngular(element: HTMLElement): void {
    const offset = 80; // Altura del navbar
    const scrollParent = this.getScrollableParent(element);

    if (scrollParent === document) {
      // Scroll en window/document
      const rect = element.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const target = Math.max(Math.round(absoluteTop - offset), 0);

      window.scrollTo({ 
        top: target, 
        behavior: 'smooth' 
      });
      return;
    }

    // Scroll en contenedor con overflow
    const parent = scrollParent as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const relativeTop = (elementRect.top - parentRect.top) + parent.scrollTop;
    const target = Math.max(Math.round(relativeTop - offset), 0);

    parent.scrollTo({ 
      top: target, 
      behavior: 'smooth' 
    });
  }

  /**
   * Buscar el primer padre scrolleable; si ninguno, retorna document
   */
  private getScrollableParent(element: HTMLElement): HTMLElement | Document {
    let parent: HTMLElement | null = element.parentElement;
    
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && 
                        parent.scrollHeight > parent.clientHeight;
      
      if (canScroll) {
        return parent;
      }
      
      parent = parent.parentElement;
    }
    
    return document;
  }

  /**
   * Buscar elemento por clase como alternativa
   */
  private findElementByAlternative(sectionId: string): HTMLElement | null {
    const classMap: { [key: string]: string } = {
      'inicio': '.hero-home',
      'services': '.service-homepage',
      'catalog': '.catalog-section',
      'about': '.about-home',
      'contacto': '.footer-home'
    };

    const className = classMap[sectionId];
    if (className) {
      return document.querySelector(className) as HTMLElement | null;
    }
    
    return null;
  }

  /**
   * Detectar scroll para cambiar el estilo del navbar
   */
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const currentScrolled = window.pageYOffset > 50;
    
    if (this.isScrolled !== currentScrolled) {
      this.isScrolled = currentScrolled;
    }
    
    this.updateActiveSection();
  }

  /**
   * Cerrar menú al redimensionar la ventana
   */
  @HostListener('window:resize', [])
  onResize(): void {
    if (window.innerWidth > 768 && this.menuOpen) {
      this.closeMenu();
    }
  }

  /**
   * Cerrar menú con tecla ESC
   */
  @HostListener('document:keydown.escape', [])
  onEscapeKey(): void {
    if (this.menuOpen) {
      this.closeMenu();
    }
  }

  /**
   * Actualizar la sección activa según el scroll
   */
  private updateActiveSection(): void {
    const sections = ['inicio', 'services', 'catalog', 'about', 'contacto'];
    const scrollPosition = window.pageYOffset + 150;

    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetHeight = element.offsetHeight;

        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          if (this.activeSection !== sectionId) {
            this.activeSection = sectionId;
          }
          break;
        }
      }
    }
  }

  /**
   * Verificar si un link está activo
   */
  isActive(section: string): boolean {
    return this.activeSection === section;
  }
}