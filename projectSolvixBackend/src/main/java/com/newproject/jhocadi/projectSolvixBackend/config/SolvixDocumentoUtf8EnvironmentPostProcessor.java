package com.newproject.jhocadi.projectSolvixBackend.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

/**
 * Garantiza UTF-8 para textos corporativos de PDFs.
 * <p>
 * En Windows, si application.properties se interpreta como ISO-8859-1,
 * bytes UTF-8 de tildes aparecen corruptos en el PDF (mojibake).
 * Este post-procesador relee las claves solvix.empresa.* y
 * solvix.software.* con StandardCharsets.UTF_8 y las antepone al Environment.
 */
public class SolvixDocumentoUtf8EnvironmentPostProcessor implements EnvironmentPostProcessor {

    public static final String PROPERTY_SOURCE_NAME = "solvixDocumentoUtf8";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> utf8 = new LinkedHashMap<>();
        loadSolvixKeys(utf8, new ClassPathResource("application.properties"));
        for (String profile : environment.getActiveProfiles()) {
            loadSolvixKeys(utf8, new ClassPathResource("application-" + profile + ".properties"));
        }
        if (!utf8.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, utf8));
        }
    }

    private static void loadSolvixKeys(Map<String, Object> target, Resource resource) {
        if (resource == null || !resource.exists()) {
            return;
        }
        try (InputStream in = resource.getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#") || trimmed.startsWith("!")) {
                    continue;
                }
                if (trimmed.startsWith("//")) {
                    continue;
                }
                int eq = indexOfUnescapedSeparator(trimmed);
                if (eq <= 0) {
                    continue;
                }
                String key = trimmed.substring(0, eq).trim();
                if (!key.startsWith("solvix.empresa.") && !key.startsWith("solvix.software.")) {
                    continue;
                }
                String value = unescapePropertiesValue(trimmed.substring(eq + 1).trim());
                target.put(key, value);
            }
        } catch (IOException ignored) {
            // Si el recurso no se puede leer, se conserva el PropertySource original.
        }
    }

    private static int indexOfUnescapedSeparator(String line) {
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\\') {
                i++;
                continue;
            }
            if (c == '=' || c == ':') {
                return i;
            }
        }
        return -1;
    }

    /** Interpreta escapes tipicos de archivos .properties. */
    private static String unescapePropertiesValue(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(raw.length());
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c != '\\' || i + 1 >= raw.length()) {
                sb.append(c);
                continue;
            }
            char n = raw.charAt(++i);
            switch (n) {
                case 'u' -> {
                    if (i + 4 < raw.length()) {
                        String hex = raw.substring(i + 1, i + 5);
                        sb.append((char) Integer.parseInt(hex, 16));
                        i += 4;
                    } else {
                        sb.append('\\').append('u');
                    }
                }
                case 'n' -> sb.append('\n');
                case 'r' -> sb.append('\r');
                case 't' -> sb.append('\t');
                default -> sb.append(n);
            }
        }
        return sb.toString();
    }
}
