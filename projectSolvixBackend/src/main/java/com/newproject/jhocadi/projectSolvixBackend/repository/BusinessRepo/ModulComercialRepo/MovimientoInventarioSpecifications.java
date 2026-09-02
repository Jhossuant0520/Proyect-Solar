package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.time.LocalDateTime;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;

public final class MovimientoInventarioSpecifications {

    private MovimientoInventarioSpecifications() {
    }

    public static Specification<MovimientoInventario> conFiltros(
            Long productoId,
            TipoMovimientoInventario tipo,
            LocalDateTime desde,
            LocalDateTime hasta) {

        return Specification
            .where(productoEs(productoId))
            .and(tipoEs(tipo))
            .and(fechaDesde(desde))
            .and(fechaHasta(hasta));
    }

    private static Specification<MovimientoInventario> productoEs(Long productoId) {
        return (root, query, cb) -> productoId == null
            ? cb.conjunction()
            : cb.equal(root.get("producto").get("id"), productoId);
    }

    private static Specification<MovimientoInventario> tipoEs(TipoMovimientoInventario tipo) {
        return (root, query, cb) -> tipo == null
            ? cb.conjunction()
            : cb.equal(root.get("tipo"), tipo);
    }

    private static Specification<MovimientoInventario> fechaDesde(LocalDateTime desde) {
        return (root, query, cb) -> desde == null
            ? cb.conjunction()
            : cb.greaterThanOrEqualTo(root.get("fecha"), desde);
    }

    private static Specification<MovimientoInventario> fechaHasta(LocalDateTime hasta) {
        return (root, query, cb) -> hasta == null
            ? cb.conjunction()
            : cb.lessThanOrEqualTo(root.get("fecha"), hasta);
    }
}
