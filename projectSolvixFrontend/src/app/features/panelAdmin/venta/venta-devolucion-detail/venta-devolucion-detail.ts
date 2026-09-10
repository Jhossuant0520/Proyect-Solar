import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolvixBadgeComponent } from '../../../../shared/components/solvix-badge/solvix-badge';
import { SolvixButtonComponent } from '../../../../shared/components/solvix-button/solvix-button';
import { SolvixErrorStateComponent } from '../../../../shared/components/solvix-error-state/solvix-error-state';
import { SolvixLoadingStateComponent } from '../../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { VentaService } from '../../../../core/services/venta.service';
import { DevolucionVentaResponseDTO, MetodoReembolso } from '../../../../core/models/venta.models';
import {
  formatFechaVenta,
  formatImporte,
  labelEstadoDevolucion,
  labelEstadoVenta,
  labelMetodoReembolso,
  labelMotivoDevolucion,
  mapHttpError,
  METODOS_REEMBOLSO,
  toneEstadoDevolucion
} from '../venta-ui';

type LoadEstado = 'loading' | 'ready' | 'error';
type AccionEstado = 'idle' | 'processing' | 'error';

@Component({
  selector: 'app-venta-devolucion-detail',
  standalone: true,
  templateUrl: './venta-devolucion-detail.html',
  styleUrl: './venta-devolucion-detail.scss',
  imports: [
    ReactiveFormsModule,
    MatSnackBarModule,
    SolvixPageHeaderComponent,
    SolvixButtonComponent,
    SolvixBadgeComponent,
    SolvixSectionHeaderComponent,
    SolvixLoadingStateComponent,
    SolvixErrorStateComponent
  ]
})
export class VentaDevolucionDetailComponent implements OnInit {
  devolucion: DevolucionVentaResponseDTO | null = null;
  form: FormGroup;
  loadState: LoadEstado = 'loading';
  accionState: AccionEstado = 'idle';
  errorTitle = 'No pudimos cargar esta devolución.';
  errorMessage = 'La devolución no existe o no está disponible.';
  accionError = '';

  readonly metodos = METODOS_REEMBOLSO;
  readonly money = formatImporte;
  readonly fecha = formatFechaVenta;
  readonly motivo = labelMotivoDevolucion;
  readonly metodo = labelMetodoReembolso;
  readonly estadoLabel = labelEstadoDevolucion;
  readonly estadoTone = toneEstadoDevolucion;
  readonly ventaEstado = labelEstadoVenta;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ventaService: VentaService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      metodoReembolso: [null as MetodoReembolso | null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  get devolucionId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('devolucionId'));
    return Number.isFinite(id) ? id : null;
  }

  get ventaId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) ? id : null;
  }

  cargar(): void {
    const id = this.devolucionId;
    if (id == null) {
      this.loadState = 'error';
      return;
    }
    this.loadState = 'loading';
    this.ventaService.obtenerDevolucion(id).subscribe({
      next: devolucion => {
        this.devolucion = devolucion;
        this.loadState = 'ready';
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos cargar esta devolución.');
        this.errorTitle = mapped.title;
        this.errorMessage = mapped.message;
        this.loadState = 'error';
      }
    });
  }

  reembolsar(): void {
    if (!this.devolucion || this.form.invalid) {
      this.form.markAllAsTouched();
      this.accionState = 'error';
      this.accionError = 'Elige el método de reembolso.';
      return;
    }
    this.accionState = 'processing';
    this.accionError = '';
    this.ventaService.reembolsar(this.devolucion.id, {
      metodoReembolso: this.form.getRawValue().metodoReembolso
    }).subscribe({
      next: devolucion => {
        this.devolucion = devolucion;
        this.accionState = 'idle';
        this.snackBar.open('Reembolso registrado.', 'Cerrar', { duration: 3000 });
      },
      error: error => {
        const mapped = mapHttpError(error, 'No pudimos registrar el reembolso.');
        this.accionState = 'error';
        this.accionError = mapped.message;
      }
    });
  }

  volver(): void {
    const ventaId = this.devolucion?.ventaId ?? this.ventaId;
    this.router.navigate(ventaId != null ? ['/ventas', ventaId] : ['/ventas']);
  }

  irALista(): void {
    this.router.navigate(['/ventas']);
  }
}
