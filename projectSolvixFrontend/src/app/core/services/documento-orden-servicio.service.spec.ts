import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DocumentoOrdenServicioService } from './documento-orden-servicio.service';
import { environment } from '../../../environments/environment';
import { DocumentoOrdenServicioResponseDTO } from '../models/documento-orden-servicio.models';

describe('DocumentoOrdenServicioService', () => {
  let service: DocumentoOrdenServicioService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/v1/ordenes-servicio/12/documentos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(DocumentoOrdenServicioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista documentos de la orden', () => {
    const mock: DocumentoOrdenServicioResponseDTO[] = [];
    service.listar(12).subscribe(r => expect(r).toEqual(mock));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('descarga PDF como blob', () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    service.descargarPdf(12, 3, 'inline').subscribe(r => expect(r).toEqual(blob));
    const req = http.expectOne(r => r.url === `${base}/3/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('disposition')).toBe('inline');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });

  it('asegura comprobante de recepción (POST idempotente)', () => {
    const mock = {
      status: 'GENERATED' as const,
      ready: true,
      documento: { id: 9, tipoDocumento: 'COMPROBANTE_RECEPCION' }
    };
    service.asegurarComprobanteRecepcion(12).subscribe(r => {
      expect(r.status).toBe('GENERATED');
      expect(r.ready).toBeTrue();
      expect(r.documento.id).toBe(9);
    });
    const req = http.expectOne(`${base}/comprobante-recepcion`);
    expect(req.request.method).toBe('POST');
    req.flush(mock);
  });

  it('regenera documento', () => {
    const mock = { id: 4 } as DocumentoOrdenServicioResponseDTO;
    service.regenerar(12, 4).subscribe(r => expect(r.id).toBe(4));
    const req = http.expectOne(`${base}/4/regenerar`);
    expect(req.request.method).toBe('POST');
    req.flush(mock);
  });

  it('consulta OT pública sin auth path', () => {
    service.consultaOtPublica('abc123').subscribe(r => expect(r.numero).toBe('OS-1'));
    const req = http.expectOne(`${environment.apiBaseUrl}/v1/consulta/ot/abc123`);
    expect(req.request.method).toBe('GET');
    req.flush({
      numero: 'OS-1',
      estadoPublico: 'En diagnóstico',
      equipoTipo: 'PORTATIL',
      equipoMarca: null,
      equipoModelo: null,
      referenciaInterna: null,
      fechaRecepcion: null,
      fechaActualizacion: null,
      mensaje: 'OK'
    });
  });
});
