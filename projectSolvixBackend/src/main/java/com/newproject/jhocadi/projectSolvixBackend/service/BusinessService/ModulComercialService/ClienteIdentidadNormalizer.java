package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.util.Locale;

import org.springframework.stereotype.Component;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;

/**
 * Normalización canónica de documento y teléfono para comparación de identidad.
 * No persiste cambios; solo transforma valores en memoria.
 */
@Component
public class ClienteIdentidadNormalizer {

    /**
     * Documento: conserva letras (CE/PASAPORTE); elimina separadores comunes.
     * CC/NIT/NINGUNO/null → solo dígitos (si quedan); si no hay dígitos, alfanumérico limpio.
     */
    public String normalizarDocumento(String bruto, TipoDocumento tipo) {
        if (bruto == null) {
            return null;
        }
        String trimmed = bruto.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (tipo == TipoDocumento.CE || tipo == TipoDocumento.PASAPORTE) {
            String alnum = trimmed.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
            return alnum.isEmpty() ? null : alnum;
        }
        // CC, NIT, NINGUNO o tipo desconocido: preferir solo dígitos (quita puntos/guiones/espacios).
        String digits = trimmed.replaceAll("\\D", "");
        if (!digits.isEmpty()) {
            return digits;
        }
        String fallback = trimmed.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return fallback.isEmpty() ? null : fallback;
    }

    /**
     * Teléfono: solo dígitos. Si tiene 10 dígitos y no empieza por 57, se asume celular CO.
     * Si tiene 12 y empieza por 57, se deja. Formas +57… se unifican a dígitos con 57.
     */
    public String normalizarTelefono(String bruto) {
        if (bruto == null) {
            return null;
        }
        String trimmed = bruto.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }
        // 00xx → quitar prefijo internacional 00
        if (digits.startsWith("00") && digits.length() > 2) {
            digits = digits.substring(2);
        }
        if (digits.length() == 10 && digits.startsWith("3")) {
            return "57" + digits;
        }
        if (digits.length() == 12 && digits.startsWith("57")) {
            return digits;
        }
        // Otros: comparación por dígitos tal cual (últimos 10 si el almacenado es local y el input trae país)
        return digits;
    }

    /**
     * Compara teléfonos tras normalizar; acepta equivalencia 10 dígitos locales vs 57+10.
     */
    public boolean telefonosEquivalentes(String a, String b) {
        String na = normalizarTelefono(a);
        String nb = normalizarTelefono(b);
        if (na == null || nb == null) {
            return false;
        }
        if (na.equals(nb)) {
            return true;
        }
        String ca = canonicoComparacionTel(na);
        String cb = canonicoComparacionTel(nb);
        return ca.equals(cb);
    }

    public boolean documentosEquivalentes(String a, TipoDocumento tipoA, String b, TipoDocumento tipoB) {
        String na = normalizarDocumento(a, tipoA);
        String nb = normalizarDocumento(b, tipoB != null ? tipoB : tipoA);
        if (na == null || nb == null) {
            return false;
        }
        return na.equals(nb);
    }

    private static String canonicoComparacionTel(String digits) {
        if (digits.length() == 12 && digits.startsWith("57")) {
            return digits.substring(2);
        }
        if (digits.length() > 10 && digits.startsWith("57")) {
            return digits.substring(digits.length() - 10);
        }
        if (digits.length() > 10) {
            return digits.substring(digits.length() - 10);
        }
        return digits;
    }
}
