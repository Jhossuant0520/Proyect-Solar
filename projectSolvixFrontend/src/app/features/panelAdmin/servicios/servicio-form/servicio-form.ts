import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { ClienteService } from '../../../../core/services/cliente.service';
import { EquipoService } from '../../../../core/services/equipo.service';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { EquipoResponseDTO } from '../../../../core/models/equipo.models';
import { clientesParaVenta } from '../../cliente/cliente-ui';
import { aOrdenServicioRequest } from '../servicio-mapper';
import { equipoOpcionLabel, mapHttpError, mensajeErrorServicio } from '../servicio-ui';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';

type FormEstado = 'loading' | 'ready' | 'error';
type EquiposEstado = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-servicio-form',
  standalone: true,
  templateUrl: './servicio-form.html',
  styleUrl: './servicio-form.scss',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class ServicioFormComponent implements OnInit {
  clientes: ClienteResponseDTO[] = [];
  equipos: EquipoResponseDTO[] = [];
  loadState: FormEstado = 'loading';
  equiposState: EquiposEstado = 'idle';
  enviando = false;
  errorTitle = 'No pudimos cargar el formulario.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  submitError = '';
  equiposError = '';

  readonly form;
  readonly labelEquipo = equipoOpcionLabel;

  get clienteSeleccionadoId(): number | null {
    return this.form.controls.clienteId.value;
  }

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private equipoService: EquipoService,
    private ordenServicioService: OrdenServicioService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.group({
      clienteId: [null as number | null, Validators.required],
      equipoId: [{ value: null as number | null, disabled: true }, Validators.required],
      problemaReportado: ['', Validators.maxLength(2000)],
      diagnostico: ['', Validators.maxLength(2000)],
      trabajoRealizado: ['', Validators.maxLength(2000)],
      observaciones: ['', Validators.maxLength(1000)]
    });
  }

  ngOnInit(): void {
    this.cargarClientes();
  }

  get clientesSeleccionables(): ClienteResponseDTO[] {
    return clientesParaVenta(this.clientes);
  }

  get puedeElegirEquipo(): boolean {
    return this.form.controls.clienteId.value != null && this.equiposState === 'ready';
  }

  cargarClientes(): void {
    this.loadState = 'loading';
    this.clienteService.listar(true).subscribe({
      next: lista => {
        this.clientes = lista;
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

  onClienteChange(): void {
    const clienteId = this.form.controls.clienteId.value;
    this.limpiarEquipo();
    if (clienteId == null) {
      this.equipos = [];
      this.equiposState = 'idle';
      this.form.controls.equipoId.disable();
      return;
    }
    this.cargarEquipos(clienteId);
  }

  cargarEquipos(clienteId: number): void {
    this.equiposState = 'loading';
    this.equiposError = '';
    this.form.controls.equipoId.disable();
    this.equipoService.listarPorCliente(clienteId, true).subscribe({
      next: lista => {
        this.equipos = lista;
        if (lista.length === 0) {
          this.equiposState = 'empty';
          return;
        }
        this.equiposState = 'ready';
        this.form.controls.equipoId.enable();
      },
      error: error => {
        this.equipos = [];
        this.equiposState = 'error';
        this.equiposError = mensajeErrorServicio(
          error,
          'No pudimos cargar los equipos de este cliente.'
        );
      }
    });
  }

  limpiarEquipo(): void {
    this.form.controls.equipoId.setValue(null);
    this.form.controls.equipoId.disable();
  }

  cancelar(): void {
    this.router.navigate(['/servicios']);
  }

  guardar(): void {
    this.submitError = '';
    if (this.form.invalid || this.enviando || this.equiposState === 'loading') {
      this.form.markAllAsTouched();
      return;
    }
    const valores = {
      clienteId: this.form.controls.clienteId.value,
      equipoId: this.form.controls.equipoId.value,
      problemaReportado: this.form.controls.problemaReportado.value ?? '',
      diagnostico: this.form.controls.diagnostico.value ?? '',
      trabajoRealizado: this.form.controls.trabajoRealizado.value ?? '',
      observaciones: this.form.controls.observaciones.value ?? ''
    };
    if (valores.clienteId == null || valores.equipoId == null) {
      this.submitError = 'Selecciona un cliente y un equipo.';
      return;
    }
    this.enviando = true;
    const request = aOrdenServicioRequest(valores);
    this.ordenServicioService.crear(request).subscribe({
      next: orden => {
        this.enviando = false;
        showSolvixSnack(this.snackBar, `Orden ${orden.numero} creada.`);
        this.router.navigate(['/servicios', orden.id]);
      },
      error: error => {
        this.enviando = false;
        this.submitError = mensajeErrorServicio(error, 'No pudimos crear la orden.');
      }
    });
  }
}
