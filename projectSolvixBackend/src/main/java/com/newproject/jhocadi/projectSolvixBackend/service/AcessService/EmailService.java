package com.newproject.jhocadi.projectSolvixBackend.service.AcessService;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String remitente;

    public boolean enviarEmailVerificacion(String destinatario, String token) {
        if (destinatario == null || destinatario.isBlank() || token == null || token.isBlank()) {
            logger.warn("No se pudo enviar el correo de verificación porque faltan datos del destinatario o el token.");
            return false;
        }

        if (remitente == null || remitente.isBlank() || mailSender == null) {
            logger.warn("SMTP no configurado. Se omite el envío del correo de verificación en este entorno.");
            return false;
        }

        String enlace = "http://localhost:4200/verificar-email/" + token;

        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(remitente);
            mensaje.setTo(destinatario);
            mensaje.setSubject("Verifica tu cuenta en Solvix");
            mensaje.setText(
                    "¡Hola!\n\n" +
                    "Gracias por registrarte en Solvix. Para activar tu cuenta, haz clic en el siguiente enlace:\n\n" +
                    enlace + "\n\n" +
                    "Este enlace expira en 24 horas. Si no creaste esta cuenta, puedes ignorar este correo.\n\n" +
                    "¡Saludos!"
            );

            mailSender.send(mensaje);
            return true;
        } catch (MailException e) {
            logger.error("No se pudo enviar el correo de verificación a {}. El registro continuará en modo desarrollo.", destinatario, e);
            return false;
        }
    }
}
