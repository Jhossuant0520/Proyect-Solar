package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ProveedorRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ProveedorResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ProveedorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;

    @Transactional
    public ProveedorResponseDTO crear(ProveedorRequestDTO request) {
        validarDocumentoUnico(request.getDocumento(), null);

        Proveedor proveedor = Proveedor.builder()
            .nombre(request.getNombre().trim())
            .documento(normalizar(request.getDocumento()))
            .contacto(normalizar(request.getContacto()))
            .email(normalizar(request.getEmail()))
            .telefono(normalizar(request.getTelefono()))
            .notas(normalizar(request.getNotas()))
            .activo(request.getActivo() == null || request.getActivo())
            .build();

        return ProveedorResponseDTO.fromEntity(proveedorRepository.save(proveedor));
    }

    @Transactional(readOnly = true)
    public List<ProveedorResponseDTO> listar(Boolean soloActivos) {
        List<Proveedor> proveedores = Boolean.TRUE.equals(soloActivos)
            ? proveedorRepository.findByActivoTrueOrderByNombreAsc()
            : proveedorRepository.findAll();

        return proveedores.stream().map(ProveedorResponseDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public ProveedorResponseDTO obtenerPorId(Long id) {
        return ProveedorResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional
    public ProveedorResponseDTO actualizar(Long id, ProveedorRequestDTO request) {
        Proveedor proveedor = buscarOFallar(id);
        validarDocumentoUnico(request.getDocumento(), id);

        proveedor.setNombre(request.getNombre().trim());
        proveedor.setDocumento(normalizar(request.getDocumento()));
        proveedor.setContacto(normalizar(request.getContacto()));
        proveedor.setEmail(normalizar(request.getEmail()));
        proveedor.setTelefono(normalizar(request.getTelefono()));
        proveedor.setNotas(normalizar(request.getNotas()));
        if (request.getActivo() != null) {
            proveedor.setActivo(request.getActivo());
        }

        return ProveedorResponseDTO.fromEntity(proveedorRepository.save(proveedor));
    }

    @Transactional
    public ProveedorResponseDTO desactivar(Long id) {
        Proveedor proveedor = buscarOFallar(id);
        proveedor.setActivo(false);
        return ProveedorResponseDTO.fromEntity(proveedorRepository.save(proveedor));
    }

    @Transactional(readOnly = true)
    public Proveedor buscarOFallar(Long id) {
        return proveedorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proveedor no encontrado."));
    }

    private void validarDocumentoUnico(String documento, Long idActual) {
        String limpio = normalizar(documento);
        if (limpio == null) {
            return;
        }

        proveedorRepository.findByDocumento(limpio)
            .filter(existente -> !existente.getId().equals(idActual))
            .ifPresent(existente -> {
                throw new BusinessException("Ya existe un proveedor con ese documento.");
            });
    }

    private String normalizar(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
