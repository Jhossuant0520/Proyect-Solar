package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.time.LocalDateTime;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucion;

public final class DevolucionVentaSpecifications {

    private DevolucionVentaSpecifications() {
    }

    public static Specification<DevolucionVenta> conFiltros(
            Long ventaId,
            Long clienteId,
            EstadoDevolucionVenta estado,
            MotivoDevolucion motivo,
            LocalDateTime desde,
            LocalDateTime hasta) {

        return Specification
            .where(ventaEs(ventaId))
            .and(clienteEs(clienteId))
            .and(estadoEs(estado))
            .and(motivoEs(motivo))
            .and(fechaDesde(desde))
            .and(fechaHasta(hasta));
    }

    private static Specification<DevolucionVenta> ventaEs(Long ventaId) {
        return (root, query, cb) -> ventaId == null
            ? cb.conjunction()
            : cb.equal(root.get("venta").get("id"), ventaId);
    }

    private static Specification<DevolucionVenta> clienteEs(Long clienteId) {
        return (root, query, cb) -> clienteId == null
            ? cb.conjunction()
            : cb.equal(root.get("venta").get("cliente").get("id"), clienteId);
    }

    private static Specification<DevolucionVenta> estadoEs(EstadoDevolucionVenta estado) {
        return (root, query, cb) -> estado == null
            ? cb.conjunction()
            : cb.equal(root.get("estado"), estado);
    }

    private static Specification<DevolucionVenta> motivoEs(MotivoDevolucion motivo) {
        return (root, query, cb) -> motivo == null
            ? cb.conjunction()
            : cb.equal(root.get("motivo"), motivo);
    }

    private static Specification<DevolucionVenta> fechaDesde(LocalDateTime desde) {
        return (root, query, cb) -> desde == null
            ? cb.conjunction()
            : cb.greaterThanOrEqualTo(root.get("fecha"), desde);
    }

    private static Specification<DevolucionVenta> fechaHasta(LocalDateTime hasta) {
        return (root, query, cb) -> hasta == null
            ? cb.conjunction()
            : cb.lessThanOrEqualTo(root.get("fecha"), hasta);
    }
}
