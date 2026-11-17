import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CotizacionComercialService } from '../../../core/services/cotizacion-comercial.service';
import { ConsultaCotizacionPublicaDTO } from '../../../core/models/cotizacion-comercial.models';
import { CeLoadingStateComponent } from '../../../shared/components/ce-loading-state/ce-loading-state';
import { CeErrorStateComponent } from '../../../shared/components/ce-error-state/ce-error-state';
import { CeThemeToggleComponent } from '../../../shared/components/ce-theme-toggle/ce-theme-toggle';
import { formatFechaVenta, formatImporte } from '../../panelAdmin/venta/venta-ui';

type Estado = 'loading' | 'ready' | 'error' | 'sin-token';

@Component({
  selector: 'app-consulta-cotizacion-publica',
  standalone: true,
  imports: [RouterLink, CeLoadingStateComponent, CeErrorStateComponent, CeThemeToggleComponent],
  templateUrl: './consulta-cotizacion-publica.html',
  styleUrl: '../consulta-documento-publica/consulta-documento-publica.scss'
})
export class ConsultaCotizacionPublicaComponent implements OnInit {
  state: Estado = 'loading';
  data: ConsultaCotizacionPublicaDTO | null = null;
  errorMessage = 'No encontramos esta cotización.';

  readonly fecha = formatFechaVenta;
  readonly money = formatImporte;

  constructor(
    private route: ActivatedRoute,
    private cotizacionService: CotizacionComercialService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token')?.trim();
    if (!token) {
      this.state = 'sin-token';
      this.errorMessage = 'El enlace no es válido.';
      return;
    }
    this.cotizacionService.consultaPublica(token).subscribe({
      next: dto => {
        this.data = dto;
        this.state = 'ready';
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = 'No encontramos esta cotización o el enlace ya no es válido.';
      }
    });
  }
}
