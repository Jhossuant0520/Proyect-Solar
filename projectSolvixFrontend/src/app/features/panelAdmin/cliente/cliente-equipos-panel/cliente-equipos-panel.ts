import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixEmptyStateComponent } from '../../../../shared/components/solvix-empty-state/solvix-empty-state';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';
import { EquipoService } from '../../../../core/services/equipo.service';
import { EquipoRequestDTO, EquipoResponseDTO, TipoEquipo } from '../../../../core/models/equipo.models';
import { equipoOpcionLabel, labelTipoEquipo, mensajeErrorServicio, TIPOS_EQUIPO } from '../../servicios/servicio-ui';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';

type EquiposEstado = 'loading' | 'ready' | 'empty' | 'error';
type FormMode = 'hidden' | 'crear' | 'editar';

@Component({
  selector: 'app-cliente-equipos-panel',
  standalone: true,
  templateUrl: './cliente-equipos-panel.html',
  styleUrl: './cliente-equipos-panel.scss',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    SolvixSectionHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixLoadingStateComponent,
    SolvixEmptyStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ClienteEquiposPanelComponent implements OnChanges {
  @Input({ required: true }) clienteId!: number;
  @Input() clienteActivo = true;
  @Input() bloqueado = false;

  equipos: EquipoResponseDTO[] = [];
  state: EquiposEstado = 'loading';
  verInactivos = false;
  formMode: FormMode = 'hidden';
  editandoId: number | null = null;
  enviando = false;
  formError = '';

  readonly tipos = TIPOS_EQUIPO;
  readonly tipoLabel = labelTipoEquipo;
  readonly titulo = equipoOpcionLabel;
  readonly form;

  constructor(
    private fb: FormBuilder,
    private equipoService: EquipoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      tipoEquipo: ['COMPUTADOR' as TipoEquipo, Validators.required],
      marca: ['', Validators.maxLength(80)],
      modelo: ['', Validators.maxLength(80)],
      numeroSerie: ['', Validators.maxLength(100)],
      nombre: ['', Validators.maxLength(120)],
      observaciones: ['', Validators.maxLength(1000)]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clienteId'] && this.clienteId != null) {
      this.cerrarFormulario();
      this.cargar();
    }
  }

  get puedeGestionar(): boolean {
    return this.clienteActivo && !this.bloqueado;
  }

  cargar(): void {
    if (this.clienteId == null) {
      this.state = 'error';
      return;
    }
    this.state = 'loading';
    this.equipoService.listar({ clienteId: this.clienteId, soloActivos: !this.verInactivos }).subscribe({
      next: lista => {
        this.equipos = lista;
        this.state = lista.length === 0 ? 'empty' : 'ready';
      },
      error: () => {
        this.state = 'error';
      }
    });
  }

  onToggleInactivos(event: Event): void {
    this.verInactivos = (event.target as HTMLInputElement).checked;
    this.cargar();
  }

  abrirCrear(): void {
    if (!this.puedeGestionar) {
      return;
    }
    this.formMode = 'crear';
    this.editandoId = null;
    this.formError = '';
    this.form.reset({
      tipoEquipo: 'COMPUTADOR',
      marca: '',
      modelo: '',
      numeroSerie: '',
      nombre: '',
      observaciones: ''
    });
  }

  abrirEditar(equipo: EquipoResponseDTO): void {
    if (!this.puedeGestionar || !equipo.activo) {
      return;
    }
    this.formMode = 'editar';
    this.editandoId = equipo.id;
    this.formError = '';
    this.form.patchValue({
      tipoEquipo: equipo.tipoEquipo,
      marca: equipo.marca ?? '',
      modelo: equipo.modelo ?? '',
      numeroSerie: equipo.numeroSerie ?? '',
      nombre: equipo.nombre ?? '',
      observaciones: equipo.observaciones ?? ''
    });
  }

  cerrarFormulario(): void {
    this.formMode = 'hidden';
    this.editandoId = null;
    this.formError = '';
  }

  guardar(): void {
    if (!this.puedeGestionar || this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      return;
    }
    const request = this.aRequest();
    this.enviando = true;
    this.formError = '';

    const obs =
      this.formMode === 'editar' && this.editandoId != null
        ? this.equipoService.actualizar(this.editandoId, request)
        : this.equipoService.crear(request);

    obs.subscribe({
      next: () => {
        this.enviando = false;
        showSolvixSnack(
          this.snackBar,
          this.formMode === 'editar' ? 'Equipo actualizado.' : 'Equipo registrado.',
          'success'
        );
        this.cerrarFormulario();
        this.cargar();
      },
      error: error => {
        this.enviando = false;
        this.formError = mensajeErrorServicio(error, 'No pudimos guardar el equipo.');
      }
    });
  }

  desactivar(equipo: EquipoResponseDTO): void {
    if (!this.puedeGestionar || !equipo.activo) {
      return;
    }
    const ref = this.dialog.open(DialogoConfirmacionDelete, {
      data: {
        mensaje: '¿Desactivar este equipo? Seguirá visible en el historial de órdenes.'
      },
      panelClass: 'solvix-dialog-panel',
      backdropClass: 'solvix-dialog-backdrop'
    });
    ref.afterClosed().subscribe(ok => {
      if (ok !== true) {
        return;
      }
      this.equipoService.desactivar(equipo.id).subscribe({
        next: () => {
          showSolvixSnack(this.snackBar, 'Equipo desactivado.', 'warning');
          this.cargar();
        },
        error: error => {
          showSolvixSnack(
            this.snackBar,
            mensajeErrorServicio(error, 'No pudimos desactivar el equipo.'),
            'error'
          );
        }
      });
    });
  }

  activar(equipo: EquipoResponseDTO): void {
    if (!this.puedeGestionar || equipo.activo) {
      return;
    }
    const request: EquipoRequestDTO = {
      clienteId: this.clienteId,
      tipoEquipo: equipo.tipoEquipo,
      marca: equipo.marca,
      modelo: equipo.modelo,
      numeroSerie: equipo.numeroSerie,
      nombre: equipo.nombre,
      observaciones: equipo.observaciones,
      activo: true
    };
    this.equipoService.actualizar(equipo.id, request).subscribe({
      next: () => {
        showSolvixSnack(this.snackBar, 'Equipo activo de nuevo.', 'success');
        this.cargar();
      },
      error: error => {
        showSolvixSnack(
          this.snackBar,
          mensajeErrorServicio(error, 'No pudimos activar el equipo.'),
          'error'
        );
      }
    });
  }

  private aRequest(): EquipoRequestDTO {
    const v = this.form.getRawValue();
    return {
      clienteId: this.clienteId,
      tipoEquipo: v.tipoEquipo as TipoEquipo,
      marca: textoONull(v.marca),
      modelo: textoONull(v.modelo),
      numeroSerie: textoONull(v.numeroSerie),
      nombre: textoONull(v.nombre),
      observaciones: textoONull(v.observaciones),
      activo: true
    };
  }
}

function textoONull(value: string | null | undefined): string | null {
  const t = (value ?? '').trim();
  return t ? t : null;
}
