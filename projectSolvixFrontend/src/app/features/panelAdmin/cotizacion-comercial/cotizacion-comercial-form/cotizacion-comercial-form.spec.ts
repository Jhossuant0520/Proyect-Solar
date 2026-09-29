import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { CotizacionComercialFormComponent } from './cotizacion-comercial-form';
import { CotizacionComercialService } from '../../../../core/services/cotizacion-comercial.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { CotizacionComercialResponseDTO } from '../../../../core/models/cotizacion-comercial.models';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { ProductoModel } from '../../producto/productoClase';

const PANTALLA: ProductoModel = {
  id: 10,
  nombre: 'Pantalla Lenovo',
  marca: 'Lenovo',
  categoriaId: 1,
  precioVentaActual: 250000,
  stockActual: 1,
  activo: true
};

const CARLA: ClienteResponseDTO = {
  id: 5,
  nombre: 'Carla Mora',
  tipoCliente: 'PERSONA',
  consumidorFinal: false,
  tipoDocumento: 'CC',
  numeroDocumento: '1010',
  email: null,
  telefono: null,
  notas: null,
  activo: true,
  fechaRegistro: null
};

function respuesta(parcial: Partial<CotizacionComercialResponseDTO> = {}): CotizacionComercialResponseDTO {
  return {
    id: 7,
    numero: 'CC-2026-000007',
    clienteId: 5,
    clienteNombre: 'Carla Mora',
    clienteDocumento: 'CC 1010',
    clienteConsumidorFinal: false,
    estado: 'BORRADOR',
    fecha: '2026-09-20T10:00:00',
    fechaPresentacion: null,
    fechaAprobacion: null,
    fechaRechazo: null,
    fechaAnulacion: null,
    usuarioCreacion: 'admin',
    subtotal: 330000,
    total: 330000,
    subtotalProductos: 250000,
    subtotalManoObra: 80000,
    subtotalOtros: 0,
    observaciones: null,
    motivoRechazo: null,
    detalles: [
      {
        id: 1, tipo: 'PRODUCTO', descripcion: 'Pantalla Lenovo', cantidad: 1, precioUnitario: 250000,
        subtotal: 250000, productoId: 10, productoNombreSnapshot: 'Pantalla Lenovo', productoActivo: true
      },
      {
        id: 2, tipo: 'MANO_OBRA', descripcion: 'Instalación', cantidad: 1, precioUnitario: 80000,
        subtotal: 80000, productoId: null, productoNombreSnapshot: null, productoActivo: null
      }
    ],
    documentoVigente: null,
    documentoGenerado: false,
    puedeEditar: true,
    puedePresentar: true,
    puedeAprobar: false,
    puedeRechazar: false,
    puedeAnular: true,
    ...parcial
  };
}

