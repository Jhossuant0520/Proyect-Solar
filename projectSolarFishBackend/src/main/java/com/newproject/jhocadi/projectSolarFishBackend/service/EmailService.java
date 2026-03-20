package com.newproject.jhocadi.projectSolarFishBackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String remitente;

    public void enviarEmailVerificacion(String destinatario, String token) {
        String enlace = "http://localhost:4200/verificar-email/" + token;

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
    }
}
