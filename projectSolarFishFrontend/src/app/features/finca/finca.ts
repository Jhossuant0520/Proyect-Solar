import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { fincaModel } from './fincaClase';
import { FincaService } from '../../core/services/finca.service';

@Component({
  selector: 'app-finca',
  standalone: true,
  templateUrl: './finca.html',
  styleUrls: ['./finca.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ]
})
export class FincaComponent implements OnInit {
  fincaForm: FormGroup;
  fincaId?: number;
  modoEdicion = false;

  constructor(
    private fb: FormBuilder,
    private fincaService: FincaService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.fincaForm = this.fb.group({
      nombreFinca: ['', Validators.required],
      ubicacionFinca: ['', Validators.required],
      propietarioFinca: ['', Validators.required],
      superficieFinca: ['', [Validators.required, Validators.min(1)]],
      actividadPrincipal: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = true;
      this.fincaId = +idParam;
      this.cargarFinca(this.fincaId);
    }
  }

  cargarFinca(id: number): void {
    this.fincaService.obtenerFincaPorId(id).subscribe({
      next: (finca) => this.fincaForm.patchValue(finca),
      error: (err) => {
        console.error('Error al cargar finca', err);
        this.snackBar.open('⚠️ Error al cargar la finca', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  onSubmit(): void {
    if (this.fincaForm.valid) {
      const datosFinca: fincaModel = this.fincaForm.value;

      if (this.modoEdicion && this.fincaId !== undefined) {
        // 🔄 Actualizar finca existente
        this.fincaService.actualizarFinca(this.fincaId, datosFinca).subscribe({
          next: () => {
            this.snackBar.open('✅ Finca actualizada correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.router.navigate(['/listaFinca']);
          },
          error: (err) => {
            console.error('Error al actualizar finca', err);
            this.snackBar.open('❌ Error al actualizar finca', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      } else {
        // 🆕 Registrar nueva finca
        this.fincaService.registrarFinca(datosFinca).subscribe({
          next: () => {
            this.snackBar.open('✅ Finca registrada correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.fincaForm.reset();
          },
          error: (err) => {
            console.error('Error al registrar finca', err);
            this.snackBar.open('❌ Error al registrar finca', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    } else {
      this.snackBar.open('⚠️ Por favor, completa todos los campos obligatorios', 'Cerrar', {
        duration: 2500,
        panelClass: ['snackbar-warning']
      });
    }
  }

  onCancel(): void {
    if (this.modoEdicion) {
      this.router.navigate(['/listaFinca']);
    } else {
      this.fincaForm.reset();
      this.snackBar.open('Formulario limpio 🧼', 'Cerrar', {
        duration: 2000,
        panelClass: ['snackbar-info']
      });
    }
  }
}
