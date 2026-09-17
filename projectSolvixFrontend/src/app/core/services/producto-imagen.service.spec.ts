import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductoService } from './producto.service';
import { environment } from '../../../environments/environment';

describe('ProductoService imagen', () => {
  let service: ProductoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ProductoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sube imagen multipart al endpoint correcto', () => {
    const archivo = new File([new Uint8Array([1, 2, 3])], 'cam.jpg', { type: 'image/jpeg' });

    service.subirImagen(7, archivo).subscribe(producto => {
      expect(producto.imagenUrl).toContain('/api/v1/productos/imagenes/');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/v1/productos/7/imagen`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({
      id: 7,
      nombre: 'Cámara',
      marca: 'H9C',
      imagenUrl: '/api/v1/productos/imagenes/uuid.jpg'
    });
  });

  it('elimina imagen con DELETE', () => {
    service.eliminarImagen(7).subscribe(producto => {
      expect(producto.imagenUrl).toBeUndefined();
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/v1/productos/7/imagen`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 7, nombre: 'Cámara', marca: 'H9C' });
  });
});
