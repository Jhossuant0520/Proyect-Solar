package com.newproject.jhocadi.projectSolvixBackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.newproject.jhocadi.projectSolvixBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectSolvixBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectSolvixBackend.repository.AccesRepo.repositoryUsuario;

import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtUtil jwtUtil;
    private final repositoryUsuario usuarioRepository;
    private final SecurityContextRepository securityContextRepository =
        new RequestAttributeSecurityContextRepository();

    public JwtAuthFilter(JwtUtil jwtUtil, repositoryUsuario usuarioRepository) {
        this.jwtUtil = jwtUtil;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
        throws ServletException, IOException {

        if (CorsUtils.isPreFlightRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extraerToken(request);

        if (token != null && jwtUtil.validateToken(token)) {
            String username = jwtUtil.getUsernameFromToken(token);
            log.debug("JWT username={}", username);

            Optional<modelUsuario> usuarioOpt = usuarioRepository.findByNombreUsuarioWithRol(username);
            if (usuarioOpt.isEmpty()) {
                log.warn("JWT user not found in database: {}", username);
            } else {
                publicarAutenticacionDesdeBd(usuarioOpt.get(), username, request, response);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void publicarAutenticacionDesdeBd(modelUsuario usuario,
                                              String username,
                                              HttpServletRequest request,
                                              HttpServletResponse response) {
        log.debug("Usuario encontrado id={} username={} activo={}",
            usuario.getIdUsuario(), usuario.getNombreUsuario(), usuario.isActivo());

        modelRolUsuario rol = usuario.getRol();
        String nombreRol = rol != null ? StringUtils.trimWhitespace(rol.getNombreRol()) : null;
        log.debug("Rol encontrado={}", nombreRol);

        if (!usuario.isActivo() || !StringUtils.hasText(nombreRol)) {
            log.warn("JWT user {} is not authorizable (activo={}, rol={})",
                username, usuario.isActivo(), nombreRol);
            return;
        }

        List<SimpleGrantedAuthority> authorities =
            List.of(new SimpleGrantedAuthority("ROLE_" + nombreRol));
        log.debug("Authorities construidas={}", authoritiesToString(authorities));

        UsernamePasswordAuthenticationToken authToken =
            new UsernamePasswordAuthenticationToken(username, null, authorities);
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authToken);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        Authentication autenticado = SecurityContextHolder.getContext().getAuthentication();
        log.debug("SecurityContext autenticado principal={} authorities={}",
            autenticado != null ? autenticado.getName() : null,
            autenticado != null ? authoritiesToString(autenticado.getAuthorities()) : null);
    }

    private String extraerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private static String authoritiesToString(Collection<? extends GrantedAuthority> authorities) {
        return authorities.stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.joining(","));
    }
}
