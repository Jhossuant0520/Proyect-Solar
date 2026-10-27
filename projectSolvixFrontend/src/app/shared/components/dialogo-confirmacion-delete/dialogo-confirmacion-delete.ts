import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SolvixButtonComponent, SolvixButtonRank } from '../solvix-button/solvix-button';

export type DialogoConfirmacionTipo = 'primary' | 'warning' | 'danger' | 'success';

export interface DialogoConfirmacionData {
  mensaje: string;
  titulo?: string;
  kicker?: string;
  icono?: string;
  confirmText?: string;
  cancelText?: string;
  tipo?: DialogoConfirmacionTipo;
}

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
    @Inject(MAT_DIALOG_DATA) public data: DialogoConfirmacionData
  ) {}

  get mensaje(): string {
    return this.data?.mensaje ?? '¿Deseas continuar con esta acción?';
  }

  get tipo(): DialogoConfirmacionTipo {
    if (this.data?.tipo) {
      return this.data.tipo;
    }
    const m = this.mensaje.toLowerCase();
    if (m.includes('eliminar') || m.includes('borrar')) {
      return 'danger';
    }
    if (m.includes('cancelar') || m.includes('anular') || m.includes('desactivar')) {
      return 'warning';
    }
    if (m.includes('completar') || m.includes('aprobar')) {
      return 'primary';
    }
    return 'primary';
  }

  get esDanger(): boolean {
    return this.tipo === 'danger';
  }

  get esWarning(): boolean {
    return this.tipo === 'warning';
  }

  get kicker(): string {
    if (this.data?.kicker) {
      return this.data.kicker;
    }
    switch (this.tipo) {
      case 'danger':
        return 'Acción destructiva';
      case 'warning':
        return 'Confirmar cambio';
      case 'primary':
      case 'success':
      default:
        return 'Confirmar operación';
    }
  }

  get titulo(): string {
    if (this.data?.titulo) {
      return this.data.titulo;
    }
    const m = this.mensaje.toLowerCase();
    if (m.includes('eliminar') || m.includes('borrar')) {
      return 'Confirmación de eliminación';
    }
    if (m.includes('completar')) {
      return 'Completar registro';
    }
    if (m.includes('cancelar')) {
      return 'Confirmar cancelación';
    }
    if (m.includes('desactivar')) {
      return 'Desactivar registro';
    }
    if (m.includes('regenerar')) {
      return 'Regenerar documento';
    }
    return 'Confirmación';
  }

  get icono(): string {
    if (this.data?.icono) {
      return this.data.icono;
    }
    const m = this.mensaje.toLowerCase();
    if (m.includes('eliminar') || m.includes('borrar')) {
      return 'delete';
    }
    if (m.includes('completar')) {
      return 'check_circle';
    }
    if (m.includes('cancelar')) {
      return 'cancel';
    }
    if (m.includes('desactivar')) {
      return 'warning';
    }
    if (m.includes('regenerar')) {
      return 'refresh';
    }
    return 'help_outline';
  }

  get confirmText(): string {
    if (this.data?.confirmText) {
      return this.data.confirmText;
    }
    const m = this.mensaje.toLowerCase();
    if (m.includes('eliminar') || m.includes('borrar')) {
      return 'Eliminar';
    }
    if (m.includes('completar')) {
      return 'Completar';
    }
    if (m.includes('cancelar')) {
      return 'Sí, cancelar';
    }
    if (m.includes('desactivar')) {
      return 'Desactivar';
    }
    if (m.includes('regenerar')) {
      return 'Regenerar';
    }
    return 'Confirmar';
  }

  get cancelText(): string {
    return this.data?.cancelText ?? 'Cancelar';
  }

  get confirmRank(): SolvixButtonRank {
    return this.tipo === 'danger' ? 'danger' : 'primary';
  }

  cerrar(resultado: boolean): void {
    this.dialogRef.close(resultado);
  }
}
