import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RequestDemandaRecibo, ResponseDemandaRecibo } from '../models/demanda-recibo.model';

@Injectable({ providedIn: 'root' })
export class DemandaReciboService {
  private apiUrl = 'http://localhost:8080/api/v1/demanda-recibo';

  constructor(private http: HttpClient) {}

  calcularDemandaRecibo(request: RequestDemandaRecibo): Observable<ResponseDemandaRecibo> {
    return this.http.post<ResponseDemandaRecibo>(`${this.apiUrl}/calcular`, request);
  }

  calcularYGuardar(request: RequestDemandaRecibo): Observable<ResponseDemandaRecibo> {
    return this.http.post<ResponseDemandaRecibo>(`${this.apiUrl}/calcular-y-guardar`, request);
  }
}