import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProveedorListComponent } from './proveedor-list';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { MatDialog } from '@angular/material/dialog';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';

describe('ProveedorListComponent', () => {
  let fixture: ComponentFixture<ProveedorListComponent>;
  let component: ProveedorListComponent;

  const proveedores: ProveedorResponseDTO[] = [{
    id: 1,
    nombre: 'Acme SAS',
    razonSocial: 'Acme SAS',
    tipoDocumento: 'NIT',
    documento: '9001234567',
    numeroDocumento: '9001234567',
    nombreComercial: null,
    direccion: null,
    ciudad: 'Yondó',
    departamento: null,
    telefono: null,
    telefonoAlternativo: null,
    email: null,
    web: null,
    condicionPago: null,
    diasCredito: null,
    contacto: null,
    notas: null,
    activo: true,
    fechaRegistro: null,
    fechaActualizacion: null,
    contactos: []
  }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProveedorListComponent],
      providers: [
        provideRouter([]),
        { provide: ProveedorService, useValue: { listar: () => of(proveedores) } },
        { provide: SolvixFeedbackService, useValue: { success: () => undefined, warning: () => undefined, error: () => undefined } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga lista en estado ready', () => {
    expect(component.state).toBe('ready');
    expect(component.visibles.length).toBe(1);
  });

  it('filtra por búsqueda local', () => {
    component.search = 'otra';
    expect(component.visibles.length).toBe(0);
    component.search = 'acme';
    expect(component.visibles.length).toBe(1);
  });
});
