package com.newproject.jhocadi.projectSolarFishBackend.service;

import com.newproject.jhocadi.projectSolarFishBackend.model.componenteEnergeticoModel;
import com.newproject.jhocadi.projectSolarFishBackend.repository.ComponenteEnergeticoRepository;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ComponenteEnergeticoService {

    private final ComponenteEnergeticoRepository componenteEnergeticoRepository;

    public ComponenteEnergeticoService(ComponenteEnergeticoRepository componenteEnergeticoRepository) {
        this.componenteEnergeticoRepository = componenteEnergeticoRepository;
    }

    public componenteEnergeticoModel registrar(componenteEnergeticoModel componente) {
    if (componente == null) {
        throw new IllegalArgumentException("El componente no puede ser null");
    }
    return componenteEnergeticoRepository.save(componente);
}


    public List<componenteEnergeticoModel> listarPorFinca(Long fincaId) {
        return componenteEnergeticoRepository.findByFincaId(fincaId);
    }

   public Optional<componenteEnergeticoModel> obtenerPorId(long id) {
    return componenteEnergeticoRepository.findById(id);
}


    public java.util.Optional<componenteEnergeticoModel> actualizar(
        long id,
        @NonNull componenteEnergeticoModel componente) {

    java.util.Optional<componenteEnergeticoModel> maybeExisting = componenteEnergeticoRepository.findById(id);
    if (maybeExisting.isEmpty()) {
        return java.util.Optional.empty();
    }
    componenteEnergeticoModel existingComponente = maybeExisting.get();

    existingComponente.setFinca(componente.getFinca());
    existingComponente.setNombre(componente.getNombre());
    existingComponente.setCantidad(componente.getCantidad());
    existingComponente.setPotencia(componente.getPotencia());
    existingComponente.setHorasOperacion(componente.getHorasOperacion());
    existingComponente.setCoeficienteArranque(componente.getCoeficienteArranque());
    existingComponente.setHorasRealesPeriodo(componente.getHorasRealesPeriodo());
    existingComponente.setTipoEnergia(componente.getTipoEnergia());

    componenteEnergeticoModel saved = componenteEnergeticoRepository.save(existingComponente);
    return java.util.Optional.of(saved);
}


    public void eliminar(long id) {
        componenteEnergeticoRepository.deleteById(id);
    }
}
