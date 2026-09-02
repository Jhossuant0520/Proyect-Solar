package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ClienteRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ClienteResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoCliente;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ClienteRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private static final String NOMBRE_CONSUMIDOR_FINAL = "Consumidor final";

    private final ClienteRepository clienteRepository;

    @Transactional
    public ClienteResponseDTO crear(ClienteRequestDTO request) {
        validarTipoEditable(request.getTipoCliente());
        validarDocumentoUnico(request, null);

        Cliente cliente = Cliente.builder()
            .nombre(request.getNombre().trim())
            .tipoCliente(request.getTipoCliente() != null ? request.getTipoCliente() : TipoCliente.PERSONA)
            .tipoDocumento(request.getTipoDocumento())
            .numeroDocumento(normalizar(request.getNumeroDocumento()))
            .email(normalizar(request.getEmail()))
            .telefono(normalizar(request.getTelefono()))
            .notas(normalizar(request.getNotas()))
            .activo(request.getActivo() == null || request.getActivo())
            .build();

        return ClienteResponseDTO.fromEntity(clienteRepository.save(cliente));
    }

    @Transactional(readOnly = true)
    public List<ClienteResponseDTO> listar(Boolean soloActivos) {
        List<Cliente> clientes = Boolean.TRUE.equals(soloActivos)
            ? clienteRepository.findByActivoTrueOrderByNombreAsc()
            : clienteRepository.findAll();

        return clientes.stream().map(ClienteResponseDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponseDTO obtenerPorId(Long id) {
        return ClienteResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional
    public ClienteResponseDTO actualizar(Long id, ClienteRequestDTO request) {
        Cliente cliente = buscarOFallar(id);

        if (cliente.esConsumidorFinal()) {
            throw new BusinessException("El Consumidor final es un registro del sistema y no puede editarse.");
        }
        validarTipoEditable(request.getTipoCliente());
        validarDocumentoUnico(request, id);

        cliente.setNombre(request.getNombre().trim());
        if (request.getTipoCliente() != null) {
            cliente.setTipoCliente(request.getTipoCliente());
        }
        cliente.setTipoDocumento(request.getTipoDocumento());
        cliente.setNumeroDocumento(normalizar(request.getNumeroDocumento()));
        cliente.setEmail(normalizar(request.getEmail()));
        cliente.setTelefono(normalizar(request.getTelefono()));
        cliente.setNotas(normalizar(request.getNotas()));
        if (request.getActivo() != null) {
            cliente.setActivo(request.getActivo());
        }

        return ClienteResponseDTO.fromEntity(clienteRepository.save(cliente));
    }

    @Transactional
    public ClienteResponseDTO desactivar(Long id) {
        Cliente cliente = buscarOFallar(id);
        if (cliente.esConsumidorFinal()) {
            throw new BusinessException("El Consumidor final no puede desactivarse.");
        }
        cliente.setActivo(false);
        return ClienteResponseDTO.fromEntity(clienteRepository.save(cliente));
    }

    /**
     * Resuelve el Consumidor final por su tipo, no por un id fijo. Si no existe lo crea:
     * es un registro estructural del sistema, no un dato de negocio ficticio.
     */
    @Transactional
    public Cliente obtenerOCrearConsumidorFinal() {
        return clienteRepository
            .findFirstByTipoClienteOrderByIdAsc(TipoCliente.CONSUMIDOR_FINAL)
            .orElseGet(() -> clienteRepository.save(
                Cliente.builder()
                    .nombre(NOMBRE_CONSUMIDOR_FINAL)
                    .tipoCliente(TipoCliente.CONSUMIDOR_FINAL)
                    .activo(true)
                    .build()));
    }

    @Transactional(readOnly = true)
    public Cliente buscarOFallar(Long id) {
        return clienteRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado."));
    }

    private void validarTipoEditable(TipoCliente tipoCliente) {
        if (tipoCliente == TipoCliente.CONSUMIDOR_FINAL) {
            throw new BusinessException(
                "El tipo CONSUMIDOR_FINAL está reservado para el cliente genérico del sistema.");
        }
    }

    private void validarDocumentoUnico(ClienteRequestDTO request, Long idActual) {
        if (request.getTipoDocumento() == null || normalizar(request.getNumeroDocumento()) == null) {
            return;
        }

        clienteRepository
            .findByTipoDocumentoAndNumeroDocumento(
                request.getTipoDocumento(), normalizar(request.getNumeroDocumento()))
            .filter(existente -> !existente.getId().equals(idActual))
            .ifPresent(existente -> {
                throw new BusinessException("Ya existe un cliente con ese documento.");
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
