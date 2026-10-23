import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
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
export class AdminSidebarComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() groups: AdminNavGroup[] = [];
  @Input() brandName = 'Computer & Electronic';
  @Input() brandKicker = 'Panel administrativo';
  /** Conserva query params (periodo) al cambiar de vista de análisis. */
  @Input() preserveQuery = false;

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

  ngOnChanges(changes: SimpleChanges): void {
    // Solo reaccionar a cambio real de referencia; el layout memoiza `navGroups`
    // para no recrear el array en cada ciclo de detección de cambios.
    if (changes['groups'] && !changes['groups'].firstChange) {
      void Promise.resolve().then(() => this.syncIndicator());
    }
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
