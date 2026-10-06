package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CuentaPorPagarResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PagoCxPRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.PagoCxPResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CuentaPorPagar;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCuentaPorPagar;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.PagoCxP;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CuentaPorPagarRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CuentaPorPagarSpecifications;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.PagoCxPRepository;

import lombok.RequiredArgsConstructor;

/**
 * Cuentas por Pagar (FASE 3.15.13-B / QA).
 *
 * <p>Matemática:
 * <pre>
 * obligacion_neta = max(0, saldo_inicial - total_devoluciones)
 * saldo_pendiente = max(0, obligacion_neta - total_pagado)
 * </pre>
 *
 * <p>Antes del clamp se valida el dominio: devoluciones no pueden superar
 * {@code saldo_inicial} ni pagos la {@code obligacion_neta}.
 *
 * <p>No conoce inventario. Solo reacciona a hooks de compra/devolución y a pagos API.
 */
@Service
@RequiredArgsConstructor
public class CxPService {

    private static final int ESCALA = 2;
    private static final RoundingMode REDONDEO = RoundingMode.HALF_UP;

    private final CuentaPorPagarRepository cuentaRepository;
    private final PagoCxPRepository pagoRepository;

    /**
     * Crea CxP solo si la compra es CREDITO. Idempotente: si ya existe, no duplica.
     * Debe invocarse dentro de la misma {@code @Transactional} de {@code completar}.
     */
    @Transactional
    public void crearDesdeCompraCompletada(Compra compra, String usuario) {
        if (compra == null || compra.getCondicionPagoAplicada() != CondicionPagoProveedor.CREDITO) {
            return;
        }
        if (cuentaRepository.existsByCompraId(compra.getId())) {
            return;
        }

        BigDecimal saldoInicial = escalar(compra.getTotal());
        CuentaPorPagar cxp = CuentaPorPagar.builder()
            .compra(compra)
            .proveedor(compra.getProveedor())
            .compraNumero(compra.getNumero())
            .proveedorNombre(compra.getProveedorNombreSnapshot() != null
                ? compra.getProveedorNombreSnapshot()
                : compra.getProveedor().getNombre())
            .moneda(compra.getMoneda() != null ? compra.getMoneda() : "COP")
            .saldoInicial(saldoInicial)
            .totalDevoluciones(cero())
            .totalPagado(cero())
            .saldoPendiente(saldoInicial)
            .fechaVencimiento(compra.getFechaVencimiento())
            .estado(EstadoCuentaPorPagar.PENDIENTE)
            .createdBy(usuario)
            .build();

        cuentaRepository.save(cxp);
    }

    /**
     * Suma el monto de una devolución a {@code totalDevoluciones} y recalcula saldo/estado.
     * Si no hay CxP (compra CONTADO), no-op.
     */
    @Transactional
    public void aplicarDevolucion(Long compraId, BigDecimal montoDevuelto) {
        CuentaPorPagar cxp = cuentaRepository.findByCompraId(compraId).orElse(null);
        if (cxp == null) {
            return;
        }
        if (cxp.getEstado() == EstadoCuentaPorPagar.ANULADA) {
            throw new BusinessException("No se puede aplicar devolución a una CxP anulada.");
        }

        BigDecimal monto = escalar(montoDevuelto);
        if (monto.signum() < 0) {
            throw new BusinessException("El monto de devolución no puede ser negativo.");
        }

        cxp.setTotalDevoluciones(escalar(nvl(cxp.getTotalDevoluciones()).add(monto)));
        recalcularSaldosYEstado(cxp);
        cuentaRepository.save(cxp);
    }

    @Transactional
    public CuentaPorPagarResponseDTO registrarPago(Long cxpId, PagoCxPRequestDTO request, String usuario) {
        CuentaPorPagar cxp = buscarOFallar(cxpId);

        if (cxp.getEstado() == EstadoCuentaPorPagar.ANULADA) {
            throw new BusinessException("No se pueden registrar pagos en una CxP anulada.");
        }
        if (cxp.getEstado() == EstadoCuentaPorPagar.PAGADA
                || nvl(cxp.getSaldoPendiente()).signum() <= 0) {
            throw new BusinessException("La cuenta por pagar ya está saldada.");
        }

        BigDecimal valor = escalar(request.getValor());
        if (valor.signum() <= 0) {
            throw new BusinessException("El valor del pago debe ser mayor que cero.");
        }
        if (valor.compareTo(cxp.getSaldoPendiente()) > 0) {
            throw new BusinessException(
                "El pago (" + valor + ") supera el saldo pendiente (" + cxp.getSaldoPendiente() + ").");
        }

        PagoCxP pago = PagoCxP.builder()
            .valor(valor)
            .fecha(request.getFecha() != null ? request.getFecha() : LocalDateTime.now())
            .metodoPago(request.getMetodoPago())
            .referencia(trimToNull(request.getReferencia()))
            .observacion(trimToNull(request.getObservacion()))
            .createdBy(usuario)
            .build();
        cxp.agregarPago(pago);

        cxp.setTotalPagado(escalar(nvl(cxp.getTotalPagado()).add(valor)));
        recalcularSaldosYEstado(cxp);
        cuentaRepository.save(cxp);

        return toDetalle(cxp);
    }

