import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {

  form: FormGroup;
  cargando = false;
  errorMensaje = '';
  registroExitoso = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.form = this.fb.group({
      nombreUsuario: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      passwordUsuario: ['', [Validators.required, Validators.minLength(8)]],
      confirmarPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    const pass = g.get('passwordUsuario')?.value;
    const confirm = g.get('confirmarPassword')?.value;
    return pass === confirm ? null : { passwordsMismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';

    const datos = {
      nombreUsuario: this.form.get('nombreUsuario')?.value,
      email: this.form.get('email')?.value,
      passwordUsuario: this.form.get('passwordUsuario')?.value
    };

    this.userService.registrar(datos).pipe(
      finalize(() => { this.cargando = false; })
    ).subscribe({
      next: () => {
        this.registroExitoso = true;
      },
      error: (err) => {
        const body = err?.error;
        if (typeof body === 'string') {
          this.errorMensaje = body;
        } else if (body?.message) {
          this.errorMensaje = body.message;
        } else if (body?.error) {
          this.errorMensaje = body.error;
        } else if (body?.mensaje) {
          this.errorMensaje = body.mensaje;
        } else {
          this.errorMensaje = 'Error al registrar. Intenta nuevamente.';
        }
      }
    });
  }

  get emailValue(): string {
    return this.form.get('email')?.value || '';
  }
}
