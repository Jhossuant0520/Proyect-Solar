import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { ClienteBuscadorComponent } from '../../cliente/cliente-buscador/cliente-buscador';
import { EquipoBuscadorComponent } from '../equipo-buscador/equipo-buscador';
import { ClienteService } from '../../../../core/services/cliente.service';
import { EquipoService } from '../../../../core/services/equipo.service';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { EquipoResponseDTO, TipoEquipo } from '../../../../core/models/equipo.models';
import { aOrdenServicioRequest } from '../servicio-mapper';
import { equipoOpcionLabel, mapHttpError, mensajeErrorServicio, TIPOS_EQUIPO } from '../servicio-ui';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import {
  ServicioRecepcionDialogComponent,
  ServicioRecepcionDialogData
} from '../servicio-recepcion-dialog/servicio-recepcion-dialog';

type FormEstado = 'loading' | 'ready' | 'error';
export type WizardPaso = 1 | 2 | 3;

@Component({
  selector: 'app-servicio-form',
  standalone: true,
  templateUrl: './servicio-form.html',
  styleUrl: './servicio-form.scss',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    MatTooltipModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent,
    ClienteBuscadorComponent,
    EquipoBuscadorComponent
  ]
})
export class ServicioFormComponent implements OnInit {
  clienteSeleccionado: ClienteResponseDTO | null = null;
  equipoSeleccionado: EquipoResponseDTO | null = null;
  loadState: FormEstado = 'ready';
  paso: WizardPaso = 1;
  enviando = false;
  creandoCliente = false;
  creandoEquipo = false;
  mostrarCrearCliente = false;
  mostrarCrearEquipo = false;
  errorTitle = 'No pudimos cargar el formulario.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  submitError = '';
  inlineError = '';

  readonly tipos = TIPOS_EQUIPO;
  readonly labelEquipo = equipoOpcionLabel;
  readonly form;
  readonly clienteInline;
  readonly equipoInline;

