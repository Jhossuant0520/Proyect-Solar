package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;

/**
 * Resuelve el adapter por canal entre los beans registrados.
 * En 3.15.9.2 no hay adapters de producción: la lista puede estar vacía.
 */
@Component
public class NotificationChannelRegistry {

    private final List<NotificationChannelAdapter> adapters;

    public NotificationChannelRegistry(List<NotificationChannelAdapter> adapters) {
        this.adapters = adapters == null ? List.of() : List.copyOf(adapters);
    }

    public Optional<NotificationChannelAdapter> resolve(CanalNotificacion canal) {
        if (canal == null) {
            return Optional.empty();
        }
        return adapters.stream()
            .filter(a -> a.supports(canal))
            .findFirst();
    }

    public List<NotificationChannelAdapter> todos() {
        return adapters;
    }

    public boolean tieneAdapter(CanalNotificacion canal) {
        return resolve(canal).isPresent();
    }
}
