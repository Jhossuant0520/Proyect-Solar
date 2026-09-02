package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
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
}
