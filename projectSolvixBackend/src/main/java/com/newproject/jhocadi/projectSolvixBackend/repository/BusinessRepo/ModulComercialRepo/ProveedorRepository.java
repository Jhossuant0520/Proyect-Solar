package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    Optional<Proveedor> findByDocumento(String documento);

    List<Proveedor> findByActivoTrueOrderByNombreAsc();

    List<Proveedor> findByNombreContainingIgnoreCase(String nombre);

    @Query("SELECT DISTINCT p FROM Proveedor p LEFT JOIN FETCH p.contactos WHERE p.id = :id")
    Optional<Proveedor> findByIdConContactos(@Param("id") Long id);

    @Query("SELECT p FROM Proveedor p "
        + "WHERE (:soloActivos = false OR p.activo = true) "
        + "AND (LOWER(p.nombre) LIKE :patron "
        + "  OR LOWER(COALESCE(p.nombreComercial, '')) LIKE :patron "
        + "  OR LOWER(COALESCE(p.documento, '')) LIKE :patron "
        + "  OR LOWER(COALESCE(p.telefono, '')) LIKE :patron "
        + "  OR LOWER(COALESCE(p.email, '')) LIKE :patron "
        + "  OR LOWER(COALESCE(p.ciudad, '')) LIKE :patron)")
    List<Proveedor> buscar(
        @Param("patron") String patron,
        @Param("soloActivos") boolean soloActivos,
        Pageable pageable);

    default List<Proveedor> listarOrdenados(boolean soloActivos) {
        if (soloActivos) {
            return findByActivoTrueOrderByNombreAsc();
        }
        return findAll(Sort.by(Sort.Direction.ASC, "nombre"));
    }
}
