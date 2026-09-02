package com.newproject.jhocadi.projectSolvixBackend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.security.Key;

@Component
public class JwtUtil {

    private final String SECRET = "claveSecretaSuperLargaParaJwt123456789012345678901234567890"; // mínimo 256 bits
    private final long EXPIRATION_TIME = 86400000; // 1 día

    private Key getKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
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
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME));

        if (rol != null) {
            builder.claim("rol", rol);
        }

        return builder.signWith(getKey(), SignatureAlgorithm.HS256).compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(getKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parserBuilder().setSigningKey(getKey()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }
}
