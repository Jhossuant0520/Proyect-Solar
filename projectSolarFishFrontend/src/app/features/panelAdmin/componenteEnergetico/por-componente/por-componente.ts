import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';

import { FincaService } from '../../../../core/services/finca.service';
import { ComponenteEnergeticoService } from '../../../../core/services/componente-energeticoby.service';
import { fincaModel } from '../../finca/fincaClase';
import { ComponenteEnergeticoByClase } from './componenteEnergeticobyClase';

@Component({
  selector: 'app-por-componente',
  standalone: true,
  templateUrl: './por-componente.html',
  styleUrls: ['./por-componente.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ]
})
export class PorComponenteForm implements OnInit {
  form!: FormGroup;
  fincas: fincaModel[] = [];
  componenteId?: number;
  modoEdicion = false;

  constructor(
    private fb: FormBuilder,
    private fincaService: FincaService,
    private componenteService: ComponenteEnergeticoService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fincaId: ['', Validators.required],
      nombre: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      potencia: ['', [Validators.required, Validators.min(1)]],
      horasOperacion: ['', [Validators.required, Validators.min(0.1)]],
      coeficienteArranque: [1],
      horasRealesPeriodo: [24],
      tipoEnergia: ['AC', Validators.required],
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = true;
      this.componenteId = +idParam;
    }
    
    // Cargar fincas primero, luego cargar componente si está en modo edición
    this.cargarFincas();
  }

  cargarFincas(): void {
    this.fincaService.listarFincas().subscribe({
      next: (data: fincaModel[]) => {
        this.fincas = data;
        // Si estamos en modo edición, cargar el componente después de cargar las fincas
        if (this.modoEdicion && this.componenteId !== undefined) {
          this.cargarComponente(this.componenteId);
        }
      },
      error: () => {
        this.snackBar.open('⚠️ Error al cargar fincas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarComponente(id: number): void {
    this.componenteService.obtenerPorId(id).subscribe({
      next: (componente) => {
        if (componente) {
          // Asegurarse de que la finca del componente esté en el array de fincas
          const fincaId = componente.finca?.id;
          if (fincaId && !this.fincas.find(f => f.id === fincaId)) {
            // Si la finca no está en el array, agregarla
            if (componente.finca) {
              this.fincas.push(componente.finca);
            }
          }
          
          this.form.patchValue({
            fincaId: fincaId,
            nombre: componente.nombre,
            cantidad: componente.cantidad,
            potencia: componente.potencia,
            horasOperacion: componente.horasOperacion,
            coeficienteArranque: componente.coeficienteArranque || 1,
            horasRealesPeriodo: componente.horasRealesPeriodo || 24,
            tipoEnergia: componente.tipoEnergia
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar componente', err);
        this.snackBar.open('⚠️ Error al cargar el componente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      // Buscar la finca seleccionada
      const fincaSeleccionada = this.fincas.find(f => f.id === Number(formValue.fincaId));
      
      if (!fincaSeleccionada) {
        this.snackBar.open('❌ Error: Finca no encontrada', 'Cerrar', { duration: 3000 });
        return;
      }

      // Crear el objeto componente con el objeto finca completo
      const componente: ComponenteEnergeticoByClase = {
        finca: fincaSeleccionada,
        nombre: formValue.nombre,
        cantidad: Number(formValue.cantidad),
        potencia: Number(formValue.potencia),
        horasOperacion: Number(formValue.horasOperacion),
        coeficienteArranque: Number(formValue.coeficienteArranque) || 1,
        horasRealesPeriodo: Number(formValue.horasRealesPeriodo) || 24,
        tipoEnergia: formValue.tipoEnergia
      };

      if (this.modoEdicion && this.componenteId !== undefined) {
        // 🔄 Actualizar componente existente
        this.componenteService.actualizarComponente(this.componenteId, componente).subscribe({
          next: () => {
            this.snackBar.open('✅ Componente actualizado correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.router.navigate(['/listcomponet']);
          },
          error: (err) => {
            console.error('Error al actualizar componente', err);
            this.snackBar.open('❌ Error al actualizar componente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      } else {
        // 🆕 Registrar nuevo componente
        this.componenteService.registrarComponente(componente).subscribe({
          next: () => {
            this.snackBar.open('✅ Componente registrado con éxito', 'Cerrar', { duration: 3000 });
            this.form.reset({
              cantidad: 1,
              coeficienteArranque: 1,
              horasRealesPeriodo: 24,
              tipoEnergia: 'AC'
            });
          },
          error: (error) => {
            console.error('Error al registrar componente:', error);
            this.snackBar.open('❌ Error al registrar componente', 'Cerrar', { duration: 3000 });
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
      this.router.navigate(['/listcomponet']);
    } else {
      this.form.reset({
        cantidad: 1,
        coeficienteArranque: 1,
        horasRealesPeriodo: 24,
        tipoEnergia: 'AC'
      });
      this.snackBar.open('Formulario limpio 🧼', 'Cerrar', {
        duration: 2000,
        panelClass: ['snackbar-info']
      });
    }
  }
}
