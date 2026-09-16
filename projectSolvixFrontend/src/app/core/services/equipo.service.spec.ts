import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EquipoService } from './equipo.service';
import { EquipoRequestDTO } from '../models/equipo.models';

describe('EquipoService', () => {
  let service: EquipoService;
  let http: HttpTestingController;
  const request: EquipoRequestDTO = {
    clienteId: 4,
    tipoEquipo: 'PORTATIL',
    marca: 'Dell',
    modelo: 'XPS',
    numeroSerie: 'SN-1',
    nombre: 'Notebook Ana',
    observaciones: null,
    activo: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(EquipoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista con filtros reales clienteId y soloActivos', () => {
    service.listar({ clienteId: 4, soloActivos: true }).subscribe();
    const req = http.expectOne(
      'http://localhost:8080/api/v1/equipos?clienteId=4&soloActivos=true'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('listarPorCliente usa el mismo GET con query params', () => {
    service.listarPorCliente(7, true).subscribe();
    const req = http.expectOne(
      'http://localhost:8080/api/v1/equipos?clienteId=7&soloActivos=true'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('obtiene por id', () => {
    service.obtenerPorId(3).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/equipos/3');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 3, ...request, clienteNombre: 'Ana', fechaRegistro: null });
  });

  it('crea con POST', () => {
    service.crear(request).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/equipos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 1, ...request, clienteNombre: 'Ana', fechaRegistro: null });
  });

  it('actualiza con PUT', () => {
    service.actualizar(3, request).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/equipos/3');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 3, ...request, clienteNombre: 'Ana', fechaRegistro: null });
  });

  it('desactiva con DELETE', () => {
    service.desactivar(3).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/equipos/3');
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 3, ...request, activo: false, clienteNombre: 'Ana', fechaRegistro: null });
  });
});
