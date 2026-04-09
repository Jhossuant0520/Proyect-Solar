import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CuentaService, MisDatos, CambiarPassword } from '../../core/services/cuenta.service';

@Component({
  selector: 'app-mi-cuenta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss'
})
export class MiCuenta implements OnInit {
  misDatos: MisDatos | null = null;
  cargandoDatos = false;
  errorGeneral = '';
  guardando = false;
  errorPassword = '';
  exitoPassword = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cuentaService: CuentaService
  ) {
    this.form = this.fb.group({
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmarPasswordNueva: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit(): void {
    this.cargarMisDatos();
  }

  private cargarMisDatos(): void {
    this.cargandoDatos = true;
    this.errorGeneral = '';

    this.cuentaService.getMisDatos().pipe(finalize(() => { this.cargandoDatos = false; })).subscribe({
      next: datos => {
        this.misDatos = datos;
      },
      error: err => {
        this.errorGeneral = this.extraerMensajeError(err) || 'No se pudieron cargar tus datos. Intenta nuevamente.';
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
        this.errorPassword = this.extraerMensajeError(err) || 'Error al cambiar la contraseña. Intenta nuevamente.';
      }
    });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const nueva = control.get('passwordNueva')?.value;
    const confirmar = control.get('confirmarPasswordNueva')?.value;
    return nueva && confirmar && nueva !== confirmar ? { mismatch: true } : null;
  }

  private extraerMensajeError(err: any): string {
    const body = err?.error;
    if (typeof body === 'string') {
      return body;
    }
    if (body?.message) {
      return body.message;
    }
    if (body?.error) {
      return body.error;
    }
    if (body?.mensaje) {
      return body.mensaje;
    }
    return '';
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
}
