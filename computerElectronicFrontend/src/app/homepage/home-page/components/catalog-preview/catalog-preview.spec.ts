import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CatalogoProducto } from '../../../../core/models/catalogo.models';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { CatalogPreview, seleccionarProductosPreview } from './catalog-preview';

function producto(
  partial: Partial<CatalogoProducto> & Pick<CatalogoProducto, 'id' | 'nombre'>
): CatalogoProducto {
  return {
    id: partial.id,
    nombre: partial.nombre,
    marca: partial.marca ?? 'Marca',
    descripcion: partial.descripcion ?? 'Desc',
    precioVentaActual: partial.precioVentaActual ?? 10000,
    imagenUrl: partial.imagenUrl ?? null,
    categoriaId: partial.categoriaId ?? 1,
    categoriaNombre: partial.categoriaNombre ?? 'General',
    disponibilidad: partial.disponibilidad ?? 'DISPONIBLE'
  };
}

describe('seleccionarProductosPreview', () => {
  it('filtra AGOTADO, prioriza imagen, limita a 4 y no inventa ítems', () => {
    const lista = [
      producto({ id: 1, nombre: 'A', disponibilidad: 'AGOTADO', imagenUrl: '/a.png' }),
      producto({ id: 2, nombre: 'B', disponibilidad: 'DISPONIBLE', imagenUrl: null }),
      producto({ id: 3, nombre: 'C', disponibilidad: 'DISPONIBLE', imagenUrl: '/c.png' }),
      producto({ id: 4, nombre: 'D', disponibilidad: 'DISPONIBLE', imagenUrl: '/d.png' }),
      producto({ id: 5, nombre: 'E', disponibilidad: 'DISPONIBLE', imagenUrl: '/e.png' }),
      producto({ id: 6, nombre: 'F', disponibilidad: 'DISPONIBLE', imagenUrl: '/f.png' }),
      producto({ id: 7, nombre: 'G', disponibilidad: 'DISPONIBLE', imagenUrl: null })
    ];

    const selected = seleccionarProductosPreview(lista);
    expect(selected.length).toBe(4);
    expect(selected.map(p => p.nombre)).toEqual(['C', 'D', 'E', 'F']);
    expect(selected.every(p => p.disponibilidad === 'DISPONIBLE')).toBeTrue();
  });

  it('muestra menos de 4 cuando hay menos disponibles', () => {
    const selected = seleccionarProductosPreview([
      producto({ id: 1, nombre: 'Solo', imagenUrl: '/s.png' }),
      producto({ id: 2, nombre: 'Agotado', disponibilidad: 'AGOTADO', imagenUrl: '/x.png' })
    ]);
    expect(selected.length).toBe(1);
    expect(selected[0].nombre).toBe('Solo');
  });
});

describe('CatalogPreview', () => {
  let fixture: ComponentFixture<CatalogPreview>;
  let component: CatalogPreview;
  let catalogoService: jasmine.SpyObj<CatalogoService>;

  beforeEach(async () => {
    catalogoService = jasmine.createSpyObj('CatalogoService', ['listarProductos']);
    catalogoService.listarProductos.and.returnValue(
      of([
        producto({ id: 10, nombre: 'SSD', imagenUrl: '/ssd.png', precioVentaActual: 78000 }),
        producto({ id: 11, nombre: 'Laptop', imagenUrl: '/lap.png' })
      ])
    );

    await TestBed.configureTestingModule({
      imports: [CatalogPreview],
      providers: [
        provideRouter([]),
        { provide: CatalogoService, useValue: catalogoService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogPreview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga productos reales desde CatalogoService.listarProductos', () => {
    expect(catalogoService.listarProductos).toHaveBeenCalled();
    expect(component.viewState).toBe('SUCCESS');
    expect(component.products.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('SSD');
    expect(fixture.nativeElement.textContent).toContain('Disponible');
    expect(fixture.nativeElement.textContent).not.toContain('Garantía 1 año');
    expect(fixture.nativeElement.querySelector('a[href="/Catalogo/10"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/Catalogo"]')).toBeTruthy();
  });

  it('muestra empty sin inventar productos', () => {
    catalogoService.listarProductos.and.returnValue(of([]));
    component.cargar();
    fixture.detectChanges();
    expect(component.viewState).toBe('EMPTY');
    expect(component.products.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No hay productos disponibles');
  });

  it('muestra error amigable con CTA al catálogo', () => {
    catalogoService.listarProductos.and.returnValue(throwError(() => new Error('fail')));
    component.cargar();
    fixture.detectChanges();
    expect(component.viewState).toBe('ERROR');
    expect(component.products.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar');
    expect(fixture.nativeElement.querySelector('a[href="/Catalogo"]')).toBeTruthy();
  });
});
