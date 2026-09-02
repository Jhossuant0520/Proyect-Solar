package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.time.LocalDateTime;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;

public final class CompraSpecifications {

    private CompraSpecifications() {
    }

    public static Specification<Compra> conFiltros(
            Long proveedorId,
            EstadoCompra estado,
            LocalDateTime desde,
            LocalDateTime hasta) {

        return Specification
            .where(proveedorEs(proveedorId))
            .and(estadoEs(estado))
            .and(fechaDesde(desde))
            .and(fechaHasta(hasta));
    }

    private static Specification<Compra> proveedorEs(Long proveedorId) {
        return (root, query, cb) -> proveedorId == null
            ? cb.conjunction()
            : cb.equal(root.get("proveedor").get("id"), proveedorId);
    }

    private static Specification<Compra> estadoEs(EstadoCompra estado) {
        return (root, query, cb) -> estado == null
            ? cb.conjunction()
            : cb.equal(root.get("estado"), estado);
    }

    private static Specification<Compra> fechaDesde(LocalDateTime desde) {
        return (root, query, cb) -> desde == null
            ? cb.conjunction()
            : cb.greaterThanOrEqualTo(root.get("fecha"), desde);
    }

    private static Specification<Compra> fechaHasta(LocalDateTime hasta) {
        return (root, query, cb) -> hasta == null
            ? cb.conjunction()
            : cb.lessThanOrEqualTo(root.get("fecha"), hasta);
    }
}
