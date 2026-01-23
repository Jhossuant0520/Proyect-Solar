import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  usuarioLogin = '';
  passwordLogin = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.authService.login(this.usuarioLogin, this.passwordLogin).subscribe({
      next: (response) => {
        console.log('Respuesta del backend:', response); // 👈 revisa aquí en consola
        this.authService.guardarToken(response.token);
        this.router.navigate(['/dashboard']); // Redirige al dashboard después del login exitoso
      },
      error: (err) => {
        console.error('Error del backend:', err); // 👈 importante revisar esto también
        this.error = 'Credenciales inválidas';
      }
    });
  }
  
}
