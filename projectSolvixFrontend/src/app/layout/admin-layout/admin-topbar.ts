import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import {
  AdminRecordHit,
  AdminRecordSearchGroup,
  AdminRecordSearchService
} from '../../core/services/admin-record-search.service';
import { SolvixThemeToggleComponent } from '../../shared/components/solvix-theme-toggle/solvix-theme-toggle';

@Component({
  selector: 'solvix-admin-topbar',
  standalone: true,
  imports: [RouterLink, FormsModule, SolvixThemeToggleComponent],
  templateUrl: './admin-topbar.html',
  styleUrl: './admin-topbar.scss'
})
export class AdminTopbarComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly searchApi = inject(AdminRecordSearchService);

  @Input() userName = 'Usuario';
  @Input() fotoUrl: string | null = null;
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  query = '';
  open = false;
  loading = false;
  hasError = false;
  groups: AdminRecordSearchGroup[] = [];
  flatHits: AdminRecordHit[] = [];
  activeIndex = -1;

  private readonly query$ = new Subject<string>();
  private readonly sub: Subscription;

  constructor() {
    this.sub = this.query$
      .pipe(
        debounceTime(320),
        distinctUntilChanged(),
        switchMap(q => {
          const trimmed = q.trim();
          if (!trimmed) {
            this.loading = false;
            this.hasError = false;
            this.groups = [];
            this.flatHits = [];
            this.activeIndex = -1;
            return of({ groups: [], total: 0, hasError: false });
          }
          this.loading = true;
          return this.searchApi.search(trimmed);
        })
      )
      .subscribe({
        next: result => {
          this.loading = false;
          this.hasError = result.hasError;
          this.groups = result.groups;
          this.flatHits = result.groups.flatMap(g => g.hits);
          this.activeIndex = this.flatHits.length ? 0 : -1;
        },
        error: () => {
          this.loading = false;
          this.hasError = true;
          this.groups = [];
          this.flatHits = [];
          this.activeIndex = -1;
        }
      });
  }

  get initials(): string {
    const source = this.userName.trim() || 'U';
    return source.slice(0, 1).toUpperCase();
  }

  get showPanel(): boolean {
    return this.open && this.query.trim().length > 0;
  }

  get empty(): boolean {
    return !this.loading && !this.hasError && this.flatHits.length === 0;
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.open = true;
    this.query$.next(value);
  }

  onFocus(): void {
    this.open = true;
    if (this.query.trim()) {
      this.query$.next(this.query);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.clear(true);
      return;
    }

    if (!this.showPanel || this.loading) {
      return;
    }

    const hits = this.flatHits;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!hits.length) {
          return;
        }
        this.activeIndex = (this.activeIndex + 1) % hits.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!hits.length) {
          return;
        }
        this.activeIndex = this.activeIndex <= 0 ? hits.length - 1 : this.activeIndex - 1;
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex >= 0 && hits[this.activeIndex]) {
          this.go(hits[this.activeIndex]);
        }
        break;
      default:
        break;
    }
  }

  go(hit: AdminRecordHit): void {
    this.router.navigateByUrl(hit.path);
    this.clear(true);
  }

  clear(blur = false): void {
    this.query = '';
    this.open = false;
    this.loading = false;
    this.hasError = false;
    this.groups = [];
    this.flatHits = [];
    this.activeIndex = -1;
    this.query$.next('');
    if (blur) {
      this.searchInput?.nativeElement.blur();
    }
  }

  flatIndex(hit: AdminRecordHit): number {
    return this.flatHits.findIndex(h => h.kind === hit.kind && h.id === hit.id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // :host usa display:contents; composedPath + contains cubren el topbar y resultados.
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const insidePath = path.some(
      node =>
        node instanceof Element &&
        (node === this.host.nativeElement || node.classList.contains('admin-topbar'))
    );
    const insideDom = this.host.nativeElement.contains(event.target as Node);
    if (!insidePath && !insideDom) {
      this.open = false;
      this.activeIndex = -1;
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
