export interface RequestHSP {
  latitud: number;
  longitud: number;
}

export interface ResponseHSPMes {
  mes: number;
  nombreMes: string;
  diasMes: number;
  hOptM: number;
  hspDiaria: number;
}

export interface ResponseHSP {
  latitud: number;
  longitud: number;
  anioConsultado: number;
  slopeAngle: number;
  azimuthAngle: number;
  meses: ResponseHSPMes[];
  hspCritica: number;
  mesCritico: number;
  nombreMesCritico: string;
  hspFavorable: number;
  mesFavorable: number;
  nombreMesFavorable: string;
  hspPromedio: number;
  hspDiseno: number;
}