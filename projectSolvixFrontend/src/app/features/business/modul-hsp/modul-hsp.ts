import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from '../../../core/services/auth.service';
import { HspService } from '../../../core/services/hsp.service';
import { RequestHSP, ResponseHSP } from '../../../core/models/hsp.model';

@Component({
  selector: 'app-modul-hsp',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, ReactiveFormsModule,
    MatStepperModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCardModule, MatIconModule,
    MatProgressSpinnerModule, MatDividerModule,
    MatTooltipModule, MatTableModule, MatChipsModule
  ],
  templateUrl: './modul-hsp.html',
  styleUrls: ['./modul-hsp.scss']
})
export class ModulHsp implements OnInit {

  form!: FormGroup;
  preview?: ResponseHSP;   // resultado del /calcular (paso 1→2)
  resultado?: ResponseHSP; // resultado del /calcular-y-guardar (confirmado)

  loadingUbicacion = false;
  loadingCalculo   = false;
  loadingGuardar   = false;

  errorUbicacion = '';
  errorCalculo   = '';
  errorGuardar   = '';

  geoDisponible = !!navigator.geolocation;
  mapaUrl       = '';

  columnasMeses = ['mes', 'diasMes', 'hOptM', 'hspDiaria', 'tipo'];

  constructor(
    private fb: FormBuilder,
    private service: HspService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.estaAutenticado()) { this.router.navigate(['/login']); return; }
    this.buildForm();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      latitud:  [null, [Validators.required, Validators.min(-90),  Validators.max(90)]],
      longitud: [null, [Validators.required, Validators.min(-180), Validators.max(180)]]
    });
  }

  // ── Geolocalización ────────────────────────────────────────────────────────
  usarUbicacionActual(): void {
    this.errorUbicacion   = '';
    this.loadingUbicacion = true;

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = Math.round(pos.coords.latitude  * 1e7) / 1e7;
        const lon = Math.round(pos.coords.longitude * 1e7) / 1e7;
        this.form.patchValue({ latitud: lat, longitud: lon });
        this.actualizarMapaUrl(lat, lon);
        this.loadingUbicacion = false;
      },
      () => {
        this.errorUbicacion   = 'No se pudo obtener la ubicación. Ingresa las coordenadas manualmente.';
        this.loadingUbicacion = false;
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  onCoordsChange(): void {
    const { latitud, longitud } = this.form.value;
    if (latitud && longitud) this.actualizarMapaUrl(latitud, longitud);
  }

  private actualizarMapaUrl(lat: number, lon: number): void {
    this.mapaUrl = `https://www.google.com/maps?q=${lat},${lon}&z=14`;
  }

  // ── Paso 1 → 2: previsualizar sin guardar ─────────────────────────────────
  onCalcular(): void {
    this.errorCalculo   = '';
    this.loadingCalculo = true;
    this.preview        = undefined;

    const req: RequestHSP = this.form.value;

    this.service.calcular(req).subscribe({
      next: res => {
        this.preview        = res;
        this.loadingCalculo = false;
      },
      error: err => {
        this.errorCalculo   = err?.error?.message || 'Error al consultar PVGIS. Verifica las coordenadas.';
        this.loadingCalculo = false;
      }
    });
  }

  // ── Paso 2 → confirmar y guardar ──────────────────────────────────────────
  onConfirmar(): void {
    this.errorGuardar   = '';
    this.loadingGuardar = true;
    this.resultado      = undefined;

    const req: RequestHSP = this.form.value;

    this.service.calcularYGuardar(req).subscribe({
      next: res => {
        this.resultado      = res;
        this.loadingGuardar = false;
      },
      error: err => {
        this.errorGuardar   = err?.error?.message || 'Error al guardar el resultado HSP.';
        this.loadingGuardar = false;
      }
    });
  }

  // ── Helpers vista ──────────────────────────────────────────────────────────
  tipoMes(mes: any, preview: ResponseHSP): string {
    if (mes.mes === preview.mesCritico)   return 'critico';
    if (mes.mes === preview.mesFavorable) return 'favorable';
    return '';
  }

  reiniciar(): void {
    this.preview    = undefined;
    this.resultado  = undefined;
    this.errorCalculo = this.errorGuardar = this.errorUbicacion = '';
    this.buildForm();
  }
}