    @Transactional(readOnly = true)
    public Page<CuentaPorPagarResponseDTO> listar(
            Long proveedorId, EstadoCuentaPorPagar estado, Boolean vencida, Pageable pageable) {

        return cuentaRepository
            .findAll(CuentaPorPagarSpecifications.conFiltros(proveedorId, estado, vencida), pageable)
            .map(cxp -> CuentaPorPagarResponseDTO.fromEntity(cxp, false));
    }

    @Transactional(readOnly = true)
    public CuentaPorPagarResponseDTO obtenerPorId(Long id) {
        CuentaPorPagar cxp = buscarOFallar(id);
        // fuerza carga de pagos en la transacción
        cxp.getPagos().size();
        return toDetalle(cxp);
    }

    @Transactional(readOnly = true)
    public CuentaPorPagarResponseDTO obtenerPorCompraId(Long compraId) {
        CuentaPorPagar cxp = cuentaRepository.findByCompraId(compraId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No hay cuenta por pagar para la compra " + compraId + "."));
        cxp.getPagos().size();
        return toDetalle(cxp);
    }

    @Transactional(readOnly = true)
    public List<PagoCxPResponseDTO> listarPagos(Long cxpId) {
        buscarOFallar(cxpId);
        return pagoRepository.findByCuentaPorPagarIdOrderByFechaAscIdAsc(cxpId).stream()
            .map(PagoCxPResponseDTO::fromEntity)
            .toList();
    }

    /**
     * Recalcula saldos y estado.
     *
     * <p>Validación de dominio (estalla antes del clamp):
     * <ul>
     *   <li>{@code total_devoluciones > saldo_inicial}</li>
     *   <li>{@code total_pagado > obligacion_neta} (neta sin clamp)</li>
     * </ul>
     * El {@code max(0, …)} queda como defensa de bajo nivel.
     */
    void recalcularSaldosYEstado(CuentaPorPagar cxp) {
        if (cxp.getEstado() == EstadoCuentaPorPagar.ANULADA) {
            return;
        }

        BigDecimal saldoInicial = nvl(cxp.getSaldoInicial());
        BigDecimal totalDev = nvl(cxp.getTotalDevoluciones());
        BigDecimal totalPagado = nvl(cxp.getTotalPagado());

        if (totalDev.compareTo(saldoInicial) > 0) {
            throw new BusinessException(
                "Las devoluciones superan la obligación inicial.");
        }

        BigDecimal obligacionNetaSinClamp = saldoInicial.subtract(totalDev);
        if (totalPagado.compareTo(obligacionNetaSinClamp) > 0) {
            throw new BusinessException(
                "Los pagos superan la obligación neta actual.");
        }

        // Defensa de bajo nivel (no debe enmascarar: el dominio ya validó arriba).
        BigDecimal obligacionNeta = obligacionNetaSinClamp.max(BigDecimal.ZERO);
        BigDecimal saldoPendiente = obligacionNeta.subtract(totalPagado).max(BigDecimal.ZERO);

        cxp.setSaldoPendiente(escalar(saldoPendiente));
        cxp.setEstado(resolverEstado(escalar(saldoPendiente), escalar(totalPagado)));
    }

    private EstadoCuentaPorPagar resolverEstado(BigDecimal saldoPendiente, BigDecimal totalPagado) {
        if (saldoPendiente.signum() == 0) {
            return EstadoCuentaPorPagar.PAGADA;
        }
        if (totalPagado.signum() == 0) {
            return EstadoCuentaPorPagar.PENDIENTE;
        }
        return EstadoCuentaPorPagar.PARCIALMENTE_PAGADA;
    }

    private CuentaPorPagarResponseDTO toDetalle(CuentaPorPagar cxp) {
        return CuentaPorPagarResponseDTO.fromEntity(cxp, true);
    }

    private CuentaPorPagar buscarOFallar(Long id) {
        return cuentaRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Cuenta por pagar no encontrada."));
    }

    private static BigDecimal escalar(BigDecimal valor) {
        return nvl(valor).setScale(ESCALA, REDONDEO);
    }

    private static BigDecimal nvl(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    private static BigDecimal cero() {
        return BigDecimal.ZERO.setScale(ESCALA, REDONDEO);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
