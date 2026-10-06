import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer-homepage',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer-homepage.html',
  styleUrl: './footer-homepage.scss'
})
export class FooterHomepage {
  currentYear = new Date().getFullYear();
  /** Slot para el PNG oficial. Colocar el archivo en `public/LogoEmpresa1.png`. */
  readonly logoSrc = '/LogoEmpresa1.png';
  readonly whatsappLabel = '+57 317 290 1206';
  readonly whatsappUrl = 'https://wa.me/573172901206';
}
