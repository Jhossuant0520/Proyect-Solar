package com.newproject.jhocadi.projectComputerElectronicBackend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
    EmpresaDocumentoProperties.class,
    SoftwareDocumentoProperties.class
})
public class DocumentoPropertiesConfig {
}
