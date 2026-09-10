import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminNavItem } from './admin-nav';

@Component({
  selector: 'solvix-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.scss'
})
export class AdminSidebarComponent {
  @Input() items: AdminNavItem[] = [];
}
