package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.time.LocalDateTime;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucionCompra;

public final class DevolucionCompraSpecifications {

    private DevolucionCompraSpecifications() {
    }

    public static Specification<DevolucionCompra> conFiltros(
            Long compraId,
            Long proveedorId,
            EstadoDevolucionCompra estado,
            MotivoDevolucionCompra motivo,
            LocalDateTime desde,
            LocalDateTime hasta) {

        return Specification
            .where(compraEs(compraId))
            .and(proveedorEs(proveedorId))
            .and(estadoEs(estado))
            .and(motivoEs(motivo))
            .and(fechaDesde(desde))
            .and(fechaHasta(hasta));
    }

    private static Specification<DevolucionCompra> compraEs(Long compraId) {
        return (root, query, cb) -> compraId == null
            ? cb.conjunction()
            : cb.equal(root.get("compra").get("id"), compraId);
    }

    private static Specification<DevolucionCompra> proveedorEs(Long proveedorId) {
        return (root, query, cb) -> proveedorId == null
            ? cb.conjunction()
            : cb.equal(root.get("compra").get("proveedor").get("id"), proveedorId);
    }

    private static Specification<DevolucionCompra> estadoEs(EstadoDevolucionCompra estado) {
        return (root, query, cb) -> estado == null
            ? cb.conjunction()
            : cb.equal(root.get("estado"), estado);
    }

    private static Specification<DevolucionCompra> motivoEs(MotivoDevolucionCompra motivo) {
        return (root, query, cb) -> motivo == null
            ? cb.conjunction()
            : cb.equal(root.get("motivo"), motivo);
    }

    private static Specification<DevolucionCompra> fechaDesde(LocalDateTime desde) {
        return (root, query, cb) -> desde == null
            ? cb.conjunction()
            : cb.greaterThanOrEqualTo(root.get("fecha"), desde);
    }

    private static Specification<DevolucionCompra> fechaHasta(LocalDateTime hasta) {
        return (root, query, cb) -> hasta == null
            ? cb.conjunction()
            : cb.lessThanOrEqualTo(root.get("fecha"), hasta);
    }
}
