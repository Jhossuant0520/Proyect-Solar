import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';
import { SOLVIX_THEME_STORAGE_KEY, ThemeService } from '../../core/services/theme.service';

describe('HomePage theme', () => {
  let fixture: ComponentFixture<HomePage>;
  let theme: ThemeService;

  beforeEach(async () => {
    localStorage.removeItem(SOLVIX_THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), ThemeService]
    }).compileComponents();

    theme = TestBed.inject(ThemeService);
    theme.init();
    fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem(SOLVIX_THEME_STORAGE_KEY);
  });

  it('aplica data-theme=light y mantiene navbar/hero visibles', () => {
    theme.setPreference('light');
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(fixture.nativeElement.querySelector('app-navbar-homepage')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-hero-homepage')).toBeTruthy();
  });

  it('cambia a dark en tiempo real sin recargar', () => {
    theme.setPreference('light');
    fixture.detectChanges();
    theme.setPreference('dark');
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
