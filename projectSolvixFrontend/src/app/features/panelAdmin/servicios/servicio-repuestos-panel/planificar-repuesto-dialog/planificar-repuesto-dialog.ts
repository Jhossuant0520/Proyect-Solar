import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../../../../../shared/components/solvix-button/solvix-button';
import { ProductoService } from '../../../../../core/services/producto.service';
import { OrdenServicioService } from '../../../../../core/services/orden-servicio.service';
import { RepuestoOrdenServicioResponseDTO } from '../../../../../core/models/orden-servicio.models';
import { ProductoModel } from '../../../producto/productoClase';
import {
  mensajeErrorLookupCodigoBarras,
  resolverProductoPorCodigoBarras
} from '../../../producto/producto-barcode-lookup';
import { productoCoincideBusqueda } from '../../../producto/producto-ui';
import { mensajeErrorServicio } from '../../servicio-ui';

export interface PlanificarRepuestoDialogData {
  ordenId: number;
}

@Component({
  selector: 'app-planificar-repuesto-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, SolvixButtonComponent],
  templateUrl: './planificar-repuesto-dialog.html',
  styleUrl: './planificar-repuesto-dialog.scss'
})
export class PlanificarRepuestoDialogComponent implements OnInit {
  catalogo: ProductoModel[] = [];
  busqueda = '';
  buscandoCodigo = false;
  cargandoCatalogo = true;
  enviando = false;
  error = '';
  seleccionado: ProductoModel | null = null;
  readonly form;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private ordenServicioService: OrdenServicioService,
    private dialogRef: MatDialogRef<
      PlanificarRepuestoDialogComponent,
      RepuestoOrdenServicioResponseDTO | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: PlanificarRepuestoDialogData
  ) {
    this.form = this.fb.group({
      cantidadPlanificada: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.productoService.listar({ activo: true }).subscribe({
      next: productos => {
        this.catalogo = productos;
        this.cargandoCatalogo = false;
      },
      error: error => {
        this.cargandoCatalogo = false;
        this.error = mensajeErrorServicio(error, 'No pudimos cargar el catálogo de productos.');
      }
    });
  }

  get productosFiltrados(): ProductoModel[] {
    return this.catalogo
      .filter(p => productoCoincideBusqueda(p, this.busqueda))
      .slice(0, 8);
  }

  onBusqueda(event: Event): void {
    this.busqueda = (event.target as HTMLInputElement).value;
  }

  onBusquedaEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const codigo = this.busqueda.trim();
    if (!codigo) {
      return;
    }
    this.buscandoCodigo = true;
    this.error = '';
    resolverProductoPorCodigoBarras(this.productoService, this.catalogo, codigo).subscribe({
      next: producto => {
        this.buscandoCodigo = false;
        this.seleccionar(producto);
      },
      error: err => {
        this.buscandoCodigo = false;
        this.error = mensajeErrorLookupCodigoBarras(
          err,
          'No encontramos un producto con ese código.'
        );
      }
    });
  }

  seleccionar(producto: ProductoModel): void {
    this.seleccionado = producto;
    this.busqueda = producto.nombre;
    this.error = '';
  }

  limpiarSeleccion(): void {
    this.seleccionado = null;
    this.busqueda = '';
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    this.error = '';
    if (!this.seleccionado?.id) {
      this.error = 'Selecciona un producto activo.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'La cantidad debe ser mayor que cero.';
      return;
    }
    const cantidad = Number(this.form.controls.cantidadPlanificada.value);
    this.enviando = true;
    this.ordenServicioService
      .planificarRepuesto(this.data.ordenId, {
        productoId: this.seleccionado.id,
        cantidadPlanificada: cantidad
      })
      .subscribe({
        next: linea => this.dialogRef.close(linea),
        error: err => {
          this.enviando = false;
          this.error = mensajeErrorServicio(err, 'No pudimos planificar el repuesto.');
        }
      });
  }
}
