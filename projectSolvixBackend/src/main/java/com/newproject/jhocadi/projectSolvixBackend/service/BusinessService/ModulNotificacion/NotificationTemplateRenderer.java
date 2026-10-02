package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * Sustitución segura de {{variable}}. Variables desconocidas → cadena vacía.
 */
@Component
public class NotificationTemplateRenderer {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}");

    public String render(String plantilla, Map<String, String> variables) {
        if (plantilla == null || plantilla.isBlank()) {
            return "";
        }
        Map<String, String> vars = variables == null ? Map.of() : variables;
        Matcher matcher = PLACEHOLDER.matcher(plantilla);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = vars.getOrDefault(key, "");
            matcher.appendReplacement(sb, Matcher.quoteReplacement(value == null ? "" : value));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    public Map<String, String> variablesDesdeEvento(NotificationEvent event) {
        Map<String, String> vars = new HashMap<>();
        vars.put("clienteNombre", nvl(event.clienteNombre()));
        vars.put("ordenNumero", nvl(event.ordenNumero()));
        vars.put("equipo", nvl(event.equipoResumen()));
        vars.put("estado", nvl(event.estadoCodigo()));
        vars.put("etapaPublica", nvl(event.etapaPublica()));
        vars.put("urlConsulta", nvl(event.urlConsulta()));
        vars.put("cotizacionNumero", nvl(event.cotizacionNumero()));
        vars.put("fecha", "");
        if (event.extras() != null) {
            event.extras().forEach((k, v) -> {
                if (esVariablePublica(k)) {
                    vars.put(k, nvl(v));
                }
            });
        }
        return vars;
    }

    private static boolean esVariablePublica(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }
        return switch (key) {
            case "ordenId", "usuarioInternoId", "costoInterno", "stock", "proveedor",
                 "jwt", "password", "firma" -> false;
            default -> key.matches("[a-zA-Z][a-zA-Z0-9_]{0,40}");
        };
    }

    private static String nvl(String value) {
        return value == null ? "" : value.trim();
    }
}
