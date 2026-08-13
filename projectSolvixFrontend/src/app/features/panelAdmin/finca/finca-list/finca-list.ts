import { Component, OnInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';

import { fincaModel } from '../fincaClase';
import { FincaService } from '../../../../core/services/finca.service';
import { DialogoConfirmacionDelete } from '../../../../shared/components/dialogo-confirmacion-delete/dialogo-confirmacion-delete';

@Component({
  selector: 'app-finca-list',
  standalone: true,
  templateUrl: './finca-list.html',
  styleUrls: ['./finca-list.scss'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatCardModule
  ]
})
export class FincaList implements OnInit {

  displayedColumns: string[] = [
    'nombreFinca',
    'ubicacionFinca',
    'propietarioFinca',
    'superficieFinca',
    'actividadPrincipal',
    'acciones'
  ];

  dataSource = new MatTableDataSource<fincaModel>([]);

  constructor(
    private fincaService: FincaService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarFincas();

    // Permitir filtro global sobre todos los campos
    this.dataSource.filterPredicate = (data, filter) =>
      Object.values(data).some(value =>
        value?.toString().toLowerCase().includes(filter)
      );
  }

  cargarFincas() {
    this.fincaService.listarFincas().subscribe({
      next: (fincas) => this.dataSource.data = fincas,
      error: (err) => console.error('Error al cargar fincas:', err)
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }

  editarFinca(finca: fincaModel) {
    this.router.navigate(['/editar-finca', finca.id]);
  }

  eliminarFinca(id: number) {
    const dialogRef = this.dialog.open(DialogoConfirmacionDelete, {
      data: {
        mensaje: '¿Estás seguro de que deseas eliminar esta finca?'
      }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.fincaService.eliminarFinca(id).subscribe({
          next: () => {
            this.dataSource.data = this.dataSource.data.filter(f => f.id !== id);
            console.log('Finca eliminada');
          },
          error: (err) => console.error('Error al eliminar finca:', err)
        });
      }
    });
  }
}
