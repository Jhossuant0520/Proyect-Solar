import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dialogo-confirmacion-delete',
  standalone: true,
  templateUrl: './dialogo-confirmacion-delete.html',
  styleUrls: ['./dialogo-confirmacion-delete.scss'],
  imports: [CommonModule, MatDialogModule, MatButtonModule],
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
