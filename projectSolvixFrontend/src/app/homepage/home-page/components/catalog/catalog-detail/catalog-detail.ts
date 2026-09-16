import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { CatalogoProducto } from '../../../../../core/models/catalogo.models';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { formatMoney } from '../../../../../features/panelAdmin/dashboard/utils/dashboard-format';
import { SolvixBadgeComponent } from '../../../../../shared/components/solvix-badge/solvix-badge';
import { resolverUrlMedia } from '../../../../../core/utils/media-url';
import {
  enlaceWhatsAppProducto,
  labelDisponibilidad,
  tonoDisponibilidad
} from '../catalogo-ui';

type DetalleViewState = 'LOADING' | 'SUCCESS' | 'ERROR';

@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SolvixBadgeComponent],
  templateUrl: './catalog-detail.html',
  styleUrl: './catalog-detail.scss'
})
export class CatalogDetail implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  viewState: DetalleViewState = 'LOADING';
  producto: CatalogoProducto | null = null;
  imagenRota = false;
  whatsappUrl = '';

  readonly formatMoney = formatMoney;
  readonly labelDisponibilidad = labelDisponibilidad;
  readonly tonoDisponibilidad = tonoDisponibilidad;

  constructor(
    private route: ActivatedRoute,
    private catalogoService: CatalogoService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          this.viewState = 'LOADING';
          this.producto = null;
          this.imagenRota = false;
          const id = Number(params.get('id'));
          return this.catalogoService.obtenerProducto(id);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: producto => {
          this.producto = producto;
          this.whatsappUrl = enlaceWhatsAppProducto(producto);
          this.viewState = 'SUCCESS';
        },
        error: () => {
          this.producto = null;
          this.viewState = 'ERROR';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onImagenError(): void {
    this.imagenRota = true;
  }

  get imagenDisponible(): boolean {
    return Boolean(resolverUrlMedia(this.producto?.imagenUrl)) && !this.imagenRota;
  }

  get urlImagen(): string | null {
    return resolverUrlMedia(this.producto?.imagenUrl);
  }
}
