package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

/**
 * Resultado del envío por un {@link NotificationChannelAdapter}.
 * No incluye stack traces ni secretos.
 */
public record NotificationSendResult(
    boolean success,
    String providerMessageId,
    String errorCode,
    String errorMessage
) {
    public static NotificationSendResult ok() {
        return ok(null);
    }

    public static NotificationSendResult ok(String providerMessageId) {
        return new NotificationSendResult(true, blankToNull(providerMessageId), null, null);
    }

    public static NotificationSendResult failure(String errorCode, String errorMessage) {
        return new NotificationSendResult(
            false,
            null,
            blankToNull(errorCode),
            truncate(errorMessage, 500));
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= max) {
            return trimmed;
        }
        return trimmed.substring(0, max);
    }
}
