import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CotizacionComercialService } from './cotizacion-comercial.service';
import { environment } from '../../../environments/environment';

describe('CotizacionComercialService', () => {
  let service: CotizacionComercialService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/v1/cotizaciones-comerciales`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CotizacionComercialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista paginado con búsqueda y estado', () => {
    service.listar({ q: ' CC-2026 ', estado: 'BORRADOR', pagina: 2, tamano: 20 }).subscribe();
    const req = http.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('CC-2026');
    expect(req.request.params.get('estado')).toBe('BORRADOR');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('20');
    req.flush({ contenido: [], pagina: 2, tamano: 20, totalElementos: 0, totalPaginas: 0 });
  });

  it('edita con PUT sobre el mismo id', () => {
    service.actualizar(7, { clienteId: null, detalles: [] }).subscribe();
    const req = http.expectOne(`${base}/7`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('transiciones y PDF usan sus endpoints', () => {
    service.presentar(7).subscribe();
    http.expectOne(`${base}/7/presentar`).flush({});
    service.rechazar(7, 'Muy caro').subscribe();
    const rechazo = http.expectOne(`${base}/7/rechazar`);
    expect(rechazo.request.body).toEqual({ observacion: 'Muy caro' });
    rechazo.flush({});
    service.descargarPdf(7, 3, 'inline').subscribe();
    const pdf = http.expectOne(r => r.url === `${base}/7/documentos/3/pdf`);
    expect(pdf.request.params.get('disposition')).toBe('inline');
    expect(pdf.request.responseType).toBe('blob');
    pdf.flush(new Blob());
  });
});
