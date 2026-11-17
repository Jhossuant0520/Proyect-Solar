import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardDateFieldComponent } from './dashboard-date-field';

describe('DashboardDateFieldComponent', () => {
  let fixture: ComponentFixture<DashboardDateFieldComponent>;
  let component: DashboardDateFieldComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardDateFieldComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardDateFieldComponent);
    component = fixture.componentInstance;
    component.value = '2026-03-15';
    fixture.detectChanges();
  });

  it('emite yyyy-MM-dd local al seleccionar un día (sin desfase UTC)', () => {
    const emitted: string[] = [];
    component.valueChange.subscribe(v => emitted.push(v));
    component.openPanel();
    const target = component.days.find(d => d.iso === '2026-03-20' && d.inMonth);
    expect(target).toBeTruthy();
    component.selectDay(target!);
    expect(emitted).toEqual(['2026-03-20']);
  });

  it('Hoy emite la fecha local de hoy', () => {
    const emitted: string[] = [];
    component.valueChange.subscribe(v => emitted.push(v));
    component.selectToday();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(emitted).toEqual([expected]);
  });

  it('Borrar emite cadena vacía como el datepicker nativo', () => {
    const emitted: string[] = [];
    component.valueChange.subscribe(v => emitted.push(v));
    component.clearDate();
    expect(emitted).toEqual(['']);
  });

  it('muestra una sola etiqueta de fecha sin input nativo type=date', () => {
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('input[type="date"]')).toBeNull();
    expect(native.querySelector('.date-field__trigger')).toBeTruthy();
  });
});
