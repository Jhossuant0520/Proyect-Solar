package com.newproject.jhocadi.projectSolarFishBackend.service;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.RequestDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.ResponseDemandaRecibo;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public class ServiceImpDemandaRecibo implements ServiceDemandaRecibo {

    @Override
    public ResponseDemandaRecibo calcularDemandaEnergetica(RequestDemandaRecibo request) {
        ResponseDemandaRecibo response = new ResponseDemandaRecibo();

        // 1. Obtener fechas exactas
        LocalDate inicio = request.getFechaInicioPeriodo();
        LocalDate fin = request.getFechaFinPeriodo();

        if (inicio == null || fin == null || fin.isBefore(inicio)) {
            throw new IllegalArgumentException("El periodo de fechas es inválido");
        }

        // 2. Cálculo exacto de días (La base de toda la lógica)
        // Usamos ChronoUnit para obtener la diferencia real en días calendario
        int diasPeriodo = (int) ChronoUnit.DAYS.between(inicio, fin) + 1;

        // 3. Obtener el Consumo Total en kWh
        double consumoTotalKwh = 0.0;
        double consumoBaseMensual = 0.0;

        if ("RECIBOS".equalsIgnoreCase(request.getModoCalculoConsumoBase())) {
            List<Double> recibos = request.getRecibosKwh();
            if (recibos == null || recibos.isEmpty()) throw new IllegalArgumentException("Lista de recibos vacía");

            // SUMATORIA PURA: 315 + 111 + 128 = 554
            consumoTotalKwh = recibos.stream().mapToDouble(Double::doubleValue).sum();
            
            // El promedio mensual es informativo (Total / (Días / 30.41))
            consumoBaseMensual = consumoTotalKwh / (diasPeriodo / 30.4167); 
        } else {
            // Si es promedio directo, calculamos el total proyectado según los días del periodo
            consumoBaseMensual = request.getConsumoPromedioDirectoKwh();
            consumoTotalKwh = (consumoBaseMensual / 30.4167) * diasPeriodo;
        }

        // 4. CÁLCULO MAESTRO: Wh/día
        // (Total kWh * 1000) / Días Reales
        // Ejemplo: (554 * 1000) / 182 = 3,043.95 Wh/día
        double energiaDiariaWhBase = (consumoTotalKwh * 1000) / diasPeriodo;

        // 5. Aplicar Cobertura y Pérdidas (Lógica de Ingeniería)
        double factorCobertura = request.getPorcentajeCobertura() / 100.0;
        double factorPerdidas = 1.25; // 25% de pérdidas según tu código

        double energiaDiariaWhFinal = energiaDiariaWhBase * factorCobertura * factorPerdidas;

        // 6. Mapear al Response
        response.setDiasPeriodoCalculados(diasPeriodo);
        response.setConsumoPeriodoKwhTotalUsuario(consumoTotalKwh);
        response.setEnergiaDiariaWhBase(energiaDiariaWhBase);
        response.setEnergiaDiariaWhFinal(energiaDiariaWhFinal);
        
        // Proyecciones (Opcionales, usando promedio técnico de 30.41 días por mes)
        response.setEnergiaMensualWhFinal(energiaDiariaWhFinal * 30.4167); 

        return response;
    }
}