import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocumentoOrdenServicioService } from '../../../core/services/documento-orden-servicio.service';
import { ConsultaOtPublicaDTO } from '../../../core/models/documento-orden-servicio.models';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { formatFechaOrden, labelTipoEquipo } from '../../panelAdmin/servicios/servicio-ui';

type Estado = 'loading' | 'ready' | 'error' | 'sin-token';

@Component({
  selector: 'app-consulta-ot-publica',
  standalone: true,
  imports: [RouterLink, SolvixLoadingStateComponent, SolvixErrorStateComponent],
  templateUrl: './consulta-ot-publica.html',
  styleUrl: './consulta-ot-publica.scss'
})
export class ConsultaOtPublicaComponent implements OnInit {
  state: Estado = 'loading';
  data: ConsultaOtPublicaDTO | null = null;
  errorMessage = 'No encontramos esta orden.';

  readonly fecha = formatFechaOrden;
  readonly tipoEquipo = labelTipoEquipo;

  constructor(
    private route: ActivatedRoute,
    private documentoService: DocumentoOrdenServicioService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token')?.trim();
    if (!token) {
      this.state = 'sin-token';
      this.errorMessage = 'El enlace no es válido.';
      return;
    }
    this.documentoService.consultaOtPublica(token).subscribe({
      next: dto => {
        this.data = dto;
        this.state = 'ready';
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = 'No encontramos esta orden o el enlace ya no es válido.';
      }
    });
  }

  equipoResumen(): string {
    if (!this.data) {
      return '—';
    }
    const partes = [
      this.tipoEquipo(this.data.equipoTipo),
      this.data.equipoMarca,
      this.data.equipoModelo
    ].filter(p => !!(p && String(p).trim()));
    return partes.length ? partes.join(' · ') : 'Equipo sin detalle público';
  }
}
