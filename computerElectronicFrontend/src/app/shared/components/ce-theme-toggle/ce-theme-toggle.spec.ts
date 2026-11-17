import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CeThemeToggleComponent } from './ce-theme-toggle';
import {
  ThemeService,
  CE_THEME_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY
} from '../../../core/services/theme.service';

describe('CeThemeToggleComponent', () => {
  let fixture: ComponentFixture<CeThemeToggleComponent>;
  let theme: ThemeService;

  beforeEach(async () => {
    localStorage.removeItem(CE_THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [CeThemeToggleComponent, NoopAnimationsModule]
    }).compileComponents();

    theme = TestBed.inject(ThemeService);
    theme.init();
    fixture = TestBed.createComponent(CeThemeToggleComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(CE_THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  });

  it('muestra selector de tema', () => {
    const btn = fixture.nativeElement.querySelector('button.theme-toggle') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toContain('Oscuro');
  });

  it('cambia a claro de inmediato y persiste en ce-theme', () => {
    theme.select('light');
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('light');
    expect(fixture.nativeElement.querySelector('button.theme-toggle').getAttribute('aria-label')).toContain(
      'Claro'
    );
  });

  it('cambia a system y guarda preferencia system', () => {
    theme.select('system');
    fixture.detectChanges();
    expect(localStorage.getItem(CE_THEME_STORAGE_KEY)).toBe('system');
    expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme') ?? '');
  });
});
