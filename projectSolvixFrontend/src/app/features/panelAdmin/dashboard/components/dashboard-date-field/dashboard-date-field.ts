import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';

type PanelMode = 'days' | 'months' | 'years';

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

/** Parsea yyyy-MM-dd como fecha local (sin UTC). */
function parseLocalIso(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function addYears(date: Date, delta: number): Date {
  return new Date(date.getFullYear() + delta, date.getMonth(), 1);
}

@Component({
  selector: 'solvix-dashboard-date-field',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-date-field.html',
  styleUrl: './dashboard-date-field.scss'
})
export class DashboardDateFieldComponent implements OnChanges {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() value = '';
  @Input() ariaLabel = 'Fecha';
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') panel?: ElementRef<HTMLElement>;

  readonly weekdays = WEEKDAYS;
  readonly months = MONTHS;

  open = false;
  mode: PanelMode = 'days';
  viewMonth = startOfMonth(new Date());
  days: CalendarDay[] = [];
  yearOptions: number[] = [];
  focusedIso = '';
  slideDir: -1 | 0 | 1 = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      const parsed = parseLocalIso(this.value) ?? new Date();
      if (!this.open) {
        this.viewMonth = startOfMonth(parsed);
      }
      this.rebuildGrid();
    }
  }

  get displayLabel(): string {
    const parsed = parseLocalIso(this.value);
    if (!parsed) {
      return 'Elegir fecha';
    }
    return parsed.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  get monthTitle(): string {
    const name = MONTHS[this.viewMonth.getMonth()];
    return `${name} de ${this.viewMonth.getFullYear()}`;
  }

  get yearTitle(): string {
    return String(this.viewMonth.getFullYear());
  }

  toggle(): void {
    if (this.open) {
      this.close();
      return;
    }
    this.openPanel();
  }

  openPanel(): void {
    const parsed = parseLocalIso(this.value) ?? new Date();
    this.viewMonth = startOfMonth(parsed);
    this.focusedIso = toLocalIso(parsed);
    this.mode = 'days';
    this.slideDir = 0;
    this.rebuildGrid();
    this.open = true;
    void Promise.resolve().then(() => this.panel?.nativeElement.focus());
  }

  close(restoreFocus = false): void {
    this.open = false;
    this.mode = 'days';
    if (restoreFocus) {
      this.trigger?.nativeElement.focus();
    }
  }

  prevMonth(): void {
    this.slideDir = -1;
    this.viewMonth = addMonths(this.viewMonth, -1);
    this.rebuildGrid();
  }

  nextMonth(): void {
    this.slideDir = 1;
    this.viewMonth = addMonths(this.viewMonth, 1);
    this.rebuildGrid();
  }

  prevYear(): void {
    this.slideDir = -1;
    this.viewMonth = addYears(this.viewMonth, -1);
    this.rebuildGrid();
    this.rebuildYears();
  }

  nextYear(): void {
    this.slideDir = 1;
    this.viewMonth = addYears(this.viewMonth, 1);
    this.rebuildGrid();
    this.rebuildYears();
  }

  toggleMonthPicker(): void {
    this.mode = this.mode === 'months' ? 'days' : 'months';
  }

  toggleYearPicker(): void {
    if (this.mode === 'years') {
      this.mode = 'days';
      return;
    }
    this.rebuildYears();
    this.mode = 'years';
  }

  pickMonth(monthIndex: number): void {
    this.viewMonth = new Date(this.viewMonth.getFullYear(), monthIndex, 1);
    this.mode = 'days';
    this.slideDir = 0;
    this.rebuildGrid();
  }

  pickYear(year: number): void {
    this.viewMonth = new Date(year, this.viewMonth.getMonth(), 1);
    this.mode = 'days';
    this.slideDir = 0;
    this.rebuildGrid();
  }

  selectDay(day: CalendarDay): void {
    this.valueChange.emit(day.iso);
    this.close(true);
  }

  /** Equivalente al enlace «Hoy» del datepicker nativo. */
  selectToday(): void {
    const today = toLocalIso(new Date());
    this.viewMonth = startOfMonth(new Date());
    this.focusedIso = today;
    this.rebuildGrid();
    this.valueChange.emit(today);
    this.close(true);
  }

  /**
   * Equivalente al enlace «Borrar» del datepicker nativo.
   * Emite cadena vacía; el header decide cómo persistir el rango.
   */
  clearDate(): void {
    this.valueChange.emit('');
    this.close(true);
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.mode !== 'days') {
        this.mode = 'days';
        return;
      }
      this.close(true);
      return;
    }

    if (this.mode !== 'days') {
      return;
    }

    const flat = this.days;
    const index = flat.findIndex(d => d.iso === this.focusedIso);
    if (index < 0) {
      return;
    }

    let next = index;
    switch (event.key) {
      case 'ArrowLeft':
        next = index - 1;
        break;
      case 'ArrowRight':
        next = index + 1;
        break;
      case 'ArrowUp':
        next = index - 7;
        break;
      case 'ArrowDown':
        next = index + 7;
        break;
      case 'PageUp':
        event.preventDefault();
        event.shiftKey ? this.prevYear() : this.prevMonth();
        return;
      case 'PageDown':
        event.preventDefault();
        event.shiftKey ? this.nextYear() : this.nextMonth();
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDay(flat[index]);
        return;
      default:
        return;
    }

    event.preventDefault();
    if (next < 0) {
      this.prevMonth();
      this.focusedIso = this.days[Math.min(this.days.length - 1, this.days.length + next)]?.iso ?? this.focusedIso;
      return;
    }
    if (next >= flat.length) {
      this.nextMonth();
      this.focusedIso = this.days[next - flat.length]?.iso ?? this.focusedIso;
      return;
    }
    this.focusedIso = flat[next].iso;
    if (!flat[next].inMonth) {
      const parsed = parseLocalIso(flat[next].iso);
      if (parsed) {
        this.viewMonth = startOfMonth(parsed);
        this.rebuildGrid();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) {
      return;
    }
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const root = this.host.nativeElement;
    const inside =
      path.some(n => n instanceof Node && root.contains(n)) || root.contains(event.target as Node);
    if (!inside) {
      this.close();
    }
  }

  private rebuildYears(): void {
    const center = this.viewMonth.getFullYear();
    this.yearOptions = Array.from({ length: 12 }, (_, i) => center - 5 + i);
  }

  private rebuildGrid(): void {
    const todayIso = toLocalIso(new Date());
    const selectedIso = parseLocalIso(this.value) ? this.value : '';
    const first = startOfMonth(this.viewMonth);
    // Domingo primero, como el datepicker nativo de Chrome en es-CO.
    const weekday = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - weekday);

    const cells: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const cell = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const iso = toLocalIso(cell);
      cells.push({
        iso,
        day: cell.getDate(),
        inMonth: cell.getMonth() === this.viewMonth.getMonth(),
        isToday: iso === todayIso,
        isSelected: iso === selectedIso
      });
    }
    this.days = cells;
    if (!this.focusedIso || !cells.some(c => c.iso === this.focusedIso)) {
      this.focusedIso = selectedIso || todayIso || cells[0]?.iso || '';
    }
  }
}
