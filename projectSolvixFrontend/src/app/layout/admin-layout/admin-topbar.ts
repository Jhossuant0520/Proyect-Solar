import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'solvix-admin-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-topbar.html',
  styleUrl: './admin-topbar.scss'
})
export class AdminTopbarComponent {
  @Input() userName = 'Usuario';
  @Input() fotoUrl: string | null = null;
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  get initials(): string {
    const source = this.userName.trim() || 'U';
    return source.slice(0, 1).toUpperCase();
  }
}
