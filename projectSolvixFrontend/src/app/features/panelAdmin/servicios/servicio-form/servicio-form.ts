import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { ClienteService } from '../../../../core/services/cliente.service';
import { EquipoService } from '../../../../core/services/equipo.service';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';
import { EquipoResponseDTO, TipoEquipo } from '../../../../core/models/equipo.models';
import { clientesParaVenta } from '../../cliente/cliente-ui';
import { aOrdenServicioRequest } from '../servicio-mapper';
import { equipoOpcionLabel, mapHttpError, mensajeErrorServicio, TIPOS_EQUIPO } from '../servicio-ui';
import { showSolvixSnack } from '../../../../shared/utils/solvix-snack';

type FormEstado = 'loading' | 'ready' | 'error';
type EquiposEstado = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
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
    SolvixErrorStateComponent
  ]
})
export class ServicioFormComponent implements OnInit {
  clientes: ClienteResponseDTO[] = [];
  equipos: EquipoResponseDTO[] = [];
  loadState: FormEstado = 'loading';
  equiposState: EquiposEstado = 'idle';
  paso: WizardPaso = 1;
  enviando = false;
  creandoCliente = false;
  creandoEquipo = false;
  mostrarCrearCliente = false;
  mostrarCrearEquipo = false;
  errorTitle = 'No pudimos cargar el formulario.';
  errorMessage = 'Revisa la conexión e inténtalo de nuevo.';
  submitError = '';
  equiposError = '';
  inlineError = '';

  readonly tipos = TIPOS_EQUIPO;
  readonly labelEquipo = equipoOpcionLabel;
  readonly form;
  readonly clienteInline;
  readonly equipoInline;

  private prefillClienteId: number | null = null;
  private prefillEquipoId: number | null = null;
  private prefillAplicado = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private clienteService: ClienteService,
    private equipoService: EquipoService,
    private ordenServicioService: OrdenServicioService,
    private snackBar: MatSnackBar,
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
      nombre: ['', Validators.maxLength(120)]
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const c = Number(qp.get('clienteId'));
    const e = Number(qp.get('equipoId'));
    this.prefillClienteId = Number.isFinite(c) && c > 0 ? c : null;
    this.prefillEquipoId = Number.isFinite(e) && e > 0 ? e : null;
    this.cargarClientes();
  }

  get clientesSeleccionables(): ClienteResponseDTO[] {
    return clientesParaVenta(this.clientes);
  }

  get clienteSeleccionado(): ClienteResponseDTO | null {
    const id = this.form.controls.clienteId.value;
    return this.clientesSeleccionables.find(c => c.id === id) ?? null;
  }

  get equipoSeleccionado(): EquipoResponseDTO | null {
    const id = this.form.controls.equipoId.value;
    return this.equipos.find(e => e.id === id) ?? null;
  }

  cargarClientes(): void {
    this.loadState = 'loading';
    this.clienteService.listar(true).subscribe({
      next: lista => {
        this.clientes = lista;
        this.loadState = 'ready';
        this.aplicarPrefill();
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar el formulario.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.loadState = 'error';
      }
    });
  }

  seleccionarCliente(id: number): void {
    this.form.controls.clienteId.setValue(id);
    this.form.controls.equipoId.setValue(null);
    this.mostrarCrearCliente = false;
    this.inlineError = '';
    this.cargarEquipos(id);
  }

  seleccionarEquipo(id: number): void {
    this.form.controls.equipoId.setValue(id);
    this.mostrarCrearEquipo = false;
    this.inlineError = '';
  }

  continuarDesdeCliente(): void {
    this.submitError = '';
    if (this.form.controls.clienteId.value == null) {
      this.submitError = 'Selecciona un cliente para continuar.';
      return;
    }
    this.paso = 2;
    const clienteId = this.form.controls.clienteId.value;
    if (clienteId != null && this.equiposState === 'idle') {
      this.cargarEquipos(clienteId);
    }
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

  cargarEquipos(clienteId: number, equipoPreferido?: number | null): void {
    this.equiposState = 'loading';
    this.equiposError = '';
    this.equipoService.listarPorCliente(clienteId, true).subscribe({
      next: lista => {
        this.equipos = lista;
        if (lista.length === 0) {
          this.equiposState = 'empty';
          this.form.controls.equipoId.setValue(null);
          if (this.prefillEquipoId != null) {
            this.paso = 2;
          }
          return;
        }
        this.equiposState = 'ready';
        const preferido =
          equipoPreferido != null && lista.some(e => e.id === equipoPreferido)
            ? equipoPreferido
            : this.form.controls.equipoId.value;
        if (preferido != null && lista.some(e => e.id === preferido)) {
          this.form.controls.equipoId.setValue(preferido);
          if (this.prefillEquipoId === preferido) {
            this.paso = 3;
          }
        } else if (this.prefillEquipoId != null) {
          this.paso = 2;
        }
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
      nombre: ''
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
          this.clientes = [...this.clientes, creado];
          this.mostrarCrearCliente = false;
          this.seleccionarCliente(creado.id);
          showSolvixSnack(this.snackBar, 'Cliente registrado.', 'success');
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
        nombre: (v.nombre ?? '').trim() || null,
        activo: true
      })
      .subscribe({
        next: creado => {
          this.creandoEquipo = false;
          this.mostrarCrearEquipo = false;
          this.cargarEquipos(clienteId, creado.id);
          this.form.controls.equipoId.setValue(creado.id);
          showSolvixSnack(this.snackBar, 'Equipo registrado.', 'success');
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

  guardar(): void {
    this.submitError = '';
    if (this.form.invalid || this.enviando) {
      this.form.markAllAsTouched();
      this.submitError = 'Completa el problema reportado para crear la orden.';
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

  private aplicarPrefill(): void {
    if (this.prefillAplicado) {
      return;
    }
    this.prefillAplicado = true;
    if (this.prefillClienteId == null) {
      return;
    }
    const existe = this.clientesSeleccionables.some(c => c.id === this.prefillClienteId);
    if (!existe) {
      return;
    }
    this.form.controls.clienteId.setValue(this.prefillClienteId);
    this.paso = this.prefillEquipoId != null ? 3 : 2;
    this.cargarEquipos(this.prefillClienteId, this.prefillEquipoId);
    if (this.prefillEquipoId == null) {
      this.paso = 2;
    }
  }
}
