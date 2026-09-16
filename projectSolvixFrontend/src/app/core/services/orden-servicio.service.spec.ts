import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrdenServicioService } from './orden-servicio.service';
import { OrdenServicioRequestDTO } from '../models/orden-servicio.models';

describe('OrdenServicioService', () => {
  let service: OrdenServicioService;
  let http: HttpTestingController;
  const request: OrdenServicioRequestDTO = {
    clienteId: 4,
    equipoId: 9,
    problemaReportado: 'No enciende',
    diagnostico: null,
    trabajoRealizado: null,
    observaciones: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(OrdenServicioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista con filtros reales', () => {
    service.listar({ clienteId: 4, estado: 'RECEPCIONADO' }).subscribe();
    const req = http.expectOne(
      'http://localhost:8080/api/v1/ordenes-servicio?clienteId=4&estado=RECEPCIONADO'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('obtiene por id', () => {
    service.obtenerPorId(12).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/ordenes-servicio/12');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 12, numero: 'OS-2026-000001' });
  });

  it('crea con POST sin generar número', () => {
    service.crear(request).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/ordenes-servicio');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.body.numero).toBeUndefined();
    req.flush({ id: 1, numero: 'OS-2026-000001', ...request });
  });

  it('actualiza textos con PUT', () => {
    service.actualizar(12, request).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/ordenes-servicio/12');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.clienteId).toBe(4);
    expect(req.request.body.equipoId).toBe(9);
    req.flush({ id: 12, numero: 'OS-2026-000001', ...request });
  });

  it('cambia estado con POST /estado y body { estado }', () => {
    service.cambiarEstado(12, { estado: 'EN_DIAGNOSTICO' }).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/ordenes-servicio/12/estado');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ estado: 'EN_DIAGNOSTICO' });
    req.flush({ id: 12, estado: 'EN_DIAGNOSTICO' });
  });
});
