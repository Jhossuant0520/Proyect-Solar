import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { Catalog } from './catalog';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { CatalogoProducto } from '../../../../core/models/catalogo.models';

const producto: CatalogoProducto = {
  id: 1,
  nombre: 'Panel Solar 550W',
  marca: 'JA Solar',
  descripcion: 'Módulo monocristalino',
  precioVentaActual: 410000,
  imagenUrl: 'https://cdn.example/panel.jpg',
  categoriaId: 10,
  categoriaNombre: 'Paneles',
  disponibilidad: 'DISPONIBLE'
};

describe('Catalog', () => {
  let fixture: ComponentFixture<Catalog>;
  let component: Catalog;
  let catalogoService: jasmine.SpyObj<CatalogoService>;

  beforeEach(async () => {
    catalogoService = jasmine.createSpyObj('CatalogoService', [
      'listarProductos',
      'listarCategorias'
    ]);
    catalogoService.listarProductos.and.returnValue(of([producto]));
    catalogoService.listarCategorias.and.returnValue(of([
      { id: 10, codigo: 'PAN', nombre: 'Paneles' }
    ]));

    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        provideRouter([]),
        { provide: CatalogoService, useValue: catalogoService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('pasa a LOADING y luego SUCCESS al cargar productos', fakeAsync(() => {
    expect(component.viewState).toBe('LOADING');
    fixture.detectChanges();
    tick();
    expect(component.viewState).toBe('SUCCESS');
    expect(component.productos.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Panel Solar 550W');
    expect(fixture.nativeElement.textContent).toContain('Disponible');
    expect(fixture.nativeElement.textContent).not.toContain('costo');
    expect(fixture.nativeElement.textContent).not.toContain('stock');
  }));

  it('muestra EMPTY cuando la API devuelve lista vacía', fakeAsync(() => {
    catalogoService.listarProductos.and.returnValue(of([]));
    fixture.detectChanges();
    tick();
    expect(component.viewState).toBe('EMPTY');
    expect(fixture.nativeElement.textContent).toContain(
      'No hay productos disponibles en este momento.'
    );
  }));

  it('muestra ERROR y permite reintentar', fakeAsync(() => {
    catalogoService.listarProductos.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    tick();
    expect(component.viewState).toBe('ERROR');
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar el catálogo.');

    catalogoService.listarProductos.and.returnValue(of([producto]));
    component.cargar();
    tick();
    expect(component.viewState).toBe('SUCCESS');
  }));

  it('filtra por categoría y búsqueda local', fakeAsync(() => {
    catalogoService.listarProductos.and.returnValue(of([
      producto,
      {
        ...producto,
        id: 2,
        nombre: 'Inversor 3kW',
        marca: 'Growatt',
        descripcion: 'On-grid',
        categoriaId: 20,
        categoriaNombre: 'Inversores',
        disponibilidad: 'AGOTADO'
      }
    ]));
    catalogoService.listarCategorias.and.returnValue(of([
      { id: 10, codigo: 'PAN', nombre: 'Paneles' },
      { id: 20, codigo: 'INV', nombre: 'Inversores' }
    ]));

    fixture.detectChanges();
    tick();

    component.seleccionarCategoria(20);
    expect(component.productosFiltrados.length).toBe(1);
    expect(component.productosFiltrados[0].nombre).toBe('Inversor 3kW');

    component.seleccionarCategoria(null);
    component.busqueda = 'panel';
    expect(component.productosFiltrados.length).toBe(1);
  }));

  it('marca imagen rota sin romper la card', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.imagenDisponible(producto)).toBeTrue();
    component.onImagenError(producto.id);
    expect(component.imagenDisponible(producto)).toBeFalse();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin imagen');
  }));
});
