import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../../core/services/auth.service';
import { DemandaReciboService } from '../../../core/services/demanda-recibo.service';
import { RequestDemandaRecibo, ResponseDemandaRecibo } from '../../../core/models/demanda-recibo.model';

@Component({
  selector: 'app-modul-demanda-recibo',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, ReactiveFormsModule,
    MatStepperModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSelectModule, MatCardModule,
    MatIconModule, MatProgressSpinnerModule, MatDividerModule
  ],
  templateUrl: './modul-demanda-recibo.html',
  styleUrls: ['./modul-demanda-recibo.scss']
})
export class ModulDemandaRecibo implements OnInit {

  form!: FormGroup;
  resultado?: ResponseDemandaRecibo;
  loading = false;
  errorMsg = '';
  guardado = false;
  usuarioActual: string | null = null;

  readonly MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  get recibos(): FormArray { return this.form.get('recibosKwh') as FormArray; }
  get modo(): string       { return this.form.get('modoCalculoConsumoBase')?.value; }

  constructor(
    private fb: FormBuilder,
    private service: DemandaReciboService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.estaAutenticado()) {
      this.router.navigate(['/login']);
      return;
    }
    this.usuarioActual = this.authService.obtenerNombreUsuario();
    this.buildForm();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      modoCalculoConsumoBase:   ['RECIBOS', Validators.required],
      recibosKwh:               this.fb.array([]),
      consumoPromedioDirectoKwh:[null],
      precioKwhCop:             [null, [Validators.required, Validators.min(1)]],
      porcentajeCobertura:      [80,   [Validators.required, Validators.min(1), Validators.max(100)]],
      anioInicio: [null], mesInicio: [null],
      anioFin:    [null], mesFin:    [null]
    });

    this.setRecibos(6);

    this.form.get('modoCalculoConsumoBase')?.valueChanges.subscribe(val => {
      if (val === 'RECIBOS') {
        this.setRecibos(6);
        this.form.get('consumoPromedioDirectoKwh')?.clearValidators();
        this.form.get('consumoPromedioDirectoKwh')?.reset();
        this.limpiarValidadoresFechas();
      } else {
        this.clearRecibos();
        this.form.get('consumoPromedioDirectoKwh')
            ?.setValidators([Validators.required, Validators.min(1)]);
        this.activarValidadoresFechas();
      }
      this.form.get('consumoPromedioDirectoKwh')?.updateValueAndValidity();
    });
  }

  setRecibos(n: number): void {
    this.clearRecibos();
    for (let i = 0; i < n; i++) this.recibos.push(this.nuevoRecibo());
  }

  nuevoRecibo(): FormGroup {
    return this.fb.group({
      mes:  [null, [Validators.required, Validators.min(1), Validators.max(12)]],
      anio: [null, [Validators.required, Validators.min(2000)]],
      kwh:  [null, [Validators.required, Validators.min(1)]]
    });
  }

  agregarRecibo(): void  { if (this.recibos.length < 12) this.recibos.push(this.nuevoRecibo()); }
  eliminarRecibo(i: number): void { if (this.recibos.length > 6) this.recibos.removeAt(i); }
  clearRecibos(): void  { while (this.recibos.length) this.recibos.removeAt(0); }

  asFormGroup(c: AbstractControl): FormGroup { return c as FormGroup; }

  nombreMes(n: number): string { return this.MESES[(n ?? 1) - 1] ?? ''; }

  private limpiarValidadoresFechas(): void {
    ['anioInicio','mesInicio','anioFin','mesFin'].forEach(f => {
      this.form.get(f)?.clearValidators();
      this.form.get(f)?.reset();
      this.form.get(f)?.updateValueAndValidity();
    });
  }

  private activarValidadoresFechas(): void {
    ['anioInicio','anioFin'].forEach(f =>
      this.form.get(f)?.setValidators([Validators.required, Validators.min(2000)]));
    ['mesInicio','mesFin'].forEach(f =>
      this.form.get(f)?.setValidators([Validators.required, Validators.min(1), Validators.max(12)]));
    ['anioInicio','mesInicio','anioFin','mesFin'].forEach(f =>
      this.form.get(f)?.updateValueAndValidity());
  }

  // Deriva fechas automáticamente de los recibos ingresados
  private derivarFechasDeRecibos(): void {
    const sorted = this.recibos.controls
      .map(c => c.value)
      .sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);

    this.form.patchValue({
      mesInicio:  sorted[0].mes,
      anioInicio: sorted[0].anio,
      mesFin:     sorted[sorted.length - 1].mes,
      anioFin:    sorted[sorted.length - 1].anio
    });
  }

  // Construye el request para el backend
  private buildRequest(): RequestDemandaRecibo {
    const v = this.form.value;
    return {
      modoCalculoConsumoBase:    v.modoCalculoConsumoBase,
      recibosKwh:                this.modo === 'RECIBOS'
                                   ? this.recibos.controls.map(c => c.value.kwh)
                                   : undefined,
      consumoPromedioDirectoKwh: this.modo === 'PROMEDIO_DIRECTO'
                                   ? v.consumoPromedioDirectoKwh
                                   : undefined,
      precioKwhCop:   v.precioKwhCop,
      porcentajeCobertura: v.porcentajeCobertura,
      anioInicio: v.anioInicio,
      mesInicio:  v.mesInicio,
      anioFin:    v.anioFin,
      mesFin:     v.mesFin
    };
  }

  // Llamado al confirmar en el paso 2
  onConfirmar(): void {
    this.errorMsg = '';
    this.loading  = true;
    this.guardado = false;

    if (this.modo === 'RECIBOS') this.derivarFechasDeRecibos();

    this.service.calcularYGuardar(this.buildRequest()).subscribe({
      next: res => {
        this.resultado = res;
        this.guardado  = true;
        this.loading   = false;
      },
      error: err => {
        this.errorMsg = err?.error?.message || 'Error al calcular y guardar.';
        this.loading  = false;
      }
    });
  }

  reiniciar(): void {
    this.resultado = undefined;
    this.guardado  = false;
    this.errorMsg  = '';
    this.buildForm();
  }
}