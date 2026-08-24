import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  usuarioLogin = '';
  passwordLogin = '';
  error = '';
  loading: boolean = false;
  showPassword: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.loading = true;
    this.error = '';
    this.authService.login(this.usuarioLogin, this.passwordLogin).subscribe({
      next: (response) => {
        console.log('Respuesta del backend:', response);
        this.authService.guardarToken(response.token);
        this.router.navigate(['/dashboard']);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error del backend:', err);
        this.error = 'Credenciales inválidas';
        this.loading = false;
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
