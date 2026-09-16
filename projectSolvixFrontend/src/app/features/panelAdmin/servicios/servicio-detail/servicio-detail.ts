import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import {
  EstadoOrdenServicio,
  OrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import { aRequestActualizacionTextos, valoresDesdeOrden } from '../servicio-mapper';
import {
  CAMPOS_TECNICOS,
  CampoTecnicoId,
  campoTecnicoDestacado,
  equipoResumen,
  esResumenTecnicoCompleto,
  formatFechaOrden,
  labelEstadoOrden,
  labelTipoEquipo,
  mapHttpError,
  mensajeErrorServicio,
  puedeEditarTextos,
  textosTecnicosSinCambios,
  toneEstadoOrden,
  transicionesDesde,
  valorTextoTecnico
} from '../servicio-ui';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';

@Component({
  selector: 'app-servicio-detail',
  standalone: true,
  templateUrl: './servicio-detail.html',
  styleUrl: './servicio-detail.scss',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    SolvixBadgeComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ServicioDetailComponent implements OnInit {
  orden: OrdenServicioResponseDTO | null = null;
  state: 'loading' | 'ready' | 'error' = 'loading';
  editando = false;
  guardando = false;
  cambiandoEstado = false;
  errorTitle = 'No pudimos cargar esta orden.';
  errorMessage = 'La orden no existe o no está disponible.';
  editError = '';
  estadoError = '';

  readonly form;
  readonly campos = CAMPOS_TECNICOS;
  readonly fecha = formatFechaOrden;
  readonly estadoLabel = labelEstadoOrden;
  readonly estadoTone = toneEstadoOrden;
  readonly equipo = equipoResumen;
  readonly tipoEquipo = labelTipoEquipo;
  readonly puedeEditar = puedeEditarTextos;
  readonly valorCampo = valorTextoTecnico;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ordenServicioService: OrdenServicioService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      problemaReportado: ['', Validators.maxLength(2000)],
      diagnostico: ['', Validators.maxLength(2000)],
      trabajoRealizado: ['', Validators.maxLength(2000)],
      observaciones: ['', Validators.maxLength(1000)]
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  get ordenId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get siguientesEstados(): EstadoOrdenServicio[] {
    if (!this.orden) {
      return [];
    }
    return transicionesDesde(this.orden.estado);
  }

  get campoDestacado(): CampoTecnicoId | null {
    return this.orden ? campoTecnicoDestacado(this.orden.estado) : null;
  }

  get esResumenCompleto(): boolean {
    return this.orden ? esResumenTecnicoCompleto(this.orden.estado) : false;
  }

  get hayCambiosTextos(): boolean {
    if (!this.orden) {
      return false;
    }
    return !textosTecnicosSinCambios(this.orden, this.textosDelForm());
  }

  cargar(): void {
    const id = this.ordenId;
    if (id == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.editando = false;
    this.editError = '';
    this.estadoError = '';
    this.ordenServicioService.obtenerPorId(id).subscribe({
      next: orden => {
        this.orden = orden;
        this.patchForm(orden);
        this.state = 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta orden.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.state = 'error';
      }
    });
  }

  volver(): void {
    this.router.navigate(['/servicios']);
  }

  esCampoDestacado(campo: CampoTecnicoId): boolean {
    return this.campoDestacado === campo;
  }

  iniciarEdicion(): void {
    if (!this.orden || !puedeEditarTextos(this.orden.estado)) {
      return;
    }
    this.patchForm(this.orden);
    this.editError = '';
    this.editando = true;
  }

  cancelarEdicion(): void {
    if (this.orden) {
      this.patchForm(this.orden);
    }
    this.editando = false;
    this.editError = '';
  }

  guardarTextos(): void {
    if (!this.orden || this.guardando || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.hayCambiosTextos) {
      this.editando = false;
      this.editError = '';
      return;
    }

    this.guardando = true;
    this.editError = '';
    const textos = this.textosDelForm();
    const request = aRequestActualizacionTextos(this.orden, textos);

    this.ordenServicioService.actualizar(this.orden.id, request).subscribe({
      next: orden => {
        this.orden = orden;
        this.patchForm(orden);
        this.editando = false;
        this.guardando = false;
        showSolvixSnack(this.snackBar, 'Información técnica guardada.', 'success');
      },
      error: error => {
        this.guardando = false;
        this.editError = mensajeErrorServicio(error, 'No pudimos guardar los cambios.');
      }
    });
  }

  cambiarEstado(destino: EstadoOrdenServicio): void {
    if (!this.orden || this.cambiandoEstado || this.editando) {
      return;
    }
    this.cambiandoEstado = true;
    this.estadoError = '';
    this.ordenServicioService.cambiarEstado(this.orden.id, { estado: destino }).subscribe({
      next: orden => {
        this.orden = orden;
        this.patchForm(orden);
        this.editando = false;
        this.cambiandoEstado = false;
        showSolvixSnack(this.snackBar, `Estado: ${labelEstadoOrden(orden.estado)}.`, 'success');
      },
      error: error => {
        this.cambiandoEstado = false;
        this.estadoError = mensajeErrorServicio(error, 'No pudimos cambiar el estado.');
      }
    });
  }

  texto(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    return trimmed || 'Sin información.';
  }

  private textosDelForm(): Record<CampoTecnicoId, string> {
    return {
      problemaReportado: this.form.controls.problemaReportado.value ?? '',
      diagnostico: this.form.controls.diagnostico.value ?? '',
      trabajoRealizado: this.form.controls.trabajoRealizado.value ?? '',
      observaciones: this.form.controls.observaciones.value ?? ''
    };
  }

  private patchForm(orden: OrdenServicioResponseDTO): void {
    const valores = valoresDesdeOrden(orden);
    this.form.patchValue({
      problemaReportado: valores.problemaReportado,
      diagnostico: valores.diagnostico,
      trabajoRealizado: valores.trabajoRealizado,
      observaciones: valores.observaciones
    });
  }
}
