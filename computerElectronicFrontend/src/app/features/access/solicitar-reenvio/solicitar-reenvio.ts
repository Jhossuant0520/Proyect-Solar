import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-solicitar-reenvio',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './solicitar-reenvio.html',
  styleUrl: './solicitar-reenvio.scss'
})
export class SolicitarReenvio {

  form: FormGroup;
  cargando = false;
  enviado = false;
  errorMensaje = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando = true;
    this.errorMensaje = '';
    this.userService.reenviarVerificacion(this.form.get('email')?.value)
      .pipe(finalize(() => { this.cargando = false; }))
      .subscribe({
        next: () => {
          this.enviado = true;
        },
        error: (err) => {
          const body = err?.error;
          if (typeof body === 'string' && body.trim()) {
            this.errorMensaje = body;
          } else {
            this.errorMensaje =
              body?.mensaje || body?.message || 'Error al enviar. Intenta nuevamente.';
          }
        }
      });
  }
}
