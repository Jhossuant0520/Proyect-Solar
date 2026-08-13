import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';

type Estado = 'cargando' | 'exito' | 'error' | 'sin-token';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verificar-email.html',
  styleUrl: './verificar-email.scss'
})
export class VerificarEmail implements OnInit {

  estado: Estado = 'cargando';
  mensaje = '';
  errorExpirado = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.estado = 'sin-token';
      this.mensaje = 'Enlace inválido';
      return;
    }

    this.userService.verificarEmail(token).subscribe({
      next: (res) => {
        this.estado = 'exito';
        this.mensaje = res?.mensaje || 'Email verificado correctamente. Ya puedes iniciar sesión.';
      },
      error: (err) => {
        this.estado = 'error';
        const status = err?.status;
        const body = err?.error;

        if (status === 400) {
          this.errorExpirado = true;
          this.mensaje = body?.mensaje || 'El enlace de verificación ha expirado. Solicita uno nuevo.';
        } else if (status === 404) {
          this.errorExpirado = false;
          this.mensaje = 'Enlace inválido o ya utilizado';
        } else {
          this.mensaje = body?.mensaje || 'Error al verificar. Intenta nuevamente.';
        }
      }
    });
  }

  solicitarNuevoEnlace(): void {
    this.router.navigate(['/solicitar-reenvio']);
  }
}
