import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrdenServicioService } from './orden-servicio.service';
import { OrdenServicioRequestDTO } from '../models/orden-servicio.models';
import { environment } from '../../../environments/environment';

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
      `${environment.apiBaseUrl}/v1/ordenes-servicio?clienteId=4&estado=RECEPCIONADO`
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('obtiene por id', () => {
    service.obtenerPorId(12).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 12, numero: 'OS-2026-000001' });
  });

  it('crea con POST sin generar número', () => {
    service.crear(request).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.body.numero).toBeUndefined();
    req.flush({ id: 1, numero: 'OS-2026-000001', ...request });
  });

  it('actualiza textos con PUT', () => {
    service.actualizar(12, request).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.clienteId).toBe(4);
    expect(req.request.body.equipoId).toBe(9);
    req.flush({ id: 12, numero: 'OS-2026-000001', ...request });
  });

  it('cambia estado con POST /estado y body de transición', () => {
    service
      .cambiarEstado(12, {
        nuevoEstado: 'EN_DIAGNOSTICO',
        motivo: 'Inicio',
        observacion: null
      })
      .subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12/estado`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nuevoEstado: 'EN_DIAGNOSTICO',
      motivo: 'Inicio',
      observacion: null
    });
    req.flush({
      orden: { id: 12, estado: 'EN_DIAGNOSTICO' },
      estadoAnterior: 'RECEPCIONADO',
      estadoNuevo: 'EN_DIAGNOSTICO',
      motivo: 'Inicio',
      observacion: null,
      usuario: 'admin',
      fechaCambio: '2026-03-01T11:00:00',
      mensaje: 'OK'
    });
  });

  it('completa diagnóstico con POST /diagnostico/completar', () => {
    service
      .completarDiagnostico(12, {
        problemaReportado: 'No enciende',
        diagnostico: 'Fuente dañada',
        observaciones: null
      })
      .subscribe();
    const req = http.expectOne(
      `${environment.apiBaseUrl}/v1/ordenes-servicio/12/diagnostico/completar`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      problemaReportado: 'No enciende',
      diagnostico: 'Fuente dañada',
      observaciones: null
    });
    req.flush({
      orden: { id: 12, estado: 'DIAGNOSTICADO' },
      estadoAnterior: 'EN_DIAGNOSTICO',
      estadoNuevo: 'DIAGNOSTICADO',
      motivo: null,
      observacion: null,
      usuario: 'admin',
      fechaCambio: '2026-03-01T11:00:00',
      mensaje: 'OK'
    });
  });

  it('completa reparación con POST /reparacion/completar', () => {
    service
      .completarReparacion(12, {
        trabajoRealizado: 'Cambio de fuente',
        observaciones: null
      })
      .subscribe();
    const req = http.expectOne(
      `${environment.apiBaseUrl}/v1/ordenes-servicio/12/reparacion/completar`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      trabajoRealizado: 'Cambio de fuente',
      observaciones: null
    });
    req.flush({
      orden: { id: 12, estado: 'LISTO' },
      estadoAnterior: 'EN_REPARACION',
      estadoNuevo: 'LISTO',
      motivo: null,
      observacion: null,
      usuario: 'admin',
      fechaCambio: '2026-03-01T11:00:00',
      mensaje: 'OK'
    });
  });

  it('registra nueva falla con POST /nueva-falla', () => {
    service
      .registrarNuevaFalla(12, {
        nuevaFalla: 'Pista dañada en placa',
        observacion: null
      })
      .subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12/nueva-falla`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nuevaFalla: 'Pista dañada en placa',
      observacion: null
    });
    req.flush({
      orden: { id: 12, estado: 'REQUIERE_APROBACION_ADICIONAL' },
      estadoAnterior: 'EN_REPARACION',
      estadoNuevo: 'REQUIERE_APROBACION_ADICIONAL',
      motivo: null,
      observacion: null,
      usuario: 'admin',
      fechaCambio: '2026-03-01T11:00:00',
      mensaje: 'OK'
    });
  });

  it('lista historial', () => {
    service.listarHistorial(12).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12/historial`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('lista repuestos', () => {
    service.listarRepuestos(12).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12/repuestos`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('planifica repuesto con POST', () => {
    service.planificarRepuesto(12, { productoId: 7, cantidadPlanificada: 2 }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12/repuestos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productoId: 7, cantidadPlanificada: 2 });
    req.flush({ id: 1, productoId: 7, cantidadPlanificada: 2 });
  });

  it('actualiza repuesto con PUT', () => {
    service.actualizarRepuesto(12, 3, { productoId: 7, cantidadPlanificada: 4 }).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12/repuestos/3`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 3, cantidadPlanificada: 4 });
  });

  it('anula repuesto con DELETE', () => {
    service.anularRepuesto(12, 3).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/ordenes-servicio/12/repuestos/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 3, anulado: true, estado: 'ANULADO' });
  });

  it('consume repuesto', () => {
    service.consumirRepuesto(12, 3, { cantidad: 1 }).subscribe();
    const req = http.expectOne(
      `${environment.apiBaseUrl}/v1/ordenes-servicio/12/repuestos/3/consumir`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cantidad: 1 });
    req.flush({ id: 3, cantidadConsumida: 1 });
  });

  it('devuelve repuesto', () => {
    service.devolverRepuesto(12, 3, { cantidad: 1 }).subscribe();
    const req = http.expectOne(
      `${environment.apiBaseUrl}/v1/ordenes-servicio/12/repuestos/3/devolver`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cantidad: 1 });
    req.flush({ id: 3, cantidadDevuelta: 1 });
  });
});
