import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixFieldHelpComponent } from '../../../../shared/components/solvix-field-help/solvix-field-help';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import {
  aProveedorRequest,
  contactoVacio,
  valoresDesdeProveedor
} from '../proveedor-mapper';
import {
  CONDICIONES_PAGO,
  TIPOS_CONTACTO,
  mensajeErrorProveedor
} from '../proveedor-ui';

type CargaEstado = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-proveedor-form',
  standalone: true,
  templateUrl: './proveedor-form.html',
  styleUrl: './proveedor-form.scss',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixSectionHeaderComponent,
    SolvixButtonComponent,
    SolvixFieldHelpComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ProveedorFormComponent implements OnInit {
  readonly condiciones = CONDICIONES_PAGO;
  readonly tiposContacto = TIPOS_CONTACTO;

  readonly helpRazonSocial =
    'Nombre legal exacto registrado en el RUT para fines de facturación.';
  readonly helpNombreComercial =
    'Nombre de la marca o letrero del establecimiento comercial.';
  readonly helpDepartamento =
    'Requerido para cálculos futuros de impuestos territoriales o logística.';
  readonly helpCondicionesHabituales =
    'Preferencias por defecto. Se cargarán automáticamente al hacer una compra a este proveedor, pero podrán modificarse.';
  loadState: CargaEstado = 'ready';
  enviando = false;
  error = '';
  readonly form;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private proveedorService: ProveedorService,
    private feedback: SolvixFeedbackService
  ) {
    this.form = this.fb.group({
      razonSocial: ['', [Validators.required, Validators.maxLength(150)]],
      numeroDocumento: ['', [Validators.required, Validators.maxLength(40)]],
      nombreComercial: ['', Validators.maxLength(150)],
      direccion: ['', Validators.maxLength(255)],
      ciudad: ['', Validators.maxLength(100)],
      departamento: ['', Validators.maxLength(100)],
      telefono: ['', Validators.maxLength(40)],
      telefonoAlternativo: ['', Validators.maxLength(40)],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      web: ['', Validators.maxLength(200)],
      condicionPago: ['' as '' | 'CONTADO' | 'CREDITO'],
      diasCredito: [null as number | null],
      notas: ['', Validators.maxLength(500)],
      activo: [true],
      contactos: this.fb.array([])
    });
  }

  ngOnInit(): void {
    if (this.modoEdicion) {
      this.cargar();
    }
  }

  get modoEdicion(): boolean {
    return this.proveedorId != null;
  }

  get proveedorId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get contactos(): FormArray {
    return this.form.controls.contactos as FormArray;
  }

  get esCredito(): boolean {
    return this.form.controls.condicionPago.value === 'CREDITO';
  }

  cargar(): void {
    const id = this.proveedorId;
    if (id == null) {
      this.loadState = 'error';
      return;
    }
    this.loadState = 'loading';
    this.proveedorService.obtenerPorId(id).subscribe({
      next: proveedor => {
        this.aplicarProveedor(proveedor);
        this.loadState = 'ready';
      },
      error: () => {
        this.loadState = 'error';
      }
    });
  }

  agregarContacto(): void {
    this.contactos.push(this.crearContactoGroup(contactoVacio()));
  }

  quitarContacto(index: number): void {
    this.contactos.removeAt(index);
  }

  marcarPrincipal(index: number): void {
    this.contactos.controls.forEach((ctrl, i) => {
      ctrl.get('principal')?.setValue(i === index);
    });
  }

  cancelar(): void {
    if (this.proveedorId != null) {
      this.router.navigate(['/proveedores', this.proveedorId]);
      return;
    }
    this.router.navigate(['/proveedores']);
  }

  guardar(): void {
    this.error = '';
    this.sincronizarValidacionCredito();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revisa razón social, NIT, correo y condiciones de pago.';
      return;
    }

    const principales = this.contactos.controls.filter(
      c => c.value.principal && c.value.activo !== false && (c.value.nombre || '').trim()
    );
    if (principales.length > 1) {
      this.error = 'Solo puede haber un contacto principal activo.';
      return;
    }

    const raw = this.form.getRawValue();
    const contactosRaw = (raw.contactos || []) as Array<{
      id: number | null;
      nombre: string;
      cargo: string;
      telefono: string;
      celular: string;
      email: string;
      tipoContacto: 'COMERCIAL' | 'FACTURACION' | 'LOGISTICA' | 'SOPORTE' | 'OTRO';
      principal: boolean;
      activo: boolean;
    }>;
    const request = aProveedorRequest({
      razonSocial: raw.razonSocial ?? '',
      numeroDocumento: raw.numeroDocumento ?? '',
      nombreComercial: raw.nombreComercial ?? '',
      direccion: raw.direccion ?? '',
      ciudad: raw.ciudad ?? '',
      departamento: raw.departamento ?? '',
      telefono: raw.telefono ?? '',
      telefonoAlternativo: raw.telefonoAlternativo ?? '',
      email: raw.email ?? '',
      web: raw.web ?? '',
      condicionPago: raw.condicionPago || '',
      diasCredito: raw.diasCredito,
      notas: raw.notas ?? '',
      activo: raw.activo !== false,
      contactos: contactosRaw.map(c => ({
        id: c.id,
        nombre: c.nombre ?? '',
        cargo: c.cargo ?? '',
        telefono: c.telefono ?? '',
        celular: c.celular ?? '',
        email: c.email ?? '',
        tipoContacto: c.tipoContacto || 'COMERCIAL',
        principal: !!c.principal,
        activo: c.activo !== false
      }))
    });

    this.enviando = true;
    const id = this.proveedorId;
    const peticion = id == null
      ? this.proveedorService.crear(request)
      : this.proveedorService.actualizar(id, request);

    peticion.subscribe({
      next: (proveedor: ProveedorResponseDTO) => {
        this.feedback.success(id == null ? 'Proveedor creado' : 'Proveedor actualizado');
        this.router.navigate(['/proveedores', proveedor.id]);
      },
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorProveedor(err);
      }
    });
  }

  private aplicarProveedor(proveedor: ProveedorResponseDTO): void {
    const valores = valoresDesdeProveedor(proveedor);
    this.contactos.clear();
    valores.contactos.forEach(c => this.contactos.push(this.crearContactoGroup(c)));
    this.form.patchValue({
      razonSocial: valores.razonSocial,
      numeroDocumento: valores.numeroDocumento,
      nombreComercial: valores.nombreComercial,
      direccion: valores.direccion,
      ciudad: valores.ciudad,
      departamento: valores.departamento,
      telefono: valores.telefono,
      telefonoAlternativo: valores.telefonoAlternativo,
      email: valores.email,
      web: valores.web,
      condicionPago: valores.condicionPago,
      diasCredito: valores.diasCredito,
      notas: valores.notas,
      activo: valores.activo
    });
  }

  private crearContactoGroup(valores: ReturnType<typeof contactoVacio>) {
    return this.fb.group({
      id: [valores.id],
      nombre: [valores.nombre, [Validators.maxLength(150)]],
      cargo: [valores.cargo, Validators.maxLength(100)],
      telefono: [valores.telefono, Validators.maxLength(40)],
      celular: [valores.celular, Validators.maxLength(40)],
      email: [valores.email, [Validators.email, Validators.maxLength(150)]],
      tipoContacto: [valores.tipoContacto],
      principal: [valores.principal],
      activo: [valores.activo]
    });
  }

  private sincronizarValidacionCredito(): void {
    const dias = this.form.controls.diasCredito;
    if (this.esCredito) {
      dias.setValidators([Validators.required, Validators.min(1)]);
    } else {
      dias.clearValidators();
    }
    dias.updateValueAndValidity({ emitEvent: false });
  }
}
