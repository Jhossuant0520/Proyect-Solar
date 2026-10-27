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

  describe('barra de búsqueda y selector de categorías', () => {
    const inversor: CatalogoProducto = {
      ...producto,
      id: 2,
      nombre: 'Inversor 3kW',
      marca: 'Growatt',
      descripcion: 'On-grid',
      categoriaId: 20,
      categoriaNombre: 'Inversores',
      disponibilidad: 'AGOTADO'
    };

    beforeEach(() => {
      catalogoService.listarProductos.and.returnValue(of([producto, inversor]));
      catalogoService.listarCategorias.and.returnValue(of([
        { id: 10, codigo: 'PAN', nombre: 'Paneles' },
        { id: 20, codigo: 'INV', nombre: 'Inversores' }
      ]));
    });

    function el(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    it('sustituye los chips por un selector con «Todas las categorías»', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      expect(el().querySelector('.filters')).toBeNull();
      const trigger = el().querySelector<HTMLButtonElement>('#catalog-cat-trigger')!;
      expect(trigger.textContent).toContain('Todas las categorías');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(el().querySelector('#catalog-count')!.textContent).toContain('2');
    }));

    it('abre, selecciona con ratón y cierra el desplegable', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      el().querySelector<HTMLButtonElement>('#catalog-cat-trigger')!.click();
      fixture.detectChanges();
      const opciones = el().querySelectorAll<HTMLElement>('[role="option"]');
      expect(opciones.length).toBe(3);

      opciones[2].click();
      fixture.detectChanges();
      expect(component.categoriaSeleccionadaId).toBe(20);
      expect(component.categoriaMenuAbierto).toBeFalse();
      expect(el().querySelector('[role="listbox"]')).toBeNull();
      expect(el().querySelector('#catalog-cat-trigger')!.textContent).toContain('Inversores');
      expect(component.productosFiltrados.map(p => p.id)).toEqual([2]);
    }));

    it('permite seleccionar con teclado y cerrar con Escape', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const trigger = el().querySelector<HTMLButtonElement>('#catalog-cat-trigger')!;
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();
      const listbox = el().querySelector<HTMLElement>('[role="listbox"]')!;
      expect(listbox).toBeTruthy();

      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(component.categoriaSeleccionadaId).toBe(10);
      expect(component.categoriaMenuAbierto).toBeFalse();

      component.abrirMenuCategoria();
      fixture.detectChanges();
      el().querySelector<HTMLElement>('[role="listbox"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(component.categoriaMenuAbierto).toBeFalse();
      expect(component.categoriaSeleccionadaId).toBe(10);
    }));

    it('combina búsqueda y categoría y muestra vacío recuperable', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.seleccionarCategoria(10);
      component.busqueda = 'growatt';
      fixture.detectChanges();
      expect(component.productosFiltrados.length).toBe(0);
      expect(el().textContent).toContain('No hay productos con ese filtro.');

      component.seleccionarCategoria(20);
      fixture.detectChanges();
      expect(component.productosFiltrados.map(p => p.id)).toEqual([2]);
      expect(el().querySelector('#catalog-count')!.textContent).toContain('1');

      el().querySelector<HTMLButtonElement>('#catalog-clear-filters')!.click();
      fixture.detectChanges();
      expect(component.busqueda).toBe('');
      expect(component.categoriaSeleccionadaId).toBeNull();
      expect(component.productosFiltrados.length).toBe(2);
      expect(el().querySelector('#catalog-clear-filters')).toBeNull();
    }));
  });
});
