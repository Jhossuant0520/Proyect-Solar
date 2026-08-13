import { Component } from '@angular/core';

@Component({
  selector: 'app-footer-homepage',
  imports: [],
  templateUrl: './footer-homepage.html',
  styleUrl: './footer-homepage.scss'
})
export class FooterHomepage {

  currentYear = new Date().getFullYear();

}
