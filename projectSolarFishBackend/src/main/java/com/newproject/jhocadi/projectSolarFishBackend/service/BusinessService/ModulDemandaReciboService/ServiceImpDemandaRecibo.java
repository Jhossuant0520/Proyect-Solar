package com.newproject.jhocadi.projectSolarFishBackend.service.BusinessService.ModulDemandaReciboService;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.RequestDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.ResponseDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulDemandaReciboModel.modelDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.repository.AccesRepo.repositoryUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.BusinessRepo.ModulDemandaReciboRepo.RepositoryDemandaRecibo;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceImpDemandaRecibo implements ServiceDemandaRecibo {

    private final RepositoryDemandaRecibo demandaRepo;
    private final repositoryUsuario usuarioRepo;

    @Override
    public ResponseDemandaRecibo calcularDemandaEnergetica(RequestDemandaRecibo request) {
        return calcular(request);
    }

    @Override
    public ResponseDemandaRecibo calcularYGuardar(RequestDemandaRecibo request, String nombreUsuario) {
        ResponseDemandaRecibo response = calcular(request);

        modelUsuario usuario = usuarioRepo.findByNombreUsuario(nombreUsuario)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        // Calcular consumo total del periodo
        double consumoTotal = 0.0;
        if ("RECIBOS".equalsIgnoreCase(response.getModoCalculoConsumoBase())) {
            consumoTotal = response.getConsumoBaseMensualKwhUsuario() * response.getCantidadRecibosUsados();
        } else if ("PROMEDIO_DIRECTO".equalsIgnoreCase(response.getModoCalculoConsumoBase())) {
            consumoTotal = response.getConsumoBaseMensualKwhUsuario() * response.getCantidadRecibosUsados();
        }

        modelDemandaRecibo entidad = modelDemandaRecibo.builder()
            .usuario(usuario)
            .modoCalculoConsumoBase(response.getModoCalculoConsumoBase())
            .consumoBaseMensualKwh(response.getConsumoBaseMensualKwhUsuario())
            .cantidadRecibosUsados(response.getCantidadRecibosUsados())
            .diasPeriodoCalculados(response.getDiasPeriodoCalculados())
            .energiaDiariaWhBase(response.getEnergiaDiariaWhBase())
            .energiaMensualWhBase(response.getEnergiaMensualWhBase())
            .energiaAnualWhBase(response.getEnergiaAnualWhBase())
            .porcentajeCobertura(response.getPorcentajeCoberturaAplicado())
            .energiaDiariaWhCubierta(response.getEnergiaDiariaWhCubierta())
            .energiaDiariaWhFinal(response.getEnergiaDiariaWhFinal())
            .energiaMensualWhFinal(response.getEnergiaMensualWhFinal())
            .energiaAnualWhFinal(response.getEnergiaAnualWhFinal())
            .consumoTotalPeriodoKwh(consumoTotal)
            .build();

        demandaRepo.save(entidad);
        return response;
    }

    // ── lógica de cálculo (sin cambios respecto a lo que ya tenías) ──────────
    private ResponseDemandaRecibo calcular(RequestDemandaRecibo request) {
        ResponseDemandaRecibo response = new ResponseDemandaRecibo();

        LocalDate fechaInicio = LocalDate.of(request.getAnioInicio(), request.getMesInicio(), 1);
        LocalDate fechaFin    = YearMonth.of(request.getAnioFin(), request.getMesFin()).atEndOfMonth();

        if (fechaFin.isBefore(fechaInicio))
            throw new IllegalArgumentException("El periodo de fechas es inválido.");

        int diasPeriodo = (int) ChronoUnit.DAYS.between(fechaInicio, fechaFin) + 1;

        double consumoBaseKwh;

        if ("RECIBOS".equalsIgnoreCase(request.getModoCalculoConsumoBase())) {
            List<Double> recibos = request.getRecibosKwh();
            if (recibos == null || recibos.isEmpty())
                throw new IllegalArgumentException("Debe ingresar los valores de los recibos.");
            if (recibos.size() < 6 || recibos.size() > 12)
                throw new IllegalArgumentException("La cantidad de recibos debe ser mínimo 6 y máximo 12.");
            consumoBaseKwh = recibos.stream().mapToDouble(Double::doubleValue).sum() / recibos.size();
            response.setCantidadRecibosUsados(recibos.size());

        } else if ("PROMEDIO_DIRECTO".equalsIgnoreCase(request.getModoCalculoConsumoBase())) {
            if (request.getConsumoPromedioDirectoKwh() == null || request.getConsumoPromedioDirectoKwh() <= 0)
                throw new IllegalArgumentException("El consumo promedio directo debe ser mayor a 0.");
            consumoBaseKwh = request.getConsumoPromedioDirectoKwh();
            long mesesPeriodo = ChronoUnit.MONTHS.between(fechaInicio, fechaFin.plusDays(1));
            response.setCantidadRecibosUsados((int) mesesPeriodo);

        } else {
            throw new IllegalArgumentException("Modo de cálculo no soportado.");
        }

        double energiaDiariaWhBase   = (consumoBaseKwh * 1000.0) / diasPeriodo;
        double energiaMensualWhBase  = energiaDiariaWhBase * 30;
        double energiaAnualWhBase    = energiaDiariaWhBase * 365;

        double factorCobertura        = request.getPorcentajeCobertura() / 100.0;
        double energiaDiariaWhCubierta = energiaDiariaWhBase * factorCobertura;

        double energiaDiariaWhFinal  = energiaDiariaWhCubierta * 1.25;
        double energiaMensualWhFinal = energiaDiariaWhFinal * 30;
        double energiaAnualWhFinal   = energiaDiariaWhFinal * 365;

        response.setModoCalculoConsumoBase(request.getModoCalculoConsumoBase());
        response.setConsumoBaseMensualKwhUsuario(consumoBaseKwh);
        response.setDiasPeriodoCalculados(diasPeriodo);
        response.setEnergiaDiariaWhBase(energiaDiariaWhBase);
        response.setEnergiaMensualWhBase(energiaMensualWhBase);
        response.setEnergiaAnualWhBase(energiaAnualWhBase);
        response.setPorcentajeCoberturaAplicado(request.getPorcentajeCobertura());
        response.setFactorCoberturaDecimal(factorCobertura);
        response.setEnergiaDiariaWhCubierta(energiaDiariaWhCubierta);
        response.setFactorSeguridad(0.25);
        response.setEnergiaDiariaWhFinal(energiaDiariaWhFinal);
        response.setEnergiaMensualWhFinal(energiaMensualWhFinal);
        response.setEnergiaAnualWhFinal(energiaAnualWhFinal);

        return response;
    }
}