import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ServicioRecepcionDialogComponent,
  ServicioRecepcionDialogData
} from './servicio-recepcion-dialog';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { EquipoResponseDTO } from '../../../../core/models/equipo.models';
import { SolvixSignaturePadComponent } from '../../../../shared/components/solvix-signature-pad/solvix-signature-pad';

const cliente: ClienteResponseDTO = {
  id: 1,
  nombre: 'Ana Ruiz',
  tipoCliente: 'PERSONA',
  consumidorFinal: false,
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  email: null,
  telefono: '300',
  notas: null,
  activo: true,
  fechaRegistro: null
};

const equipo: EquipoResponseDTO = {
  id: 2,
  clienteId: 1,
  clienteNombre: 'Ana Ruiz',
  tipoEquipo: 'PORTATIL',
  marca: 'Dell',
  modelo: 'XPS',
  numeroSerie: null,
  referenciaInterna: null,
  observaciones: null,
  activo: true,
  fechaRegistro: null
};

const data: ServicioRecepcionDialogData = {
  request: {
    clienteId: 1,
    equipoId: 2,
    problemaReportado: 'No enciende',
    diagnostico: null,
    trabajoRealizado: null,
    observaciones: null
  },
  cliente,
  equipo
};

describe('ServicioRecepcionDialogComponent', () => {
  let fixture: ComponentFixture<ServicioRecepcionDialogComponent>;
  let component: ServicioRecepcionDialogComponent;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ServicioRecepcionDialogComponent>>;

  beforeEach(async () => {
    ordenService = jasmine.createSpyObj('OrdenServicioService', ['crear']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    ordenService.crear.and.returnValue(
      of({
        id: 10,
        numero: 'OS-2026-000010',
        clienteId: 1,
        clienteNombre: 'Ana Ruiz',
        equipoId: 2,
        equipoTipo: 'PORTATIL',
        equipoMarca: 'Dell',
        equipoModelo: 'XPS',
        equipoNombre: null,
        estado: 'RECEPCIONADO',
        problemaReportado: 'No enciende',
        diagnostico: null,
        trabajoRealizado: null,
        observaciones: null,
        fechaRecepcion: null,
        fechaActualizacion: null,
        fechaCierre: null,
        createdBy: 'admin'
      })
    );

    await TestBed.configureTestingModule({
      imports: [ServicioRecepcionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioRecepcionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('rechaza confirmar sin firma', () => {
    component.form.patchValue({ clienteConfirmo: true, nombreFirmante: 'Ana' });
    component.firmado = false;
    component.registrar();
    expect(component.error).toContain('firma');
    expect(ordenService.crear).not.toHaveBeenCalled();
  });

  it('rechaza sin confirmación', () => {
    component.form.patchValue({ clienteConfirmo: false, nombreFirmante: 'Ana' });
    component.firmado = true;
    spyOn(SolvixSignaturePadComponent.prototype, 'getFirmaBase64').and.returnValue(
      'data:image/png;base64,abc'
    );
    component.pad = {
      getFirmaBase64: () => 'data:image/png;base64,abc'
    } as SolvixSignaturePadComponent;
    component.registrar();
    expect(component.error).toContain('confirmación');
    expect(ordenService.crear).not.toHaveBeenCalled();
  });

  it('confirma recepción firmada y cierra con resultado', fakeAsync(() => {
    component.form.patchValue({
      clienteConfirmo: true,
      nombreFirmante: 'Ana Ruiz',
      documentoFirmante: '123'
    });
    component.firmado = true;
    component.pad = {
      getFirmaBase64: () => 'data:image/png;base64,abc'
    } as SolvixSignaturePadComponent;
    component.registrar();
    tick();
    expect(ordenService.crear).toHaveBeenCalledWith(
      jasmine.objectContaining({
        clienteConfirmoRecepcion: true,
        firmaBase64Recepcion: 'data:image/png;base64,abc',
        nombreFirmanteRecepcion: 'Ana Ruiz'
      })
    );
    expect(dialogRef.close).toHaveBeenCalledWith({ ordenId: 10, numero: 'OS-2026-000010' });
  }));

  it('muestra error si el backend falla', fakeAsync(() => {
    ordenService.crear.and.returnValue(throwError(() => ({ status: 400, error: { message: 'x' } })));
    component.form.patchValue({
      clienteConfirmo: true,
      nombreFirmante: 'Ana'
    });
    component.firmado = true;
    component.pad = {
      getFirmaBase64: () => 'data:image/png;base64,abc'
    } as SolvixSignaturePadComponent;
    component.registrar();
    tick();
    expect(component.enviando).toBeFalse();
    expect(component.error).toBeTruthy();
    expect(dialogRef.close).not.toHaveBeenCalled();
  }));

  it('D.9: card limpia — título Firma del cliente; sin frase larga de conformidad', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Firma del cliente');
    expect(text).toContain('Confirmar recepción');
    expect(text).toContain('Limpiar');
    expect(text).toContain('Confirmo la recepción');
    expect(text).not.toContain(
      'El cliente confirma la recepción del equipo por parte del taller para diagnóstico'
    );
    expect(text).not.toContain(
      'El cliente confirma la entrega del equipo al taller para diagnóstico o servicio'
    );
    expect(fixture.nativeElement.querySelector('solvix-signature-pad')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.firma-card')).not.toBeNull();
  });
});
