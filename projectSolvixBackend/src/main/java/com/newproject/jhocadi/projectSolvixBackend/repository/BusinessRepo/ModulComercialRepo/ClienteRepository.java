package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoCliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    /** Localiza al Consumidor final por semántica, nunca por id fijo. */
    Optional<Cliente> findFirstByTipoClienteOrderByIdAsc(TipoCliente tipoCliente);

    Optional<Cliente> findByTipoDocumentoAndNumeroDocumento(TipoDocumento tipoDocumento, String numeroDocumento);

    List<Cliente> findByActivoTrueOrderByNombreAsc();

    List<Cliente> findByNombreContainingIgnoreCase(String nombre);

    /** Búsqueda acotada para selectores: nombre, documento, teléfono o correo. */
    @Query("SELECT c FROM Cliente c "
        + "WHERE (:soloActivos = false OR c.activo = true) "
        + "AND (LOWER(c.nombre) LIKE :patron "
        + "  OR LOWER(COALESCE(c.numeroDocumento, '')) LIKE :patron "
        + "  OR LOWER(COALESCE(c.telefono, '')) LIKE :patron "
        + "  OR LOWER(COALESCE(c.email, '')) LIKE :patron)")
    List<Cliente> buscar(
        @Param("patron") String patron,
        @Param("soloActivos") boolean soloActivos,
        Pageable pageable);
}
