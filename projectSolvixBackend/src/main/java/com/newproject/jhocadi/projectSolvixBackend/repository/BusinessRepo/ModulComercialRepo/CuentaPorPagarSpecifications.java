package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.time.LocalDateTime;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CuentaPorPagar;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCuentaPorPagar;

public final class CuentaPorPagarSpecifications {

    private CuentaPorPagarSpecifications() {
    }

    public static Specification<CuentaPorPagar> conFiltros(
            Long proveedorId, EstadoCuentaPorPagar estado, Boolean vencida) {

        return (root, query, cb) -> {
            var predicates = cb.conjunction();

            if (proveedorId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("proveedor").get("id"), proveedorId));
            }
            if (estado != null) {
                predicates = cb.and(predicates, cb.equal(root.get("estado"), estado));
            }
            if (Boolean.TRUE.equals(vencida)) {
                LocalDateTime ahora = LocalDateTime.now();
                predicates = cb.and(predicates,
                    root.get("estado").in(EstadoCuentaPorPagar.PENDIENTE, EstadoCuentaPorPagar.PARCIALMENTE_PAGADA),
                    cb.isNotNull(root.get("fechaVencimiento")),
                    cb.lessThan(root.get("fechaVencimiento"), ahora),
                    cb.greaterThan(root.get("saldoPendiente"), java.math.BigDecimal.ZERO));
            } else if (Boolean.FALSE.equals(vencida)) {
                LocalDateTime ahora = LocalDateTime.now();
                predicates = cb.and(predicates, cb.or(
                    root.get("estado").in(EstadoCuentaPorPagar.PAGADA, EstadoCuentaPorPagar.ANULADA),
                    cb.isNull(root.get("fechaVencimiento")),
                    cb.greaterThanOrEqualTo(root.get("fechaVencimiento"), ahora),
                    cb.lessThanOrEqualTo(root.get("saldoPendiente"), java.math.BigDecimal.ZERO)));
            }

            if (query != null && query.getOrderList().isEmpty()) {
                query.orderBy(cb.desc(root.get("id")));
            }
            return predicates;
        };
    }
}
