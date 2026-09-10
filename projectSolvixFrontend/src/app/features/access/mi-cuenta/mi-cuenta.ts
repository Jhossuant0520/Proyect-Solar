import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CuentaService, MisDatos, CambiarPassword } from '../../../core/services/cuenta.service';
import { SolvixBadgeComponent } from '../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../shared/components/solvix-button/solvix-button';
import { SolvixCardComponent } from '../../../shared/components/solvix-card/solvix-card';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../shared/components/solvix-section-header/solvix-section-header';

@Component({
  selector: 'app-mi-cuenta',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    SolvixPageHeaderComponent,
    SolvixSectionHeaderComponent,
    SolvixCardComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss'
})
export class MiCuenta implements OnInit {
  private readonly cuentaService = inject(CuentaService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('fotoInput') fotoInput?: ElementRef<HTMLInputElement>;

  misDatos: MisDatos | null = null;
  cargandoDatos = false;
  errorGeneral = '';
  guardando = false;
  errorPassword = '';
  exitoPassword = false;
  subiendoFoto = false;
  errorFoto = '';
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmarPasswordNueva: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit(): void {
    this.cargarMisDatos();
  }

  get fotoVisible(): string | null {
    return this.cuentaService.fotoUrl();
  }

  get iniciales(): string {
    const nombre = this.misDatos?.nombreUsuario?.trim() || this.authService.obtenerNombreUsuario() || 'U';
    return nombre.slice(0, 1).toUpperCase();
  }

  get rolVisible(): string {
    return this.authService.esAdmin() ? 'Administrador' : 'Usuario';
  }

  get mismatch(): boolean {
    return this.form.hasError('mismatch') && (this.form.touched || this.form.dirty);
  }

  get passwordActualControl() {
    return this.form.get('passwordActual');
  }

  get passwordNuevaControl() {
    return this.form.get('passwordNueva');
  }

  get confirmarPasswordNuevaControl() {
    return this.form.get('confirmarPasswordNueva');
  }

  cargarMisDatos(): void {
    this.cargandoDatos = true;
    this.errorGeneral = '';

    this.cuentaService.getMisDatos().pipe(finalize(() => { this.cargandoDatos = false; })).subscribe({
      next: datos => {
        this.misDatos = datos;
      },
      error: err => {
        this.errorGeneral = this.extraerMensajeError(err) || 'No pudimos cargar tu cuenta. Inténtalo de nuevo.';
      }
    });
  }

  elegirFoto(): void {
    this.fotoInput?.nativeElement.click();
  }

  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) {
      return;
    }

    const tipos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tipos.includes(archivo.type)) {
      this.errorFoto = 'Usa una imagen JPG, PNG o WEBP.';
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      this.errorFoto = 'La foto debe pesar máximo 2 MB.';
      return;
    }

    this.subiendoFoto = true;
    this.errorFoto = '';
    this.cuentaService.subirFoto(archivo).pipe(finalize(() => { this.subiendoFoto = false; })).subscribe({
      error: err => {
        this.errorFoto = this.extraerMensajeError(err) || 'No se pudo guardar la foto. Inténtalo de nuevo.';
      }
    });
  }

  quitarFoto(): void {
    if (!this.fotoVisible || this.subiendoFoto) {
      return;
    }
    this.subiendoFoto = true;
    this.errorFoto = '';
    this.cuentaService.eliminarFoto().pipe(finalize(() => { this.subiendoFoto = false; })).subscribe({
      error: err => {
        this.errorFoto = this.extraerMensajeError(err) || 'No se pudo quitar la foto. Inténtalo de nuevo.';
      }
    });
  }

  cambiarPassword(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.errorPassword = '';
    this.exitoPassword = false;

    const datos: CambiarPassword = {
      passwordActual: this.form.get('passwordActual')?.value,
      passwordNueva: this.form.get('passwordNueva')?.value,
      confirmarPasswordNueva: this.form.get('confirmarPasswordNueva')?.value
    };

    this.cuentaService.cambiarPassword(datos).pipe(finalize(() => { this.guardando = false; })).subscribe({
      next: () => {
        this.exitoPassword = true;
        this.form.reset();
      },
      error: err => {
        this.errorPassword = this.extraerMensajeError(err) || 'No se pudo cambiar la contraseña. Inténtalo de nuevo.';
      }
    });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const nueva = control.get('passwordNueva')?.value;
    const confirmar = control.get('confirmarPasswordNueva')?.value;
    return nueva && confirmar && nueva !== confirmar ? { mismatch: true } : null;
  }

  private extraerMensajeError(err: unknown): string {
    const body = (err as { error?: unknown })?.error;
    if (typeof body === 'string') {
      return body;
    }
    if (body && typeof body === 'object') {
      const mensaje = body as { message?: string; error?: string; mensaje?: string };
      return mensaje.message || mensaje.error || mensaje.mensaje || '';
    }
    return '';
  }
}
