package com.newproject.jhocadi.projectSolvixBackend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
    EmpresaDocumentoProperties.class,
    SoftwareDocumentoProperties.class
})
public class SolvixDocumentoConfig {
}
