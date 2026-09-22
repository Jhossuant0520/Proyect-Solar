import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocumentoOrdenServicioService } from '../../../core/services/documento-orden-servicio.service';
import { ConsultaDocumentoPublicoDTO } from '../../../core/models/documento-orden-servicio.models';
import { SolvixLoadingStateComponent } from '../../../shared/components/solvix-loading-state/solvix-loading-state';
import { SolvixErrorStateComponent } from '../../../shared/components/solvix-error-state/solvix-error-state';
import { formatFechaOrden } from '../../panelAdmin/servicios/servicio-ui';
import { labelTipoDocumento } from '../../../core/models/documento-orden-servicio.models';

type Estado = 'loading' | 'ready' | 'error' | 'sin-token';

@Component({
  selector: 'app-consulta-documento-publica',
  standalone: true,
  imports: [RouterLink, SolvixLoadingStateComponent, SolvixErrorStateComponent],
  templateUrl: './consulta-documento-publica.html',
  styleUrl: './consulta-documento-publica.scss'
})
export class ConsultaDocumentoPublicaComponent implements OnInit {
  state: Estado = 'loading';
  data: ConsultaDocumentoPublicoDTO | null = null;
  errorMessage = 'No encontramos este documento.';

  readonly fecha = formatFechaOrden;
  readonly labelTipo = labelTipoDocumento;

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
    this.documentoService.consultaDocumentoPublico(token).subscribe({
      next: dto => {
        this.data = dto;
        this.state = 'ready';
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = 'No encontramos este documento o el enlace ya no es válido.';
      }
    });
  }
}
