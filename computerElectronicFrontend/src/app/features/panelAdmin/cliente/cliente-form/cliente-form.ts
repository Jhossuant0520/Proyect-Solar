import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CeButtonComponent } from '../../../../shared/components/ce-button/ce-button';
import { CeErrorStateComponent } from '../../../../shared/components/ce-error-state/ce-error-state';
import { CeLoadingStateComponent } from '../../../../shared/components/ce-loading-state/ce-loading-state';
import { CePageHeaderComponent } from '../../../../shared/components/ce-page-header/ce-page-header';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { aClienteRequest, ClienteFormValores, valoresDesdeCliente } from '../cliente-mapper';
import {
  MENSAJE_CONSUMIDOR_RESERVADO,
  TIPOS_CLIENTE_ALTA,
  TIPOS_DOCUMENTO,
  esConsumidorFinal,
  mensajeErrorCliente
} from '../cliente-ui';

type CargaEstado = 'loading' | 'ready' | 'error' | 'reservado';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.scss',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    CePageHeaderComponent,
    CeButtonComponent,
    CeLoadingStateComponent,
    CeErrorStateComponent
  ]
})
export class ClienteFormComponent implements OnInit {
  readonly tipos = TIPOS_CLIENTE_ALTA;
  readonly documentos = TIPOS_DOCUMENTO;
  readonly mensajeReservado = MENSAJE_CONSUMIDOR_RESERVADO;
  loadState: CargaEstado = 'ready';
  enviando = false;
  error = '';
  readonly form;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private clienteService: ClienteService,
    private feedback: FeedbackService
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      tipoCliente: ['PERSONA' as ClienteFormValores['tipoCliente'], Validators.required],
      tipoDocumento: ['' as ClienteFormValores['tipoDocumento']],
      numeroDocumento: ['', Validators.maxLength(40)],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      telefono: ['', Validators.maxLength(40)],
      notas: ['', Validators.maxLength(500)],
      activo: [true]
    });
  }

  ngOnInit(): void {
    if (this.modoEdicion) {
      this.cargar();
    }
  }

  get modoEdicion(): boolean {
    return this.clienteId != null;
  }

  get clienteId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get numeroBloqueado(): boolean {
    const tipo = this.form.controls.tipoDocumento.value;
    return !tipo || tipo === 'NINGUNO';
  }

  onTipoDocumento(): void {
    if (this.numeroBloqueado) {
      this.form.controls.numeroDocumento.setValue('');
    }
  }

  cargar(): void {
    const id = this.clienteId;
    if (id == null) {
      this.loadState = 'error';
      return;
    }
    this.loadState = 'loading';
    this.clienteService.obtenerPorId(id).subscribe({
      next: cliente => {
        if (esConsumidorFinal(cliente)) {
          this.loadState = 'reservado';
          return;
        }
        this.form.patchValue(valoresDesdeCliente(cliente));
        this.loadState = 'ready';
      },
      error: () => {
        this.loadState = 'error';
      }
    });
  }

  cancelar(): void {
    if (this.clienteId != null) {
      this.router.navigate(['/clientes', this.clienteId]);
      return;
    }
    this.router.navigate(['/clientes']);
  }

  guardar(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Revisa el nombre y el correo.';
      return;
    }

    const raw = this.form.getRawValue();
    const request = aClienteRequest({
      nombre: raw.nombre ?? '',
      tipoCliente: raw.tipoCliente || 'PERSONA',
      tipoDocumento: raw.tipoDocumento,
      numeroDocumento: raw.numeroDocumento ?? '',
      email: raw.email ?? '',
      telefono: raw.telefono ?? '',
      notas: raw.notas ?? '',
      activo: raw.activo !== false
    });
    this.enviando = true;
    const id = this.clienteId;
    const peticion = id == null
      ? this.clienteService.crear(request)
      : this.clienteService.actualizar(id, request);

    peticion.subscribe({
      next: (cliente: ClienteResponseDTO) => {
        this.feedback.success(id == null ? 'Cliente creado' : 'Cliente actualizado');
        this.router.navigate(['/clientes', cliente.id]);
      },
      error: err => {
        this.enviando = false;
        this.error = mensajeErrorCliente(err, 'No pudimos guardar este cliente.');
      }
    });
  }
}
