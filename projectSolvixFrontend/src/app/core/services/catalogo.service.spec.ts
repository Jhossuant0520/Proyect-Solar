import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CatalogoService } from './catalogo.service';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(CatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('carga productos desde /api/v1/catalogo/productos', () => {
    service.listarProductos().subscribe(productos => {
      expect(productos.length).toBe(1);
      expect(productos[0].nombre).toBe('Inversor 3kW');
      expect(productos[0].precioVentaActual).toBe(780000);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/catalogo/productos');
    expect(req.request.method).toBe('GET');
    req.flush([{
      id: 1,
      nombre: 'Inversor 3kW',
      marca: 'Growatt',
      descripcion: null,
      precioVentaActual: 780000,
      imagenUrl: null,
      categoriaId: 1,
      categoriaNombre: 'Inversores',
      disponibilidad: 'DISPONIBLE'
    }]);
  });

  it('carga categorías desde /api/v1/catalogo/categorias', () => {
    service.listarCategorias().subscribe(categorias => {
      expect(categorias).toEqual([{ id: 1, codigo: 'INV', nombre: 'Inversores' }]);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/catalogo/categorias');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, codigo: 'INV', nombre: 'Inversores' }]);
  });

  it('obtiene detalle por id', () => {
    service.obtenerProducto(9).subscribe(producto => {
      expect(producto.id).toBe(9);
      expect(producto.disponibilidad).toBe('AGOTADO');
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/catalogo/productos/9');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 9,
      nombre: 'Cable',
      marca: 'Generic',
      precioVentaActual: 20000,
      disponibilidad: 'AGOTADO'
    });
  });

  it('no llama /api/v1/productos', () => {
    service.listarProductos().subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/catalogo/productos'));
    expect(req.request.url.includes('/api/v1/productos')).toBeFalse();
    req.flush([]);
  });
});
