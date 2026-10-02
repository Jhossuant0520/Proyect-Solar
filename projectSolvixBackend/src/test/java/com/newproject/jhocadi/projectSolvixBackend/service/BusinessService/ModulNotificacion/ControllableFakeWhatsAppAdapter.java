package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;

/**
 * Adapter WHATSAPP controlable — solo para tests.
 * NO es un bean de producción.
 */
public class ControllableFakeWhatsAppAdapter implements NotificationChannelAdapter {

    private final AtomicInteger sendCount = new AtomicInteger();
    private final AtomicBoolean throwOnSend = new AtomicBoolean(false);
    private final AtomicReference<Function<Notificacion, NotificationSendResult>> behavior =
        new AtomicReference<>(n -> NotificationSendResult.ok("fake-msg-" + n.getId()));

    @Override
    public String codigo() {
        return "FAKE_WHATSAPP_TEST";
    }

    @Override
    public CanalNotificacion canal() {
        return CanalNotificacion.WHATSAPP;
    }

    @Override
    public NotificationSendResult send(Notificacion notificacion) {
        sendCount.incrementAndGet();
        if (throwOnSend.get()) {
            throw new IllegalStateException("fake-adapter-boom");
        }
        return behavior.get().apply(notificacion);
    }

    public void simularExito() {
        throwOnSend.set(false);
        behavior.set(n -> NotificationSendResult.ok("fake-msg-" + n.getId()));
    }

    public void simularExitoConProviderId(String providerId) {
        throwOnSend.set(false);
        behavior.set(n -> NotificationSendResult.ok(providerId));
    }

    public void simularFallo(String code, String message) {
        throwOnSend.set(false);
        behavior.set(n -> NotificationSendResult.failure(code, message));
    }

    public void simularExcepcion() {
        throwOnSend.set(true);
    }

    public int getSendCount() {
        return sendCount.get();
    }

    public void reset() {
        sendCount.set(0);
        throwOnSend.set(false);
        simularExito();
    }
}
