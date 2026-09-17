import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RequestHSP, ResponseHSP } from '../models/hsp.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HspService {
  private readonly api = `${environment.apiBaseUrl}/v1/hsp`;
  constructor(private http: HttpClient) {}

  calcular(req: RequestHSP): Observable<ResponseHSP> {
    return this.http.post<ResponseHSP>(`${this.api}/calcular`, req);
  }

  calcularYGuardar(req: RequestHSP): Observable<ResponseHSP> {
    return this.http.post<ResponseHSP>(`${this.api}/calcular-y-guardar`, req);
  }
}