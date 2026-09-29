import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { CotizacionFormDialogComponent, CotizacionFormDialogData } from './cotizacion-form-dialog';
import { CotizacionServicioService } from '../../../../../core/services/cotizacion-servicio.service';
import { OrdenServicioService } from '../../../../../core/services/orden-servicio.service';
import { ProductoService } from '../../../../../core/services/producto.service';
import { CotizacionServicioResponseDTO } from '../../../../../core/models/cotizacion-servicio.models';
import { ProductoModel } from '../../../producto/productoClase';

function cotizacion(parcial: Partial<CotizacionServicioResponseDTO> = {}): CotizacionServicioResponseDTO {
  return {
    id: 44,
    ordenServicioId: 12,
    numero: 'COT-2026-000044',
    tipo: 'INICIAL',
    estado: 'BORRADOR',
    fechaCreacion: null,
    fechaPresentacion: null,
    fechaAprobacion: null,
    fechaRechazo: null,
    usuarioCreacion: 'admin',
    usuarioPresentacion: null,
    usuarioAprobacion: null,
    usuarioRechazo: null,
    subtotal: 330000,
    total: 330000,
    subtotalRepuestos: 250000,
    subtotalManoObra: 80000,
    subtotalOtros: 0,
    observaciones: null,
    motivoAmpliacion: null,
    detalles: [
      {
        id: 1,
        tipo: 'REPUESTO',
        descripcion: 'Pantalla Lenovo',
        cantidad: 1,
        precioUnitario: 250000,
        subtotal: 250000,
        productoId: 123,
        productoNombreSnapshot: 'Pantalla Lenovo',
        ordenServicioRepuestoId: null
      },
      {
        id: 2,
        tipo: 'MANO_OBRA',
        descripcion: 'Reparación',
        cantidad: 1,
        precioUnitario: 80000,
        subtotal: 80000,
        productoId: null,
        productoNombreSnapshot: null,
        ordenServicioRepuestoId: null
      }
    ],
    puedeEditar: true,
    puedePresentar: true,
    puedeAprobar: false,
    puedeRechazar: false,
    ...parcial
  };
}

const PRODUCTO_NUEVO: ProductoModel = {
  id: 900,
  nombre: 'Tarjeta especial XYZ',
  marca: 'Genérica',
  categoriaId: 1,
  precioVentaActual: 200000,
  stockActual: 1
};

