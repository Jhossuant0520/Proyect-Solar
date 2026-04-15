import { fincaModel } from '../../finca/fincaClase';

export interface ComponenteEnergeticoByClase {
    id?: number;
    finca: fincaModel;
    nombre: string;
    cantidad: number;
    potencia: number;
    horasOperacion: number;
    coeficienteArranque: number;
    horasRealesPeriodo: number;
    tipoEnergia: 'AC' | 'DC';
    fechaRegistro?: string;
  }
    