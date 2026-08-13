import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { ComponenteEnergeticoService } from '../../../../core/services/componente-energeticoby.service';
import { ComponenteEnergeticoByClase } from '../por-componente/componenteEnergeticobyClase'; 
import { FincaService } from '../../../../core/services/finca.service';
import { fincaModel } from '../../finca/fincaClase';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';

@Component({
  selector: 'app-por-componente-list',
  standalone: true,
  templateUrl: './por-componente-list.html',
  styleUrls: ['./por-componente-list.scss'],
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule
  ]
})
export class PorComponenteList implements OnInit {
  displayedColumns: string[] = [
    'finca',
    'nombre',
    'tipoEnergia',
    'potencia',
    'cantidad',
    'horasOperacion',
    'coeficienteArranque',
    'acciones'
  ];
  dataSource = new MatTableDataSource<ComponenteEnergeticoByClase>([]);
  fincas: fincaModel[] = [];
  fincaSeleccionada?: number;

  constructor(
    private componenteService: ComponenteEnergeticoService,
    private fincaService: FincaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarFincas();
    this.configurarFiltroPersonalizado();
  }

  configurarFiltroPersonalizado(): void {
    this.dataSource.filterPredicate = (data: ComponenteEnergeticoByClase, filter: string) => {
      const searchText = filter.toLowerCase();
      return (
        data.nombre.toLowerCase().includes(searchText) ||
        data.finca?.nombreFinca?.toLowerCase().includes(searchText) ||
        data.tipoEnergia.toLowerCase().includes(searchText) ||
        data.potencia.toString().includes(searchText) ||
        data.cantidad.toString().includes(searchText)
      );
    };
  }

  cargarFincas(): void {
    this.fincaService.listarFincas().subscribe({
      next: (fincas) => {
        this.fincas = fincas;
      },
      error: () =>
        this.snackBar.open('⚠️ Error al cargar fincas', 'Cerrar', { duration: 3000 })
    });
  }

  listarPorFinca(): void {
    if (!this.fincaSeleccionada) {
      this.dataSource.data = [];
      return;
    }
    console.log('Buscando componentes para finca ID:', this.fincaSeleccionada);
    this.componenteService.listarPorFinca(this.fincaSeleccionada).subscribe({
      next: (data) => {
        console.log('Datos recibidos del backend:', JSON.stringify(data, null, 2));
        console.log('Cantidad de componentes:', data.length);
        
        // Verificar estructura de cada componente
        if (data.length > 0) {
          console.log('Primer componente:', data[0]);
          console.log('Tiene finca?', !!data[0].finca);
          console.log('Finca nombre:', data[0].finca?.nombreFinca);
        }
        
        // Asignar datos a la tabla
        this.dataSource.data = data || [];
        
        // Forzar actualización de la tabla
        this.dataSource._updateChangeSubscription();
        
        if (data.length === 0) {
          this.snackBar.open('ℹ️ No hay componentes registrados para esta finca', 'Cerrar', { duration: 3000 });
        } else {
          console.log('Componentes cargados en la tabla:', this.dataSource.data.length);
          console.log('DataSource conectado:', this.dataSource.data);
        }
      },
      error: (error) => {
        console.error('Error completo al listar componentes:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error body:', error.error);
        this.snackBar.open('❌ Error al listar componentes. Revisa la consola.', 'Cerrar', { duration: 5000 });
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }

  editarComponente(element: ComponenteEnergeticoByClase): void {
    if (element.id) {
      this.router.navigate(['/editar-componente', element.id]);
    } else {
      this.snackBar.open('⚠️ No se puede editar: ID no disponible', 'Cerrar', { duration: 3000 });
    }
  }

  eliminarComponente(id: number): void {
    const dialogRef = this.dialog.open(DialogoConfirmacionDelete, {
      data: { mensaje: '¿Deseas eliminar este componente energético?' }
    });

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.componenteService.eliminar(id).subscribe({
          next: () => {
            this.dataSource.data = this.dataSource.data.filter((c) => c.id !== id);
            this.snackBar.open('🗑️ Componente eliminado correctamente', 'Cerrar', { duration: 3000 });
          },
          error: () =>
            this.snackBar.open('❌ Error al eliminar componente', 'Cerrar', { duration: 3000 })
        });
      }
    });
  }
}
