package com.newproject.jhocadi.projectSolvixBackend.service;

import org.springframework.stereotype.Service;

import com.newproject.jhocadi.projectSolvixBackend.model.fincaModel;
import com.newproject.jhocadi.projectSolvixBackend.repository.FincaRepository;

import java.util.List;

@Service
public class FincaService {

    private final FincaRepository fincaRepository;

    public FincaService(FincaRepository fincaRepository) {
        this.fincaRepository = fincaRepository;
    }

    public fincaModel registrarFinca(fincaModel finca) {
        if (finca == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud no puede ser nulo");
        }
        return fincaRepository.save(finca);
    }

    public List<fincaModel> listarFincas() {
        return fincaRepository.findAll();
    }

    public java.util.Optional<fincaModel> obtenerFincaPorId(long id) {
        return fincaRepository.findById(id);
    }

    public void eliminarFinca(long id) {
        fincaRepository.deleteById(id);
    }
}
