import { fincaModel } from "../finca/fincaClase";

export interface DemandaEnergeticaClase {
  id?: number;
  finca: fincaModel;
  demandaDiaria: number;
  demandaMensual: number;
  demandaAnual: number;
  demandaAC: number;
  demandaDC: number;
  fechaRegistro?: string;
}
