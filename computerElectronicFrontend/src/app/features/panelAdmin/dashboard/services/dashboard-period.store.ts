import { Injectable, signal } from '@angular/core';
import { Params } from '@angular/router';
import { PeriodoFiltro, PeriodoPreset } from '../models/dashboard.models';
import { periodoInicial, rangoDePreset } from '../utils/dashboard-period';

const PRESETS: PeriodoPreset[] = ['hoy', 'semana', 'mes', 'anio', 'personalizado'];

function isPreset(value: unknown): value is PeriodoPreset {
  return typeof value === 'string' && (PRESETS as string[]).includes(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

@Injectable({ providedIn: 'root' })
export class DashboardPeriodStore {
  readonly periodo = signal<PeriodoFiltro>(periodoInicial());
  /** Incrementa al pulsar Actualizar para forzar recarga en la vista activa. */
  readonly refreshTick = signal(0);

  bumpRefresh(): void {
    this.refreshTick.update(n => n + 1);
  }

  /** Lee query params sin inventar rangos: si faltan, usa el estado actual o el inicial. */
  syncFromQuery(params: Params): void {
    const preset = isPreset(params['preset']) ? params['preset'] : null;
    const desde = isIsoDate(params['desde']) ? params['desde'] : null;
    const hasta = isIsoDate(params['hasta']) ? params['hasta'] : null;

    if (!preset && !desde && !hasta) {
      return;
    }

    const base = this.periodo();
    if (preset && preset !== 'personalizado') {
      this.periodo.set({ preset, ...rangoDePreset(preset) });
      return;
    }

    this.periodo.set({
      preset: preset ?? (desde || hasta ? 'personalizado' : base.preset),
      desde: desde ?? base.desde,
      hasta: hasta ?? base.hasta
    });
  }

  setPeriodo(periodo: PeriodoFiltro): void {
    this.periodo.set(periodo);
  }

  toQueryParams(periodo: PeriodoFiltro = this.periodo()): Record<string, string> {
    return {
      preset: periodo.preset,
      desde: periodo.desde,
      hasta: periodo.hasta
    };
  }
}
