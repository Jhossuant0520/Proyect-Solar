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

  // 👁️ CONTROL DEL OJO
  showPassword = false;
  showConfirm = false;

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

  // 👇 acceso fácil a controles
  get f() {
    return this.form.controls;
  }

  // 🔐 validar contraseñas
  private passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    const pass = g.get('passwordUsuario')?.value;
    const confirm = g.get('confirmarPassword')?.value;

    return pass === confirm ? null : { passwordsMismatch: true };
  }

  // 👁️ mostrar/ocultar
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirm(): void {
    this.showConfirm = !this.showConfirm;
  }

  // 🚀 submit
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

    this.userService.registrar(datos)
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: () => {
          this.registroExitoso = true;

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          this.errorMensaje = 'Error al registrar';
        }
      });
  }
}