describe('CotizacionFormDialogComponent', () => {
  let fixture: ComponentFixture<CotizacionFormDialogComponent>;
  let component: CotizacionFormDialogComponent;
  let cotizacionService: jasmine.SpyObj<CotizacionServicioService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CotizacionFormDialogComponent>>;

  async function crear(data: CotizacionFormDialogData): Promise<void> {
    cotizacionService = jasmine.createSpyObj('CotizacionServicioService', [
      'crearInicial',
      'crearAdicional',
      'actualizar'
    ]);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    const ordenService = jasmine.createSpyObj('OrdenServicioService', ['listarRepuestos']);
    ordenService.listarRepuestos.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CotizacionFormDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: CotizacionServicioService, useValue: cotizacionService },
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: ProductoService, useValue: jasmine.createSpyObj('ProductoService', ['buscar']) },
        { provide: MatDialog, useValue: dialog },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();

    fixture = TestBed.createComponent(CotizacionFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('abre la cotización existente como tabla de líneas con total', async () => {
    await crear({ ordenId: 12, modo: 'editar', cotizacion: cotizacion() });
    const text = fixture.nativeElement.textContent as string;
    expect(component.detalles.length).toBe(2);
    expect(text).toContain('Pantalla Lenovo');
    expect(text).toContain('Reparación');
    expect(component.total).toBe(330000);
  });

  it('agrega repuesto seleccionando un producto real y congela el precio cotizado', async () => {
    await crear({ ordenId: 12, modo: 'inicial' });
    component.nuevaLinea('REPUESTO');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-producto-buscador')).not.toBeNull();

    component.seleccionarProducto({ ...PRODUCTO_NUEVO, id: 123, nombre: 'Pantalla Lenovo X', precioVentaActual: 180000 });
    expect(component.editor.get('precioUnitario')?.value).toBe(180000);
    component.editor.patchValue({ precioUnitario: 250000, cantidad: 1 });
    component.aplicarEditor();

    expect(component.detalles.length).toBe(1);
    expect(component.detalles.at(0).get('productoId')?.value).toBe(123);
    expect(component.total).toBe(250000);
  });

  it('crea producto desde la cotización y queda seleccionado en la línea', async () => {
    await crear({ ordenId: 12, modo: 'inicial' });
    dialog.open.and.returnValue({ afterClosed: () => of(PRODUCTO_NUEVO) } as never);

    component.nuevaLinea('REPUESTO');
    component.crearProducto('tarjeta xyz');

    expect(dialog.open).toHaveBeenCalled();
    expect(component.editor.get('productoId')?.value).toBe(900);
    expect(component.editor.get('productoNombre')?.value).toBe('Tarjeta especial XYZ');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tarjeta especial XYZ');
  });

  it('valida: repuesto sin producto y mano de obra sin concepto no se aplican', async () => {
    await crear({ ordenId: 12, modo: 'inicial' });
    component.nuevaLinea('REPUESTO');
    component.editor.patchValue({ precioUnitario: 1000 });
    component.aplicarEditor();
    expect(component.editorError).toContain('producto');
    expect(component.detalles.length).toBe(0);

    component.nuevaLinea('MANO_OBRA');
    component.editor.patchValue({ precioUnitario: 1000, descripcion: '' });
    component.aplicarEditor();
    expect(component.editorError).toContain('concepto');

    component.editor.patchValue({ descripcion: 'Diagnóstico', cantidad: 0 });
    component.aplicarEditor();
    expect(component.editorError).toContain('cantidad');

    component.editor.patchValue({ cantidad: 1, precioUnitario: -5 });
    component.aplicarEditor();
    expect(component.editorError).toContain('negativo');
  });

  it('edita cantidad y precio, elimina línea y guarda con PUT sobre la misma cotización', async () => {
    await crear({ ordenId: 12, modo: 'editar', cotizacion: cotizacion() });
    cotizacionService.actualizar.and.returnValue(of(cotizacion()));

    component.editarLinea(0);
    component.editor.patchValue({ cantidad: 2, precioUnitario: 240000 });
    component.aplicarEditor();
    component.quitarLinea(1);
    expect(component.total).toBe(480000);

    component.guardar();

    expect(cotizacionService.crearInicial).not.toHaveBeenCalled();
    expect(cotizacionService.actualizar).toHaveBeenCalledTimes(1);
    const [ordenId, cotId, body] = cotizacionService.actualizar.calls.mostRecent().args;
    expect(ordenId).toBe(12);
    expect(cotId).toBe(44);
    expect(body.detalles.length).toBe(1);
    expect(body.detalles[0]).toEqual(
      jasmine.objectContaining({ tipo: 'REPUESTO', productoId: 123, cantidad: 2, precioUnitario: 240000 })
    );
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('no guarda con una línea abierta en el editor ni con total cero', async () => {
    await crear({ ordenId: 12, modo: 'inicial' });
    component.nuevaLinea('MANO_OBRA');
    component.guardar();
    expect(component.error).toContain('Aplica o descarta');

    component.editor.patchValue({ descripcion: 'Revisión', precioUnitario: 0 });
    component.aplicarEditor();
    component.guardar();
    expect(component.error).toContain('mayor que cero');
    expect(cotizacionService.crearInicial).not.toHaveBeenCalled();
  });

  it('avisa que editar una cotización presentada la devuelve a borrador', async () => {
    await crear({
      ordenId: 12,
      modo: 'editar',
      cotizacion: cotizacion({ estado: 'PENDIENTE_APROBACION', puedePresentar: false })
    });
    expect(fixture.nativeElement.textContent).toContain('vuelve a borrador');
  });
});
