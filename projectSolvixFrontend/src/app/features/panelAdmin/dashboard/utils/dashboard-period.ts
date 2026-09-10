import { PeriodoFiltro, PeriodoPreset } from '../models/dashboard.models';

export const PERIODO_PRESETS: { id: PeriodoPreset; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'anio', label: 'Este año' },
  { id: 'personalizado', label: 'Personalizado' }
];

export function periodoInicial(): PeriodoFiltro {
  const rango = rangoDePreset('mes');
  return { preset: 'mes', ...rango };
}

/** Ventanas de calendario. No calcula métricas de negocio. */
export function rangoDePreset(preset: PeriodoPreset, hoy = new Date()): { desde: string; hasta: string } {
  const hasta = toDateInput(hoy);
  switch (preset) {
    case 'hoy':
      return { desde: hasta, hasta };
    case 'semana': {
      const monday = new Date(hoy);
      const day = monday.getDay();
      monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
      return { desde: toDateInput(monday), hasta };
    }
    case 'anio':
      return { desde: `${hoy.getFullYear()}-01-01`, hasta };
    case 'personalizado':
    case 'mes':
    default: {
      const month = String(hoy.getMonth() + 1).padStart(2, '0');
      return { desde: `${hoy.getFullYear()}-${month}-01`, hasta };
    }
  }
}

export function toQueryDesde(date: string): string {
  return date.includes('T') ? date : `${date}T00:00:00`;
}

export function toQueryHasta(date: string): string {
  return date.includes('T') ? date : `${date}T23:59:59`;
}

function toDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
