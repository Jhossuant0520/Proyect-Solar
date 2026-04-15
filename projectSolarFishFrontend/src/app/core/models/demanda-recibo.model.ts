export interface RequestDemandaRecibo {
  modoCalculoConsumoBase: string;
  recibosKwh?: number[];
  consumoPromedioDirectoKwh?: number;
  precioKwhCop: number;
  porcentajeCobertura: number;
  anioInicio: number;
  mesInicio: number;
  anioFin: number;
  mesFin: number;
}

export interface ResponseDemandaRecibo {
  modoCalculoConsumoBase: string;
  consumoBaseMensualKwhUsuario: number;
  cantidadRecibosUsados: number;
  diasPeriodoCalculados: number;
  energiaDiariaWhBase: number;
  energiaMensualWhBase: number;
  energiaAnualWhBase: number;
  porcentajeCoberturaAplicado: number;
  factorCoberturaDecimal: number;
  energiaDiariaWhCubierta: number;
  consumoPeriodoKwhTotalUsuario: number;
  factorPerdidasDecimal: number;
  energiaDiariaWhFinal: number;
  energiaMensualWhFinal: number;
  energiaAnualWhFinal: number;
}
