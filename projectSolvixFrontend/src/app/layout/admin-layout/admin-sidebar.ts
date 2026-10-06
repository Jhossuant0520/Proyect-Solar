import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AdminNavGroup } from './admin-nav';

@Component({
  selector: 'solvix-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.scss'
})
export class AdminSidebarComponent implements AfterViewInit, OnDestroy {
  @Input() groups: AdminNavGroup[] = [];

  @ViewChild('nav') nav?: ElementRef<HTMLElement>;

  indicatorY = 0;
  indicatorH = 0;
  indicatorReady = false;

  private readonly router = inject(Router);
  private sub?: Subscription;

  ngAfterViewInit(): void {
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => void Promise.resolve().then(() => this.syncIndicator()));
    void Promise.resolve().then(() => this.syncIndicator());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private syncIndicator(): void {
    const root = this.nav?.nativeElement;
    if (!root) {
      return;
    }
    const active = root.querySelector<HTMLElement>('.admin-sidebar__link.is-active');
    if (!active) {
      this.indicatorReady = false;
      return;
    }
    this.indicatorY = active.offsetTop;
    this.indicatorH = active.offsetHeight;
    this.indicatorReady = true;
  }
}
