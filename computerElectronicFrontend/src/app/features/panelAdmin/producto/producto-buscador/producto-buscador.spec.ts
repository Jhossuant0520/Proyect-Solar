import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProductoBuscadorComponent, DEBOUNCE_BUSQUEDA_MS } from './producto-buscador';
import { ProductoService } from '../../../../core/services/producto.service';
import { ProductoModel } from '../productoClase';

function producto(parcial: Partial<ProductoModel>): ProductoModel {
  return {
    id: 1,
    nombre: 'Pantalla Lenovo X',
    marca: 'Lenovo',
    categoriaId: 1,
    precioVentaActual: 180000,
    stockActual: 2,
    ...parcial
  };
}

describe('ProductoBuscadorComponent', () => {
  let fixture: ComponentFixture<ProductoBuscadorComponent>;
  let component: ProductoBuscadorComponent;
  let productoService: jasmine.SpyObj<ProductoService>;

  beforeEach(async () => {
    productoService = jasmine.createSpyObj<ProductoService>('ProductoService', ['buscar', 'listar']);
    await TestBed.configureTestingModule({
      imports: [ProductoBuscadorComponent],
      providers: [{ provide: ProductoService, useValue: productoService }]
    }).compileComponents();
    fixture = TestBed.createComponent(ProductoBuscadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function escribir(texto: string): void {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
  }

  it('no descarga el catálogo al montar; 1 carácter no busca textual; focus pide preview', fakeAsync(() => {
    expect(productoService.buscar).not.toHaveBeenCalled();
    expect(productoService.listar).not.toHaveBeenCalled();

    productoService.buscar.and.returnValue(of([producto({})]));
    escribir('p');
    tick(DEBOUNCE_BUSQUEDA_MS);
    fixture.detectChanges();
    expect(productoService.buscar.calls.allArgs().every(a => a[0] === '')).toBeTrue();

    productoService.buscar.calls.reset();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    tick();
    fixture.detectChanges();
    // cache de preview: no nueva petición
    expect(productoService.buscar).not.toHaveBeenCalled();
    expect(component.estado).toBe('preview');
    expect(fixture.nativeElement.textContent).toContain('Productos disponibles');
  }));

  it('aplica debounce: una sola consulta al servidor con límite', fakeAsync(() => {
    productoService.buscar.and.returnValue(
      of([producto({}), producto({ id: 2, nombre: 'Pantalla Lenovo Y', stockActual: 0, precioVentaActual: 160000 })])
    );
    escribir('pan');
    tick(100);
    escribir('pantalla len');
    tick(100);
    escribir('pantalla lenovo');
    tick(DEBOUNCE_BUSQUEDA_MS);
    fixture.detectChanges();

    expect(productoService.buscar).toHaveBeenCalledTimes(1);
    expect(productoService.buscar).toHaveBeenCalledWith('pantalla lenovo', 10);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pantalla Lenovo X');
    expect(text).toContain('Stock 0');
  }));

  it('D.3: preview conserva ✓ Agregado con idsAgregados reales', fakeAsync(() => {
    productoService.buscar.and.returnValue(of([producto({ id: 10 })]));
    component.idsAgregados = [10];
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('✓ Agregado');
  }));

  it('emite el producto seleccionado', fakeAsync(() => {
    productoService.buscar.and.returnValue(of([producto({})]));
    const emitidos: ProductoModel[] = [];
    component.seleccionado.subscribe(p => emitidos.push(p));
    escribir('pantalla');
    tick(DEBOUNCE_BUSQUEDA_MS);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.resultados button') as HTMLButtonElement).click();
    expect(emitidos.map(p => p.id)).toEqual([1]);
  }));

  it('sin resultados ofrece crear producto con el texto buscado', fakeAsync(() => {
    productoService.buscar.and.returnValue(of([]));
    const pedidos: string[] = [];
    component.crearSolicitado.subscribe(t => pedidos.push(t));
    escribir('tarjeta xyz');
    tick(DEBOUNCE_BUSQUEDA_MS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No encontramos resultados para');
    (fixture.nativeElement.querySelector('.crear') as HTMLButtonElement).click();
    expect(pedidos).toEqual(['tarjeta xyz']);
  }));

  it('muestra error si la búsqueda falla y permite reintentar', fakeAsync(() => {
    productoService.buscar.and.returnValue(throwError(() => new Error('500')));
    escribir('pantalla');
    tick(DEBOUNCE_BUSQUEDA_MS);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No fue posible cargar los resultados');

    productoService.buscar.and.returnValue(of([producto({})]));
    escribir('pantalla l');
    tick(DEBOUNCE_BUSQUEDA_MS);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pantalla Lenovo X');
  }));

  it('marca producto ya agregado y emite yaAgregado sin seleccionar de nuevo', fakeAsync(() => {
    productoService.buscar.and.returnValue(of([producto({ id: 10 })]));
    component.idsAgregados = [10];
    const seleccionados: unknown[] = [];
    const ya: unknown[] = [];
    component.seleccionado.subscribe(p => seleccionados.push(p));
    component.yaAgregado.subscribe(p => ya.push(p));
    escribir('pantalla');
    tick(DEBOUNCE_BUSQUEDA_MS);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('✓ Agregado');
    (fixture.nativeElement.querySelector('.resultados button') as HTMLButtonElement).click();
    expect(seleccionados.length).toBe(0);
    expect(ya.length).toBe(1);
  }));
});
