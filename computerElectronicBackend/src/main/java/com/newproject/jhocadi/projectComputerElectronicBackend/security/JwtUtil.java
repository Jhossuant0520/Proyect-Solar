package com.newproject.jhocadi.projectComputerElectronicBackend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.security.Key;

@Component
public class JwtUtil {

    private final Key key;
    private final long expirationTime;

    public JwtUtil(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.expiration-ms:86400000}") long expirationTime) {
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                "app.security.jwt.secret / JWT_SECRET must be at least 256 bits (32 bytes)");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.expirationTime = expirationTime;
    }

    public String generateToken(String username) {
        return generateToken(username, null);
    }

    /**
     * Incluye el rol como claim para que el cliente pueda adaptar la interfaz.
     * La autoridad real sigue validándose en el backend contra la base de datos.
     */
    public String generateToken(String username, String rol) {
        JwtBuilder builder = Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime));

        if (rol != null) {
            builder.claim("rol", rol);
        }

        return builder.signWith(key, SignatureAlgorithm.HS256).compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject();
    }
}
