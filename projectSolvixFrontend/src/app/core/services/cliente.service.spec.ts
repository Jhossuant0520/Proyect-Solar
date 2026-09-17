import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClienteService } from './cliente.service';
import { ClienteRequestDTO } from '../models/cliente.models';
import { environment } from '../../../environments/environment';

describe('ClienteService', () => {
  let service: ClienteService;
  let http: HttpTestingController;
  const request: ClienteRequestDTO = {
    nombre: 'Ana Ruiz',
    tipoCliente: 'PERSONA',
    tipoDocumento: null,
    numeroDocumento: null,
    email: null,
    telefono: null,
    notas: null,
    activo: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ClienteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista todos los clientes sin inventar búsqueda', () => {
    service.listar(false).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/clientes?soloActivos=false`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('crea con POST', () => {
    service.crear(request).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/clientes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 2, ...request, consumidorFinal: false, fechaRegistro: null });
  });

  it('edita con PUT', () => {
    service.actualizar(2, request).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/clientes/2`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 2, ...request, consumidorFinal: false, fechaRegistro: null });
  });

  it('desactiva con PUT y activo en falso, no con borrado', () => {
    service.desactivar(2, request).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/clientes/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.activo).toBeFalse();
    req.flush({ id: 2, ...request, activo: false, consumidorFinal: false, fechaRegistro: null });
  });
});
