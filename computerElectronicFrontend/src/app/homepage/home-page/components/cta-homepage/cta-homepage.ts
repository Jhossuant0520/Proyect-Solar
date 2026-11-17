import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cta-homepage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cta-homepage.html',
  styleUrl: './cta-homepage.scss'
})
export class CtaHomepage {
  readonly whatsappUrl = 'https://wa.me/573172901206';
}