  private prefillClienteId: number | null = null;
  private prefillEquipoId: number | null = null;
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(SolvixFeedbackService);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private clienteService: ClienteService,
    private equipoService: EquipoService,
    private ordenServicioService: OrdenServicioService,
    private router: Router
  ) {
    this.form = this.fb.group({
      clienteId: [null as number | null, Validators.required],
      equipoId: [null as number | null, Validators.required],
      problemaReportado: ['', [Validators.required, Validators.maxLength(2000)]],
      observaciones: ['', Validators.maxLength(1000)]
    });
    this.clienteInline = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      telefono: ['', Validators.maxLength(40)],
      numeroDocumento: ['', Validators.maxLength(40)]
    });
    this.equipoInline = this.fb.group({
      tipoEquipo: ['PORTATIL' as TipoEquipo, Validators.required],
      marca: ['', Validators.maxLength(80)],
      modelo: ['', Validators.maxLength(80)],
      numeroSerie: ['', Validators.maxLength(100)],
      referenciaInterna: ['', Validators.maxLength(120)]
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const c = Number(qp.get('clienteId'));
    const e = Number(qp.get('equipoId'));
    this.prefillClienteId = Number.isFinite(c) && c > 0 ? c : null;
    this.prefillEquipoId = Number.isFinite(e) && e > 0 ? e : null;
    if (this.prefillClienteId != null) {
      this.aplicarPrefill();
    }
  }

  onClienteSeleccionado(cliente: ClienteResponseDTO | null): void {
    this.clienteSeleccionado = cliente;
    this.form.controls.clienteId.setValue(cliente?.id ?? null);
    this.equipoSeleccionado = null;
    this.form.controls.equipoId.setValue(null);
    this.mostrarCrearCliente = false;
    this.inlineError = '';
    this.submitError = '';
  }

  onEquipoSeleccionado(equipo: EquipoResponseDTO | null): void {
    this.equipoSeleccionado = equipo;
    this.form.controls.equipoId.setValue(equipo?.id ?? null);
    this.mostrarCrearEquipo = false;
    this.inlineError = '';
    this.submitError = '';
  }

  continuarDesdeCliente(): void {
    this.submitError = '';
    if (this.form.controls.clienteId.value == null) {
      this.submitError = 'Selecciona un cliente para continuar.';
      return;
    }
    this.paso = 2;
  }

  continuarDesdeEquipo(): void {
    this.submitError = '';
    if (this.form.controls.equipoId.value == null) {
      this.submitError = 'Selecciona un equipo para continuar.';
      return;
    }
    this.paso = 3;
  }

  atras(): void {
    this.submitError = '';
    if (this.paso === 2) {
      this.paso = 1;
    } else if (this.paso === 3) {
      this.paso = 2;
    }
  }

  abrirCrearCliente(): void {
    this.mostrarCrearCliente = true;
    this.mostrarCrearEquipo = false;
    this.inlineError = '';
    this.clienteInline.reset({ nombre: '', telefono: '', numeroDocumento: '' });
  }

  abrirCrearEquipo(): void {
    if (this.form.controls.clienteId.value == null) {
      return;
    }
    this.mostrarCrearEquipo = true;
    this.inlineError = '';
    this.equipoInline.reset({
      tipoEquipo: 'PORTATIL',
      marca: '',
      modelo: '',
      numeroSerie: '',
      referenciaInterna: ''
    });
  }

  guardarClienteInline(): void {
    this.inlineError = '';
    if (this.clienteInline.invalid || this.creandoCliente) {
      this.clienteInline.markAllAsTouched();
      return;
    }
    const v = this.clienteInline.getRawValue();
    this.creandoCliente = true;
    this.clienteService
      .crear({
        nombre: (v.nombre ?? '').trim(),
        tipoCliente: 'PERSONA',
        telefono: (v.telefono ?? '').trim() || null,
        numeroDocumento: (v.numeroDocumento ?? '').trim() || null,
        activo: true
      })
      .subscribe({
        next: creado => {
          this.creandoCliente = false;
          this.mostrarCrearCliente = false;
          this.onClienteSeleccionado(creado);
          this.feedback.success('Cliente registrado.');
        },
        error: error => {
          this.creandoCliente = false;
          this.inlineError = mensajeErrorServicio(error, 'No pudimos registrar el cliente.');
        }
      });
  }

  guardarEquipoInline(): void {
    this.inlineError = '';
    const clienteId = this.form.controls.clienteId.value;
    if (clienteId == null || this.equipoInline.invalid || this.creandoEquipo) {
      this.equipoInline.markAllAsTouched();
      return;
    }
    const v = this.equipoInline.getRawValue();
    this.creandoEquipo = true;
    this.equipoService
      .crear({
        clienteId,
        tipoEquipo: v.tipoEquipo as TipoEquipo,
        marca: (v.marca ?? '').trim() || null,
        modelo: (v.modelo ?? '').trim() || null,
        numeroSerie: (v.numeroSerie ?? '').trim() || null,
        referenciaInterna: (v.referenciaInterna ?? '').trim() || null,
        activo: true
      })
      .subscribe({
        next: creado => {
          this.creandoEquipo = false;
          this.mostrarCrearEquipo = false;
          this.onEquipoSeleccionado(creado);
          this.feedback.success('Equipo registrado.');
        },
        error: error => {
          this.creandoEquipo = false;
          this.inlineError = mensajeErrorServicio(error, 'No pudimos registrar el equipo.');
        }
      });
  }

  cancelar(): void {
    this.router.navigate(['/servicios']);
  }

  /**
   * Paso 3: revisión → modal de firma → crear OT con recepción firmada (D.2).
   */
  guardar(): void {
    this.submitError = '';
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      this.submitError = 'Completa el problema reportado para crear la orden.';
      return;
    }
    if (this.clienteSeleccionado == null || this.equipoSeleccionado == null) {
      this.submitError = 'Selecciona un cliente y un equipo.';
      return;
    }
    const valores = {
      clienteId: this.form.controls.clienteId.value,
      equipoId: this.form.controls.equipoId.value,
      problemaReportado: this.form.controls.problemaReportado.value ?? '',
      diagnostico: '',
      trabajoRealizado: '',
      observaciones: this.form.controls.observaciones.value ?? ''
    };
    if (valores.clienteId == null || valores.equipoId == null) {
      this.submitError = 'Selecciona un cliente y un equipo.';
      return;
    }

    const request = aOrdenServicioRequest(valores);
    const ref = this.dialog.open(ServicioRecepcionDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop',
      disableClose: true,
      data: {
        request,
        cliente: this.clienteSeleccionado,
        equipo: this.equipoSeleccionado
      } satisfies ServicioRecepcionDialogData
    });

    ref.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      this.feedback.success('Recepción registrada');
      this.router.navigate(['/servicios', result.ordenId], {
        queryParams: { esperarComprobante: '1' }
      });
    });
  }

  private aplicarPrefill(): void {
    if (this.prefillClienteId == null) {
      return;
    }
    this.loadState = 'loading';
    const cliente$ = this.clienteService.obtenerPorId(this.prefillClienteId).pipe(
      catchError(() => of(null))
    );
    const equipo$ =
      this.prefillEquipoId != null
        ? this.equipoService.obtenerPorId(this.prefillEquipoId).pipe(catchError(() => of(null)))
        : of(null);

    forkJoin({ cliente: cliente$, equipo: equipo$ }).subscribe({
      next: ({ cliente, equipo }) => {
        if (!cliente || cliente.consumidorFinal) {
          this.loadState = 'error';
          this.errorTitle = 'Cliente no disponible';
          this.errorMessage = 'No encontramos el cliente indicado o no es seleccionable.';
          return;
        }
        this.clienteSeleccionado = cliente;
        this.form.controls.clienteId.setValue(cliente.id);
        if (equipo && equipo.clienteId === cliente.id && equipo.activo) {
          this.equipoSeleccionado = equipo;
          this.form.controls.equipoId.setValue(equipo.id);
          this.paso = 3;
        } else {
          this.paso = 2;
        }
        this.loadState = 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar el formulario.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.loadState = 'error';
      }
    });
  }
}
