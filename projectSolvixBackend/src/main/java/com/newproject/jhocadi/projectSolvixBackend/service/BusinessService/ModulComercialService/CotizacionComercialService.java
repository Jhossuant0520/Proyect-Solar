package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CotizacionComercialResumenDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCotizacionComercialRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DocumentoCotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PaginaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoLineaCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CotizacionComercialRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CotizacionComercialSpecifications;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Cotización comercial a un cliente, independiente de las Órdenes de Servicio.
 *
 * <p>No depende de {@link InventarioService}: cotizar nunca mueve stock. El precio de cada
 * línea se congela al guardarla; el catálogo solo aporta el precio sugerido.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CotizacionComercialService {

    private static final int MONEY_SCALE = 2;
    private static final RoundingMode MONEY_ROUNDING = RoundingMode.HALF_UP;
    private static final int TAMANO_MAXIMO_PAGINA = 50;

    private final CotizacionComercialRepository cotizacionRepository;
    private final ProductoRepository productoRepository;
    private final ClienteService clienteService;
    private final SecuenciaDocumentoService secuenciaService;
    private final DocumentoCotizacionComercialService documentoService;
    private final PlatformTransactionManager transactionManager;

    @Transactional
    public CotizacionComercialResponseDTO crear(CotizacionComercialRequestDTO request, String usuario) {
        String responsable = validarUsuario(usuario);
        LocalDateTime ahora = LocalDateTime.now();
        Cliente cliente = resolverCliente(request.getClienteId(), null);

        CotizacionComercial cotizacion = CotizacionComercial.builder()
            .numero(secuenciaService.siguienteNumero(TipoSecuencia.COTIZACION_COMERCIAL, ahora))
            .cliente(cliente)
            .clienteNombreSnapshot(cliente.getNombre())
            .estado(EstadoCotizacionComercial.BORRADOR)
            .fecha(ahora)
            .usuarioCreacion(responsable)
            .observaciones(textoOpcional(request.getObservaciones()))
            .tokenConsulta(nuevoToken())
            .detalles(new ArrayList<>())
            .build();

        aplicarDetalles(cotizacion, request.getDetalles(), Set.of());
        return toResponse(cotizacionRepository.save(cotizacion));
    }

    /**
     * Edita la misma cotización (mismo id y número). Si ya estaba presentada vuelve a
     * BORRADOR: al presentarla de nuevo se genera un documento nuevo con el contenido vigente.
     */
    @Transactional
    public CotizacionComercialResponseDTO actualizar(
            Long id, CotizacionComercialRequestDTO request, String usuario) {
        validarUsuario(usuario);
        CotizacionComercial cotizacion = buscarOFallar(id);

        if (cotizacion.getEstado() == EstadoCotizacionComercial.APROBADA) {
            throw new BusinessException(
                "La cotización aprobada no se puede modificar: conserva lo que aceptó el cliente.");
        }
        if (!cotizacion.getEstado().esEditable()) {
            throw new BusinessException(
                "Solo se puede editar una cotización en BORRADOR o PENDIENTE_APROBACION.");
        }

        Cliente cliente = resolverCliente(request.getClienteId(), cotizacion.getCliente());
        cotizacion.setCliente(cliente);
        cotizacion.setClienteNombreSnapshot(cliente.getNombre());
        cotizacion.setObservaciones(textoOpcional(request.getObservaciones()));

        Set<Long> productosPrevios = cotizacion.getDetalles().stream()
            .map(DetalleCotizacionComercial::getProducto)
            .filter(Objects::nonNull)
            .map(Producto::getId)
            .collect(Collectors.toSet());
        cotizacion.getDetalles().clear();
        aplicarDetalles(cotizacion, request.getDetalles(), productosPrevios);

        if (cotizacion.getEstado() == EstadoCotizacionComercial.PENDIENTE_APROBACION) {
            cotizacion.setEstado(EstadoCotizacionComercial.BORRADOR);
            cotizacion.setFechaPresentacion(null);
            cotizacion.setUsuarioPresentacion(null);
        }

        return toResponse(cotizacionRepository.save(cotizacion));
    }

    /**
     * Presenta la cotización (negocio) y luego intenta generar el PDF.
     * El PDF no forma parte de la TX de negocio: si falla, la cotización permanece
     * en {@code PENDIENTE_APROBACION} y la respuesta lo comunica con {@code documentoGenerado=false}.
     */
    public CotizacionComercialResponseDTO presentar(Long id, String usuario) {
        String responsable = validarUsuario(usuario);

        TransactionTemplate negocioTx = new TransactionTemplate(transactionManager);
        Long cotizacionId = negocioTx.execute(status -> {
            CotizacionComercial cotizacion = buscarOFallar(id);
            if (cotizacion.getEstado() != EstadoCotizacionComercial.BORRADOR) {
                throw new BusinessException("Solo se puede presentar una cotización en BORRADOR.");
            }
            if (!esPresentable(cotizacion)) {
                throw new BusinessException(
                    "La cotización debe tener al menos una línea y un total mayor que cero.");
            }
            cotizacion.setEstado(EstadoCotizacionComercial.PENDIENTE_APROBACION);
            cotizacion.setFechaPresentacion(LocalDateTime.now());
            cotizacion.setUsuarioPresentacion(responsable);
            return cotizacionRepository.save(cotizacion).getId();
        });
        if (cotizacionId == null) {
            throw new IllegalStateException("No se pudo presentar la cotización comercial.");
        }

        boolean documentoGenerado = intentarGenerarDocumento(cotizacionId, responsable);

        TransactionTemplate lecturaTx = new TransactionTemplate(transactionManager);
        lecturaTx.setReadOnly(true);
        return lecturaTx.execute(status -> {
            CotizacionComercialResponseDTO response = toResponse(buscarOFallar(cotizacionId));
            if (documentoGenerado) {
                response.setDocumentoGenerado(true);
            } else {
                response.setDocumentoGenerado(false);
                response.setDocumentoVigente(null);
            }
            return response;
        });
    }

    /**
     * Genera el PDF en {@code REQUIRES_NEW} tras el commit de negocio.
     * No propaga el error al caller: el Presentar de negocio ya fue exitoso.
     */
    private boolean intentarGenerarDocumento(Long cotizacionId, String usuario) {
        log.info("PDF-GEN correlate=PRESENTAR_COTIZACION_COMERCIAL id={}", cotizacionId);
        TransactionTemplate pdfTx = new TransactionTemplate(transactionManager);
        pdfTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        try {
            pdfTx.executeWithoutResult(status -> documentoService.generar(cotizacionId, usuario));
            return true;
        } catch (Throwable t) {
            log.warn("No se pudo generar el PDF de la cotización comercial {}: {}",
                cotizacionId, t.toString());
            return false;
        }
    }

    @Transactional
    public CotizacionComercialResponseDTO aprobar(Long id, String usuario) {
        String responsable = validarUsuario(usuario);
        CotizacionComercial cotizacion = buscarOFallar(id);
        if (cotizacion.getEstado() != EstadoCotizacionComercial.PENDIENTE_APROBACION) {
            throw new BusinessException("Solo se puede aprobar una cotización en PENDIENTE_APROBACION.");
        }
        cotizacion.setEstado(EstadoCotizacionComercial.APROBADA);
        cotizacion.setFechaAprobacion(LocalDateTime.now());
        cotizacion.setUsuarioAprobacion(responsable);
        return toResponse(cotizacionRepository.save(cotizacion));
    }

    @Transactional
    public CotizacionComercialResponseDTO rechazar(Long id, String motivo, String usuario) {
        String responsable = validarUsuario(usuario);
        CotizacionComercial cotizacion = buscarOFallar(id);
        if (cotizacion.getEstado() != EstadoCotizacionComercial.PENDIENTE_APROBACION) {
            throw new BusinessException("Solo se puede rechazar una cotización en PENDIENTE_APROBACION.");
        }
        cotizacion.setEstado(EstadoCotizacionComercial.RECHAZADA);
        cotizacion.setFechaRechazo(LocalDateTime.now());
        cotizacion.setUsuarioRechazo(responsable);
        cotizacion.setMotivoRechazo(textoOpcional(motivo));
        return toResponse(cotizacionRepository.save(cotizacion));
    }

    /** Anula una propuesta que no llegó a aprobarse. La aprobada se conserva tal cual. */
    @Transactional
    public CotizacionComercialResponseDTO anular(Long id, String usuario) {
        String responsable = validarUsuario(usuario);
        CotizacionComercial cotizacion = buscarOFallar(id);
        if (!puedeAnular(cotizacion.getEstado())) {
            throw new BusinessException("Una cotización " + cotizacion.getEstado() + " no se puede anular.");
        }
        cotizacion.setEstado(EstadoCotizacionComercial.ANULADA);
        cotizacion.setFechaAnulacion(LocalDateTime.now());
        cotizacion.setUsuarioAnulacion(responsable);
        return toResponse(cotizacionRepository.save(cotizacion));
    }

    @Transactional(readOnly = true)
    public CotizacionComercialResponseDTO obtener(Long id) {
        return toResponse(buscarOFallar(id));
    }

    @Transactional(readOnly = true)
    public PaginaResponseDTO<CotizacionComercialResumenDTO> listar(
            String texto,
            EstadoCotizacionComercial estado,
            Long clienteId,
            Integer pagina,
            Integer tamano) {
        int numeroPagina = pagina != null && pagina > 0 ? pagina : 0;
        int tamanoPagina = tamano != null ? Math.min(Math.max(tamano, 1), TAMANO_MAXIMO_PAGINA) : 20;
        PageRequest pageable = PageRequest.of(
            numeroPagina, tamanoPagina, Sort.by(Sort.Order.desc("fecha"), Sort.Order.desc("id")));

        return PaginaResponseDTO.desde(
            cotizacionRepository.findAll(
                CotizacionComercialSpecifications.conFiltros(texto, estado, clienteId), pageable),
            CotizacionComercialResumenDTO::fromEntity);
    }

    private Cliente resolverCliente(Long clienteId, Cliente actual) {
        if (clienteId == null) {
            return clienteService.obtenerOCrearConsumidorFinal();
        }
        if (actual != null && clienteId.equals(actual.getId())) {
            return actual;
        }
        Cliente cliente = clienteService.buscarOFallar(clienteId);
        if (!cliente.isActivo()) {
            throw new BusinessException("El cliente seleccionado está inactivo.");
        }
        return cliente;
    }

    private void aplicarDetalles(
            CotizacionComercial cotizacion,
            List<DetalleCotizacionComercialRequestDTO> lineas,
            Set<Long> productosPrevios) {
        if (lineas == null || lineas.isEmpty()) {
            throw new BusinessException("La cotización debe tener al menos una línea.");
        }
        long manosObra = lineas.stream()
            .filter(l -> l.getTipo() == TipoLineaCotizacionComercial.MANO_OBRA)
            .count();
        if (manosObra > 1) {
            throw new BusinessException(
                "La cotización comercial solo puede tener una línea de mano de obra.");
        }
        for (int i = 0; i < lineas.size(); i++) {
            cotizacion.agregarDetalle(construirDetalle(lineas.get(i), i + 1, productosPrevios));
        }
        recalcularTotales(cotizacion);
    }

    private DetalleCotizacionComercial construirDetalle(
            DetalleCotizacionComercialRequestDTO linea, int numero, Set<Long> productosPrevios) {
        String prefijo = "Línea " + numero + ": ";
        if (linea.getTipo() == null) {
            throw new BusinessException(prefijo + "el tipo es obligatorio.");
        }
        BigDecimal cantidad = linea.getCantidad() != null ? money(linea.getCantidad()) : null;
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(prefijo + "la cantidad debe ser mayor que cero.");
        }

        Producto producto = null;
        String descripcion = textoOpcional(linea.getDescripcion());
        BigDecimal precio = linea.getPrecioUnitario();

        if (linea.getTipo() == TipoLineaCotizacionComercial.PRODUCTO) {
            if (linea.getProductoId() == null) {
                throw new BusinessException(prefijo + "selecciona un producto del catálogo.");
            }
            producto = productoRepository.findById(linea.getProductoId())
                .orElseThrow(() -> new BusinessException(prefijo + "el producto indicado no existe."));
            // Un producto que se desactivó después de cotizarlo puede conservarse al editar,
            // pero no puede entrar como línea nueva.
            if (!producto.isActivo() && !productosPrevios.contains(producto.getId())) {
                throw new BusinessException(
                    prefijo + "el producto '" + producto.getNombre() + "' está inactivo.");
            }
            if (descripcion == null) {
                descripcion = producto.getNombre();
            }
            if (precio == null) {
                precio = producto.getPrecioVentaActual();
            }
        } else if (linea.getProductoId() != null) {
            throw new BusinessException(prefijo + "solo las líneas de producto se vinculan al catálogo.");
        }

        if (descripcion == null) {
            throw new BusinessException(prefijo + "la descripción es obligatoria.");
        }
        if (precio == null) {
            throw new BusinessException(prefijo + "el precio unitario es obligatorio.");
        }
        BigDecimal precioUnitario = money(precio);
        if (precioUnitario.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(prefijo + "el precio unitario no puede ser negativo.");
        }

        return DetalleCotizacionComercial.builder()
            .tipo(linea.getTipo())
            .descripcion(descripcion)
            .cantidad(cantidad)
            .precioUnitario(precioUnitario)
            .subtotal(money(cantidad.multiply(precioUnitario)))
            .producto(producto)
            .productoNombreSnapshot(producto != null ? producto.getNombre() : null)
            .build();
    }

    private void recalcularTotales(CotizacionComercial cotizacion) {
        BigDecimal subtotal = cotizacion.getDetalles().stream()
            .map(DetalleCotizacionComercial::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        cotizacion.setSubtotal(money(subtotal));
        cotizacion.setTotal(money(subtotal));
    }

    private boolean esPresentable(CotizacionComercial cotizacion) {
        return !cotizacion.getDetalles().isEmpty()
            && cotizacion.getTotal() != null
            && cotizacion.getTotal().compareTo(BigDecimal.ZERO) > 0;
    }

    private static boolean puedeAnular(EstadoCotizacionComercial estado) {
        return estado == EstadoCotizacionComercial.BORRADOR
            || estado == EstadoCotizacionComercial.PENDIENTE_APROBACION
            || estado == EstadoCotizacionComercial.RECHAZADA;
    }

    private CotizacionComercial buscarOFallar(Long id) {
        return cotizacionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cotización no encontrada."));
    }

    private CotizacionComercialResponseDTO toResponse(CotizacionComercial cotizacion) {
        BigDecimal productos = BigDecimal.ZERO;
        BigDecimal manoObra = BigDecimal.ZERO;
        BigDecimal otros = BigDecimal.ZERO;
        List<DetalleCotizacionComercialResponseDTO> detalles = new ArrayList<>();
        for (DetalleCotizacionComercial d : cotizacion.getDetalles()) {
            detalles.add(DetalleCotizacionComercialResponseDTO.fromEntity(d));
            switch (d.getTipo()) {
                case PRODUCTO -> productos = productos.add(d.getSubtotal());
                case MANO_OBRA -> manoObra = manoObra.add(d.getSubtotal());
                case OTRO -> otros = otros.add(d.getSubtotal());
            }
        }

        EstadoCotizacionComercial estado = cotizacion.getEstado();
        Cliente cliente = cotizacion.getCliente();
        DocumentoCotizacionComercialResponseDTO vigente = cotizacion.getId() != null
            ? documentoService.vigente(cotizacion.getId()).orElse(null)
            : null;
        return CotizacionComercialResponseDTO.builder()
            .id(cotizacion.getId())
            .numero(cotizacion.getNumero())
            .clienteId(cliente != null ? cliente.getId() : null)
            .clienteNombre(cotizacion.getClienteNombreSnapshot())
            .clienteDocumento(cliente != null ? cliente.getNumeroDocumento() : null)
            .clienteConsumidorFinal(cliente != null && cliente.esConsumidorFinal())
            .estado(estado)
            .fecha(cotizacion.getFecha())
            .fechaPresentacion(cotizacion.getFechaPresentacion())
            .fechaAprobacion(cotizacion.getFechaAprobacion())
            .fechaRechazo(cotizacion.getFechaRechazo())
            .fechaAnulacion(cotizacion.getFechaAnulacion())
            .usuarioCreacion(cotizacion.getUsuarioCreacion())
            .subtotal(money(cotizacion.getSubtotal()))
            .total(money(cotizacion.getTotal()))
            .subtotalProductos(money(productos))
            .subtotalManoObra(money(manoObra))
            .subtotalOtros(money(otros))
            .observaciones(cotizacion.getObservaciones())
            .motivoRechazo(cotizacion.getMotivoRechazo())
            .detalles(detalles)
            .documentoVigente(vigente)
            .documentoGenerado(vigente != null)
            .puedeEditar(estado.esEditable())
            .puedePresentar(estado == EstadoCotizacionComercial.BORRADOR && esPresentable(cotizacion))
            .puedeAprobar(estado == EstadoCotizacionComercial.PENDIENTE_APROBACION)
            .puedeRechazar(estado == EstadoCotizacionComercial.PENDIENTE_APROBACION)
            .puedeAnular(puedeAnular(estado))
            .build();
    }

    private static String nuevoToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private String validarUsuario(String usuario) {
        if (usuario == null || usuario.isBlank()) {
            throw new BusinessException("Se requiere un usuario autenticado.");
        }
        return usuario.trim();
    }

    private static String textoOpcional(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    private static BigDecimal money(BigDecimal valor) {
        return (valor != null ? valor : BigDecimal.ZERO).setScale(MONEY_SCALE, MONEY_ROUNDING);
    }
}
