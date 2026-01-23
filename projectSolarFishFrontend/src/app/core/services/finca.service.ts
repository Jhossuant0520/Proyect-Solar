import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { fincaModel } from '../../features/finca/fincaClase';

@Injectable({
  providedIn: 'root'
})
export class FincaService {

  private apiUrl = 'http://localhost:8080/api/fincas';

  constructor(private http: HttpClient) {}

  //  Listar todas las fincas
  listarFincas(): Observable<fincaModel[]> {
    return this.http.get<fincaModel[]>(`${this.apiUrl}/listar`);
  }

  // Registrar una nueva finca
  registrarFinca(finca: fincaModel): Observable<fincaModel> {
    return this.http.post<fincaModel>(`${this.apiUrl}/registrar`, finca);
  }

  //  Obtener finca por ID
  obtenerFincaPorId(id: number): Observable<fincaModel> {
    return this.http.get<fincaModel>(`${this.apiUrl}/${id}`);
  }

  // Actualizar finca existente
  actualizarFinca(id: number, finca: fincaModel): Observable<fincaModel> {
    return this.http.put<fincaModel>(`${this.apiUrl}/${id}`, finca);
  }

  // Eliminar finca
  eliminarFinca(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