describe('CotizacionComercialFormComponent', () => {
  let fixture: ComponentFixture<CotizacionComercialFormComponent>;
  let component: CotizacionComercialFormComponent;
  let service: jasmine.SpyObj<CotizacionComercialService>;
  let router: jasmine.SpyObj<Router>;
  let dialog: jasmine.SpyObj<MatDialog>;

  async function crear(id: string | null): Promise<void> {
    service = jasmine.createSpyObj('CotizacionComercialService', ['crear', 'actualizar', 'obtener']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const snack = jasmine.createSpyObj('MatSnackBar', ['open']);
    await TestBed.configureTestingModule({
      imports: [CotizacionComercialFormComponent, NoopAnimationsModule],
      providers: [
        { provide: CotizacionComercialService, useValue: service },
        { provide: ClienteService, useValue: jasmine.createSpyObj('ClienteService', ['buscar']) },
        { provide: ProductoService, useValue: jasmine.createSpyObj('ProductoService', ['buscar', 'listar']) },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .overrideProvider(MatSnackBar, { useValue: snack })
      .compileComponents();
    fixture = TestBed.createComponent(CotizacionComercialFormComponent);
    component = fixture.componentInstance;
  }

  it('nueva: cliente + producto + mano de obra + otro, calcula resumen y guarda con POST', async () => {
    await crear(null);
    service.crear.and.returnValue(of(respuesta()));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-cliente-buscador')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-producto-buscador')).not.toBeNull();

    component.onClienteSeleccionado(CARLA);
    component.agregarProducto(PANTALLA);
    component.agregarProducto({ ...PANTALLA, id: 11, nombre: 'Batería', precioVentaActual: 120000 });
    component.lineas[1].patchValue({ cantidad: 2 });
    component.agregarManoObra();
    component.lineas[2].patchValue({ descripcion: 'Instalación', precioUnitario: 80000 });
    component.agregarOtro();
    component.lineas[3].patchValue({ descripcion: 'Transporte', precioUnitario: 15000 });
    component.lineas[0].patchValue({ precioUnitario: 250000 });
    fixture.detectChanges();

    expect(component.subtotalProductos).toBe(490000);
    expect(component.subtotalManoObra).toBe(80000);
    expect(component.subtotalOtros).toBe(15000);
    expect(component.total).toBe(585000);

    component.guardar();

    const request = service.crear.calls.mostRecent().args[0];
    expect(request.clienteId).toBe(5);
    expect(request.detalles.map(d => d.tipo)).toEqual(['PRODUCTO', 'PRODUCTO', 'MANO_OBRA', 'OTRO']);
    expect(request.detalles[0]).toEqual(jasmine.objectContaining({ productoId: 10, cantidad: 1, precioUnitario: 250000 }));
    expect(request.detalles[2].productoId).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/cotizaciones', 7]);
  });

  it('no guarda sin líneas ni con mano de obra sin descripción', async () => {
    await crear(null);
    fixture.detectChanges();

    component.guardar();
    expect(component.submitError).toContain('al menos una línea');

    component.agregarManoObra();
    component.lineas[0].patchValue({ precioUnitario: 50000 });
    component.guardar();
    expect(component.submitError).toContain('Revisa');
    expect(service.crear).not.toHaveBeenCalled();
  });

  it('editar: carga la misma cotización y guarda con PUT sobre el mismo id', async () => {
    await crear('7');
    service.obtener.and.returnValue(of(respuesta({ estado: 'PENDIENTE_APROBACION' })));
    service.actualizar.and.returnValue(of(respuesta()));
    fixture.detectChanges();

    expect(component.lineas.length).toBe(2);
    expect(component.cliente?.id).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('vuelve a borrador');

    component.lineas[1].patchValue({ precioUnitario: 90000 });
    component.guardar();

    expect(service.crear).not.toHaveBeenCalled();
    expect(service.actualizar).toHaveBeenCalledWith(7, jasmine.objectContaining({ clienteId: 5 }));
    expect(service.actualizar.calls.mostRecent().args[1].detalles[1].precioUnitario).toBe(90000);
  });

  it('una cotización aprobada no se abre para edición', async () => {
    await crear('7');
    service.obtener.and.returnValue(of(respuesta({ estado: 'APROBADA', puedeEditar: false })));
    fixture.detectChanges();

    expect(component.cargaEstado).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('ya no se puede editar');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('crear producto rápido lo agrega como línea', async () => {
    await crear(null);
    dialog.open.and.returnValue({ afterClosed: () => of(PANTALLA) } as never);
    fixture.detectChanges();

    component.crearProducto('Pantalla');
    expect(component.lineas.length).toBe(1);
    expect(component.lineas[0].get('productoId')?.value).toBe(10);
  });

  it('máximo una MANO_OBRA: oculta el chip, protege agregarManoObra y reaparece al eliminar', async () => {
    await crear(null);
    fixture.detectChanges();

    expect(component.tieneManoObra).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-testid="chip-mano-obra"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="chip-otro"]')).not.toBeNull();

    component.agregarManoObra();
    fixture.detectChanges();
    expect(component.tieneManoObra).toBeTrue();
    expect(component.lineas.length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="chip-mano-obra"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="chip-otro"]')).not.toBeNull();

    component.agregarManoObra();
    expect(component.lineas.length).toBe(1);

    component.agregarProducto(PANTALLA);
    component.agregarOtro();
    expect(component.lineas.map(l => l.get('tipo')?.value)).toEqual(['MANO_OBRA', 'PRODUCTO', 'OTRO']);

    component.quitarLinea(0);
    fixture.detectChanges();
    expect(component.tieneManoObra).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-testid="chip-mano-obra"]')).not.toBeNull();
  });

  it('producto ya agregado muestra estado y no duplica línea', async () => {
    await crear(null);
    fixture.detectChanges();
    component.agregarProducto(PANTALLA);
    expect(component.lineas.length).toBe(1);
    expect(component.productoYaAgregado(10)).toBeTrue();
    component.agregarProducto(PANTALLA);
    expect(component.lineas.length).toBe(1);
  });

  it('editar cotización con MANO_OBRA existente oculta el chip', async () => {
    await crear('7');
    service.obtener.and.returnValue(of(respuesta()));
    fixture.detectChanges();

    expect(component.tieneManoObra).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="chip-mano-obra"]')).toBeNull();
    component.agregarManoObra();
    expect(component.lineas.filter(l => l.get('tipo')?.value === 'MANO_OBRA').length).toBe(1);
  });

  function etiquetasResumen(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.facts > div dt') as NodeListOf<HTMLElement>)
      .map(el => el.textContent?.trim() ?? '');
  }

  it('D.6 resumen: solo productos oculta mano de obra y otros', async () => {
    await crear(null);
    fixture.detectChanges();
    component.onClienteSeleccionado(CARLA);
    component.agregarProducto(PANTALLA);
    fixture.detectChanges();

    expect(etiquetasResumen()).toEqual(['Productos', 'Total']);
    expect(component.subtotalProductos).toBe(250000);
    expect(component.total).toBe(250000);
  });

  it('D.6 resumen: productos + mano de obra; otros en 0 no aparece', async () => {
    await crear(null);
    fixture.detectChanges();
    component.agregarProducto(PANTALLA);
    component.agregarManoObra();
    component.lineas[1].patchValue({ descripcion: 'Instalación', precioUnitario: 80000 });
    fixture.detectChanges();

    expect(etiquetasResumen()).toEqual(['Productos', 'Mano de obra', 'Total']);
    expect(component.subtotalOtros).toBe(0);
  });

  it('D.6 resumen: productos + otros; mano de obra 0 no aparece', async () => {
    await crear(null);
    fixture.detectChanges();
    component.agregarProducto(PANTALLA);
    component.agregarOtro();
    component.lineas[1].patchValue({ descripcion: 'Transporte', precioUnitario: 15000 });
    fixture.detectChanges();

    expect(etiquetasResumen()).toEqual(['Productos', 'Otros conceptos', 'Total']);
  });

  it('D.6 resumen: los tres conceptos cuando importe > 0', async () => {
    await crear(null);
    fixture.detectChanges();
    component.agregarProducto(PANTALLA);
    component.agregarManoObra();
    component.lineas[1].patchValue({ descripcion: 'Instalación', precioUnitario: 80000 });
    component.agregarOtro();
    component.lineas[2].patchValue({ descripcion: 'Transporte', precioUnitario: 15000 });
    fixture.detectChanges();

    expect(etiquetasResumen()).toEqual(['Productos', 'Mano de obra', 'Otros conceptos', 'Total']);
    expect(component.total).toBe(345000);
  });

  it('D.6 resumen: solo mano de obra', async () => {
    await crear(null);
    fixture.detectChanges();
    component.agregarManoObra();
    component.lineas[0].patchValue({ descripcion: 'Diagnóstico', precioUnitario: 50000 });
    fixture.detectChanges();

    expect(etiquetasResumen()).toEqual(['Mano de obra', 'Total']);
    expect(component.total).toBe(50000);
  });

  it('D.6 resumen: solo otros conceptos; línea con precio 0 no muestra categoría', async () => {
    await crear(null);
    fixture.detectChanges();
    component.agregarOtro();
    component.lineas[0].patchValue({ descripcion: 'Sin valor', precioUnitario: 0 });
    fixture.detectChanges();
    expect(etiquetasResumen()).toEqual(['Total']);

    component.lineas[0].patchValue({ precioUnitario: 12000 });
    fixture.detectChanges();
    expect(etiquetasResumen()).toEqual(['Otros conceptos', 'Total']);
    expect(component.total).toBe(12000);
  });
});
