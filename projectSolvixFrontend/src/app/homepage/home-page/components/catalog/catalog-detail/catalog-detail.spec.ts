import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { CatalogDetail } from './catalog-detail';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { CatalogoProducto } from '../../../../../core/models/catalogo.models';

const producto: CatalogoProducto = {
  id: 5,
  nombre: 'Batería 5kWh',
  marca: 'Pylontech',
  descripcion: 'Litio',
  precioVentaActual: 1200000,
  imagenUrl: null,
  categoriaId: 3,
  categoriaNombre: 'Almacenamiento',
  disponibilidad: 'DISPONIBLE'
};

describe('CatalogDetail', () => {
  let fixture: ComponentFixture<CatalogDetail>;
  let catalogoService: jasmine.SpyObj<CatalogoService>;

  beforeEach(async () => {
    catalogoService = jasmine.createSpyObj('CatalogoService', ['obtenerProducto']);
    catalogoService.obtenerProducto.and.returnValue(of(producto));

    await TestBed.configureTestingModule({
      imports: [CatalogDetail],
      providers: [
        provideRouter([]),
        { provide: CatalogoService, useValue: catalogoService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '5' }))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogDetail);
  });

  it('carga ficha pública por id', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(fixture.nativeElement.textContent).toContain('Batería 5kWh');
    expect(fixture.nativeElement.textContent).toContain('Pylontech');
    expect(fixture.nativeElement.textContent).toContain('Contactar');
    expect(fixture.nativeElement.textContent).toContain('Sin imagen');
  }));

  it('muestra error si el producto no existe', fakeAsync(() => {
    catalogoService.obtenerProducto.and.returnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();
    tick();
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar este producto.');
  }));
});
