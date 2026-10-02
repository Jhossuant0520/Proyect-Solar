package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumento;

class ClienteIdentidadNormalizerTest {

    private final ClienteIdentidadNormalizer normalizer = new ClienteIdentidadNormalizer();

    @Test
    @DisplayName("documento CC: formatos con puntos/espacios/guiones equivalen")
    void documentoCcFormatos() {
        assertThat(normalizer.normalizarDocumento("1.098.765.432", TipoDocumento.CC))
            .isEqualTo("1098765432");
        assertThat(normalizer.documentosEquivalentes(
            "1098765432", TipoDocumento.CC,
            "1 098 765 432", TipoDocumento.CC)).isTrue();
        assertThat(normalizer.documentosEquivalentes(
            "1098765432", TipoDocumento.CC,
            "1-098-765-432", TipoDocumento.CC)).isTrue();
    }

    @Test
    @DisplayName("documento PASAPORTE conserva letras")
    void documentoPasaporte() {
        assertThat(normalizer.normalizarDocumento("ab-123 45", TipoDocumento.PASAPORTE))
            .isEqualTo("AB12345");
        assertThat(normalizer.documentosEquivalentes(
            "AB12345", TipoDocumento.PASAPORTE,
            "ab-123 45", TipoDocumento.PASAPORTE)).isTrue();
    }

    @Test
    @DisplayName("teléfono: equivalentes con espacios, guiones y +57")
    void telefonoFormatos() {
        assertThat(normalizer.telefonosEquivalentes("3001234567", "300 123 4567")).isTrue();
        assertThat(normalizer.telefonosEquivalentes("3001234567", "300-123-4567")).isTrue();
        assertThat(normalizer.telefonosEquivalentes("3001234567", "+57 300 123 4567")).isTrue();
        assertThat(normalizer.telefonosEquivalentes("573001234567", "3001234567")).isTrue();
    }

    @Test
    @DisplayName("null / vacío / incorrecto no equivalen")
    void nullYVacios() {
        assertThat(normalizer.normalizarDocumento("  ", TipoDocumento.CC)).isNull();
        assertThat(normalizer.normalizarTelefono(null)).isNull();
        assertThat(normalizer.telefonosEquivalentes("3001234567", "3001234568")).isFalse();
        assertThat(normalizer.documentosEquivalentes(
            "1098765432", TipoDocumento.CC,
            "1098765433", TipoDocumento.CC)).isFalse();
    }
}
