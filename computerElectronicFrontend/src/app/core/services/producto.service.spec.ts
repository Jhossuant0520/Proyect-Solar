import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductoService } from './producto.service';
import { environment } from '../../../environments/environment';

describe('ProductoService código de barras', () => {
  let service: ProductoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ProductoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta producto por código de barras', () => {
    service.obtenerPorCodigoBarras('7701234567890').subscribe(producto => {
      expect(producto.codigoBarras).toBe('7701234567890');
      expect(producto.nombre).toBe('Cámara H9C');
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/v1/productos/codigo-barras/7701234567890`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 1,
      nombre: 'Cámara H9C',
      marca: 'Hikvision',
      codigoBarras: '7701234567890',
      categoriaId: 1,
      precioVentaActual: 1000,
      stockActual: 1,
      activo: true
    });
  });
});
