import { Component, inject } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-hero-homepage',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './hero-homepage.html',
  styleUrls: ['./hero-homepage.scss']
})
export class HeroHomepage {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportScroller);

  goToContact(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/'], { fragment: 'contact' }).then(() => {
      this.viewport.scrollToAnchor('contact');
    });
  }
}
