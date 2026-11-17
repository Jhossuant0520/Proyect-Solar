package com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulComercialService;

import java.time.LocalDateTime;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.SecuenciaDocumento;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo.SecuenciaDocumentoRepository;

import lombok.RequiredArgsConstructor;

/**
 * Genera identificadores de negocio legibles con contador anual: V-2026-000001, C-2026-000001.
 */
@Service
@RequiredArgsConstructor
public class SecuenciaDocumentoService {

    private final SecuenciaDocumentoRepository secuenciaRepository;

    @Transactional
    public String siguienteNumero(TipoSecuencia tipo, LocalDateTime fecha) {
        int anio = (fecha != null ? fecha : LocalDateTime.now()).getYear();

        SecuenciaDocumento secuencia = secuenciaRepository
            .findByTipoAndAnio(tipo, anio)
            .orElseGet(() -> Objects.requireNonNull(secuenciaRepository.save(
                SecuenciaDocumento.builder()
                    .tipo(tipo)
                    .anio(anio)
                    .ultimoValor(0L)
                    .build())));

        long siguiente = secuencia.getUltimoValor() + 1;
        secuencia.setUltimoValor(siguiente);
        secuenciaRepository.save(secuencia);

        return String.format("%s-%d-%06d", tipo.getPrefijo(), anio, siguiente);
    }
}
