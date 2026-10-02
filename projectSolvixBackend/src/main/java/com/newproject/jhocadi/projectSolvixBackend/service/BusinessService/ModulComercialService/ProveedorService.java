package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ContactoProveedorRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ProveedorRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ProveedorResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ContactoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoContactoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ProveedorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProveedorService {

    private static final int LIMITE_MAXIMO_BUSQUEDA = 50;

    private final ProveedorRepository proveedorRepository;

    @Transactional
    public ProveedorResponseDTO crear(ProveedorRequestDTO request) {
        String razonSocial = request.resolverRazonSocial();
        String numeroDocumento = normalizarNit(request.resolverNumeroDocumento());

        validarIdentificacion(razonSocial, numeroDocumento);
        validarDocumentoUnico(numeroDocumento, null);
        validarCondicionPago(request.getCondicionPago(), request.getDiasCredito());

        Proveedor proveedor = Proveedor.builder()
            .nombre(razonSocial)
            .tipoDocumento(TipoDocumento.NIT)
            .documento(numeroDocumento)
            .nombreComercial(normalizar(request.getNombreComercial()))
            .direccion(normalizar(request.getDireccion()))
            .ciudad(normalizar(request.getCiudad()))
            .departamento(normalizar(request.getDepartamento()))
            .telefono(normalizar(request.getTelefono()))
            .telefonoAlternativo(normalizar(request.getTelefonoAlternativo()))
            .email(normalizar(request.getEmail()))
            .web(normalizar(request.getWeb()))
            .condicionPago(request.getCondicionPago())
            .diasCredito(normalizarDiasCredito(request.getCondicionPago(), request.getDiasCredito()))
            .notas(normalizar(request.getNotas()))
            .activo(request.getActivo() == null || request.getActivo())
            .contactos(new ArrayList<>())
            .build();

        sincronizarContactos(proveedor, request.getContactos(), true);

        return ProveedorResponseDTO.fromEntity(proveedorRepository.save(proveedor));
    }

    @Transactional(readOnly = true)
    public List<ProveedorResponseDTO> listar(Boolean soloActivos) {
        boolean filtrar = Boolean.TRUE.equals(soloActivos);
        return proveedorRepository.listarOrdenados(filtrar).stream()
            .map(ProveedorResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ProveedorResponseDTO> buscar(String texto, Integer limite, Boolean soloActivos) {
        String q = texto != null ? texto.trim().toLowerCase(Locale.ROOT) : "";
        int tope = limite != null ? Math.min(Math.max(limite, 1), LIMITE_MAXIMO_BUSQUEDA) : 10;
        return proveedorRepository
            .buscar("%" + q + "%", Boolean.TRUE.equals(soloActivos), PageRequest.of(0, tope, Sort.by("nombre")))
            .stream()
            .map(ProveedorResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public ProveedorResponseDTO obtenerPorId(Long id) {
        return ProveedorResponseDTO.fromEntity(buscarConContactosOFallar(id));
    }

    @Transactional
    public ProveedorResponseDTO actualizar(Long id, ProveedorRequestDTO request) {
        Proveedor proveedor = buscarConContactosOFallar(id);

        String razonSocial = request.resolverRazonSocial();
        String numeroDocumento = normalizarNit(request.resolverNumeroDocumento());

        validarIdentificacion(razonSocial, numeroDocumento);
        validarDocumentoUnico(numeroDocumento, id);
        validarCondicionPago(request.getCondicionPago(), request.getDiasCredito());

        proveedor.setNombre(razonSocial);
        proveedor.setTipoDocumento(TipoDocumento.NIT);
        proveedor.setDocumento(numeroDocumento);
        proveedor.setNombreComercial(normalizar(request.getNombreComercial()));
        proveedor.setDireccion(normalizar(request.getDireccion()));
        proveedor.setCiudad(normalizar(request.getCiudad()));
        proveedor.setDepartamento(normalizar(request.getDepartamento()));
        proveedor.setTelefono(normalizar(request.getTelefono()));
        proveedor.setTelefonoAlternativo(normalizar(request.getTelefonoAlternativo()));
        proveedor.setEmail(normalizar(request.getEmail()));
        proveedor.setWeb(normalizar(request.getWeb()));
        proveedor.setCondicionPago(request.getCondicionPago());
        proveedor.setDiasCredito(normalizarDiasCredito(request.getCondicionPago(), request.getDiasCredito()));
        proveedor.setNotas(normalizar(request.getNotas()));
        if (request.getActivo() != null) {
            proveedor.setActivo(request.getActivo());
        }

        sincronizarContactos(proveedor, request.getContactos(), false);

        return ProveedorResponseDTO.fromEntity(proveedorRepository.save(proveedor));
    }

    @Transactional
    public ProveedorResponseDTO desactivar(Long id) {
        Proveedor proveedor = buscarConContactosOFallar(id);
        proveedor.setActivo(false);
        return ProveedorResponseDTO.fromEntity(proveedorRepository.save(proveedor));
    }

    @Transactional(readOnly = true)
    public Proveedor buscarOFallar(Long id) {
        return proveedorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proveedor no encontrado."));
    }

    @Transactional(readOnly = true)
    public Proveedor buscarActivoParaCompra(Long id) {
        Proveedor proveedor = buscarOFallar(id);
        if (!proveedor.isActivo()) {
            throw new BusinessException(
                "El proveedor está inactivo y no puede usarse en una compra nueva.");
        }
        return proveedor;
    }

    /** Carga proveedor con contactos para resolver snapshot en compras. */
    @Transactional(readOnly = true)
    public Proveedor obtenerEntidadConContactos(Long id) {
        return buscarConContactosOFallar(id);
    }

    private Proveedor buscarConContactosOFallar(Long id) {
        return proveedorRepository.findByIdConContactos(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proveedor no encontrado."));
    }

    private void sincronizarContactos(
            Proveedor proveedor, List<ContactoProveedorRequestDTO> requests, boolean crear) {
        if (requests == null) {
            if (crear) {
                return;
            }
            return;
        }

        validarPrincipalUnico(requests);

        Set<Long> idsRetain = new HashSet<>();
        for (ContactoProveedorRequestDTO req : requests) {
            if (req.getId() != null) {
                idsRetain.add(req.getId());
            }
        }

        proveedor.getContactos().removeIf(existente ->
            existente.getId() != null && !idsRetain.contains(existente.getId()));

        for (ContactoProveedorRequestDTO req : requests) {
            ContactoProveedor contacto = resolverContacto(proveedor, req);
            aplicarContacto(contacto, req);
            if (contacto.getId() == null && contacto.getProveedor() == null) {
                proveedor.agregarContacto(contacto);
            }
        }
    }

    private ContactoProveedor resolverContacto(Proveedor proveedor, ContactoProveedorRequestDTO req) {
        if (req.getId() == null) {
            return ContactoProveedor.builder().build();
        }
        return proveedor.getContactos().stream()
            .filter(c -> req.getId().equals(c.getId()))
            .findFirst()
            .orElseThrow(() -> new BusinessException(
                "El contacto " + req.getId() + " no pertenece a este proveedor."));
    }

    private void aplicarContacto(ContactoProveedor contacto, ContactoProveedorRequestDTO req) {
        contacto.setNombre(req.getNombre().trim());
        contacto.setCargo(normalizar(req.getCargo()));
        contacto.setTelefono(normalizar(req.getTelefono()));
        contacto.setCelular(normalizar(req.getCelular()));
        contacto.setEmail(normalizar(req.getEmail()));
        contacto.setTipoContacto(
            req.getTipoContacto() != null ? req.getTipoContacto() : TipoContactoProveedor.COMERCIAL);
        contacto.setPrincipal(Boolean.TRUE.equals(req.getPrincipal()));
        contacto.setActivo(req.getActivo() == null || req.getActivo());
    }

    private void validarPrincipalUnico(List<ContactoProveedorRequestDTO> contactos) {
        long principalesActivos = contactos.stream()
            .filter(c -> Boolean.TRUE.equals(c.getPrincipal()))
            .filter(c -> c.getActivo() == null || Boolean.TRUE.equals(c.getActivo()))
            .count();
        if (principalesActivos > 1) {
            throw new BusinessException("Solo puede haber un contacto principal activo por proveedor.");
        }
    }

    private void validarIdentificacion(String razonSocial, String numeroDocumento) {
        if (razonSocial == null || razonSocial.isBlank()) {
            throw new BusinessException("La razón social del proveedor es obligatoria.");
        }
        if (numeroDocumento == null || numeroDocumento.isBlank()) {
            throw new BusinessException("El NIT del proveedor es obligatorio.");
        }
    }

    private void validarDocumentoUnico(String documento, Long idActual) {
        if (documento == null) {
            return;
        }
        proveedorRepository.findByDocumento(documento)
            .filter(existente -> idActual == null || !existente.getId().equals(idActual))
            .ifPresent(existente -> {
                throw new BusinessException("Ya existe un proveedor con ese NIT.");
            });
    }

    private void validarCondicionPago(CondicionPagoProveedor condicion, Integer diasCredito) {
        if (condicion == CondicionPagoProveedor.CREDITO) {
            if (diasCredito == null || diasCredito <= 0) {
                throw new BusinessException(
                    "Para crédito, los días de crédito deben ser mayores que cero.");
            }
        }
    }

    private Integer normalizarDiasCredito(CondicionPagoProveedor condicion, Integer diasCredito) {
        if (condicion == CondicionPagoProveedor.CONTADO) {
            return 0;
        }
        return diasCredito;
    }

    /**
     * Normalización NIT: trim, quita espacios, puntos y guiones.
     * Conserva solo dígitos (incluye dígito de verificación si venía separado).
     * No inventa NIT; si queda vacío → null.
     */
    static String normalizarNit(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim().replaceAll("[.\\s-]", "");
        return limpio.isEmpty() ? null : limpio;
    }

    private String normalizar(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
