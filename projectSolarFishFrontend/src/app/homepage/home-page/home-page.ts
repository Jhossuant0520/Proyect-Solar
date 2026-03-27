import { Component } from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import { HeroHomepage } from './components/hero-homepage/hero-homepage';
import { AboutHomepage } from './components/about-homepage/about-homepage';
import { CommonModule } from '@angular/common';
import { NavbarHomepage } from './components/navbar-homepage/navbar-homepage';
import { ServicesHomepage } from "./components/services-homepage/services-homepage";
import { Catalog } from "./components/catalog/catalog";
import { FooterHomepage } from "./components/footer-homepage/footer-homepage";
import { StatsHomepage } from "./components/stats-homepage/stats-homepage";
import { StepsHomepage } from "./components/steps-homepage/steps-homepage";
import { TestimonialsHomepage } from "./components/testimonials-homepage/testimonials-homepage";
import { FaqHomepage } from "./components/faq-homepage/faq-homepage";
<<<<<<< HEAD
import { Contact } from '../contact/contact';

@Component({
  selector: 'app-home-page',
  imports: [MatCardModule, HeroHomepage, AboutHomepage, NavbarHomepage, ServicesHomepage, Catalog, FooterHomepage,   Contact, CommonModule, StatsHomepage, StepsHomepage, TestimonialsHomepage, FaqHomepage],
=======
import { CtaHomepage } from "./components/cta-homepage/cta-homepage";
import { Contact } from './components/contact/contact';

@Component({
  selector: 'app-home-page',
  imports: [MatCardModule, HeroHomepage, AboutHomepage, NavbarHomepage, ServicesHomepage, Catalog, FooterHomepage, CommonModule, StatsHomepage, StepsHomepage, TestimonialsHomepage, FaqHomepage, CtaHomepage, Contact],
>>>>>>> 57bf78d9f69ab819e6e00afc78789662bfa23ee0
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.scss']
})
export class HomePage {

}
