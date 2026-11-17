import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MisDatos {
  nombreUsuario: string;
  email: string;
  fechaCreacion: string;
  ultimoLogin: string;
  fotoUrl?: string | null;
}

export interface CambiarPassword {
  passwordActual: string;
  passwordNueva: string;
  confirmarPasswordNueva: string;
}

@Injectable({
  providedIn: 'root'
})
export class CuentaService {
  private readonly baseUrl = `${environment.apiBaseUrl}/cuenta`;
  private readonly origenApi = environment.apiOrigin;

  readonly fotoUrl = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  getMisDatos(): Observable<MisDatos> {
    return this.http.get<MisDatos>(`${this.baseUrl}/mis-datos`).pipe(
      tap(datos => this.actualizarFotoVisible(datos.fotoUrl))
    );
  }

  cambiarPassword(datos: CambiarPassword): Observable<{ mensaje?: string }> {
    return this.http.put<{ mensaje?: string }>(`${this.baseUrl}/cambiar-password`, datos);
  }

  subirFoto(archivo: File): Observable<{ fotoUrl: string; mensaje?: string }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ fotoUrl: string; mensaje?: string }>(`${this.baseUrl}/foto`, formData).pipe(
      tap(respuesta => this.actualizarFotoVisible(respuesta.fotoUrl))
    );
  }

  eliminarFoto(): Observable<{ mensaje?: string }> {
    return this.http.delete<{ mensaje?: string }>(`${this.baseUrl}/foto`).pipe(
      tap(() => this.actualizarFotoVisible(null))
    );
  }

  actualizarFotoVisible(fotoUrl?: string | null): void {
    this.fotoUrl.set(this.urlPublica(fotoUrl));
  }

  urlPublica(fotoUrl?: string | null): string | null {
    if (!fotoUrl) {
      return null;
    }
    const absoluta = fotoUrl.startsWith('http') ? fotoUrl : `${this.origenApi}${fotoUrl}`;
    const separador = absoluta.includes('?') ? '&' : '?';
    return `${absoluta}${separador}t=${Date.now()}`;
  }
}
