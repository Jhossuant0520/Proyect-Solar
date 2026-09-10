import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SolvixButtonComponent } from '../solvix-button/solvix-button';

@Component({
  selector: 'app-dialogo-confirmacion-delete',
  standalone: true,
  templateUrl: './dialogo-confirmacion-delete.html',
  styleUrls: ['./dialogo-confirmacion-delete.scss'],
  imports: [MatDialogModule, SolvixButtonComponent]
})
export class DialogoConfirmacionDelete {
  constructor(
    public dialogRef: MatDialogRef<DialogoConfirmacionDelete>,
    @Inject(MAT_DIALOG_DATA) public data: { mensaje: string }
  ) {}

  cerrar(resultado: boolean): void {
    this.dialogRef.close(resultado);
  }
}
