package com.newproject.jhocadi.projectSolarFishBackend.service.BusinessService.ModulSolarService;

import com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulSolarModel.modelPanelSolares;
import com.newproject.jhocadi.projectSolarFishBackend.repository.BusinessRepo.ModulSolarRepo.PanelesRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.List;
import java.util.Objects;

@Service
public class ServicePaneles {

    private final PanelesRepository panelesRepository;

    public ServicePaneles(PanelesRepository panelesRepository) {
        this.panelesRepository = panelesRepository;
    }

    @Transactional
    public modelPanelSolares registrar(modelPanelSolares panel, Principal principal) {
        Objects.requireNonNull(panel, "El panel no puede ser null");
        // Aquí podrías usar 'principal.getName()' si necesitas asociar el panel al usuario logueado.
        return panelesRepository.save(panel);
    }

    // ✨ CORRECCIÓN: Se unificó 'listar' y 'obtener' en un único método claro
    @Transactional(readOnly = true)
    public modelPanelSolares obtenerPorId(Long id) {
        Objects.requireNonNull(id, "El ID no puede ser null");
        return panelesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Panel solar no encontrado con ID: " + id));
    }

    @Transactional(readOnly = true)
    public List<modelPanelSolares> listarTodos() {
        return panelesRepository.findAll();
    }

    @Transactional
    public modelPanelSolares actualizar(Long id, modelPanelSolares datosActualizados) {
        Objects.requireNonNull(id, "El ID no puede ser null");
        Objects.requireNonNull(datosActualizados, "Los datos de actualización no pueden ser null");
        
        // Verificar que el panel existe antes de actualizar
        panelesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Panel solar no encontrado con ID: " + id));
        
        // 💡 CONSEJO: Si quieres mantener los datos antiguos y solo actualizar campos específicos,
        // usa el objeto existente en lugar de sobrescribirlo completamente.
        
        datosActualizados.setId(id);
        return panelesRepository.save(datosActualizados);
    }

    @Transactional
    public void eliminar(Long id) {
        Objects.requireNonNull(id, "El ID no puede ser null");
        if (!panelesRepository.existsById(id)) {
            throw new RuntimeException("Panel solar no encontrado con ID: " + id);
        }
        panelesRepository.deleteById(id);
    }
}