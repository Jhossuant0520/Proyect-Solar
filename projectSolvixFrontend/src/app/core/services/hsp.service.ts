import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RequestHSP, ResponseHSP } from '../models/hsp.model';

@Injectable({ providedIn: 'root' })
export class HspService {
  private api = 'http://localhost:8080/api/v1/hsp';
  constructor(private http: HttpClient) {}

  calcular(req: RequestHSP): Observable<ResponseHSP> {
    return this.http.post<ResponseHSP>(`${this.api}/calcular`, req);
  }

  calcularYGuardar(req: RequestHSP): Observable<ResponseHSP> {
    return this.http.post<ResponseHSP>(`${this.api}/calcular-y-guardar`, req);
  }
}