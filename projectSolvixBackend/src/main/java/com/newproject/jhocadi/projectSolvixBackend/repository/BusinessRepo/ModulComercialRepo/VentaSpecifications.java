package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.time.LocalDateTime;

import org.springframework.data.jpa.domain.Specification;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Venta;

public final class VentaSpecifications {

    private VentaSpecifications() {
    }

    public static Specification<Venta> conFiltros(
            Long clienteId,
            EstadoVenta estado,
            LocalDateTime desde,
            LocalDateTime hasta) {

        return Specification.allOf(
            clienteEs(clienteId),
            estadoEs(estado),
            fechaDesde(desde),
            fechaHasta(hasta)
        );
    }

    private static Specification<Venta> clienteEs(Long clienteId) {
        return (root, query, cb) -> clienteId == null
            ? cb.conjunction()
            : cb.equal(root.get("cliente").get("id"), clienteId);
    }

    private static Specification<Venta> estadoEs(EstadoVenta estado) {
        return (root, query, cb) -> estado == null
            ? cb.conjunction()
            : cb.equal(root.get("estado"), estado);
    }

    private static Specification<Venta> fechaDesde(LocalDateTime desde) {
        return (root, query, cb) -> desde == null
            ? cb.conjunction()
            : cb.greaterThanOrEqualTo(root.get("fecha"), desde);
    }

    private static Specification<Venta> fechaHasta(LocalDateTime hasta) {
        return (root, query, cb) -> hasta == null
            ? cb.conjunction()
            : cb.lessThanOrEqualTo(root.get("fecha"), hasta);
    }
}
