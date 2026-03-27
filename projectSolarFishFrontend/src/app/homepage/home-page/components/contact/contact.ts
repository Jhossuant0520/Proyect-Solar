import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  imports: [CommonModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {

  mobileMenuOpen = false;

  openMenu() {
    this.mobileMenuOpen = true;
  }

  closeMenu() {
    this.mobileMenuOpen = false;
  }

}
