import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'] 
})
export class Contact {

  mobileMenuOpen = false;

  openMenu() {
    this.mobileMenuOpen = true;
  }

  closeMenu() {
    this.mobileMenuOpen = false;
  }

  // 🔥 ANIMACIÓN SCROLL (NO AFECTA NADA EXISTENTE)
  @HostListener('window:scroll', [])
  onScroll() {
    const elements = document.querySelectorAll('.reveal');

    elements.forEach(el => {
      const top = el.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (top < windowHeight - 100) {
        el.classList.add('active');
      }
    });
  }

}