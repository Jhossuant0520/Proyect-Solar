package com.newproject.jhocadi.projectSolvixBackend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.newproject.jhocadi.projectSolvixBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectSolvixBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectSolvixBackend.repository.AccesRepo.repositoryUsuario;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private repositoryUsuario usuarioRepository;

    private JwtAuthFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthFilter(jwtUtil, usuarioRepository);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Jhossuant con rol ADMIN queda autenticado con ROLE_ADMIN")
    void jhossuantObtieneRoleAdmin() throws Exception {
        MockHttpServletRequest request = requestConBearer();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        when(jwtUtil.validateToken("token")).thenReturn(true);
        when(jwtUtil.getUsernameFromToken("token")).thenReturn("Jhossuant");
        when(usuarioRepository.findByNombreUsuarioWithRol("Jhossuant"))
            .thenReturn(Optional.of(usuario("Jhossuant", "ADMIN", true)));

        filter.doFilter(request, response, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.isAuthenticated()).isTrue();
        assertThat(auth.getName()).isEqualTo("Jhossuant");
        assertThat(auth.getAuthorities())
            .extracting(GrantedAuthority::getAuthority)
            .containsExactly("ROLE_ADMIN");
    }

    @Test
    @DisplayName("Usuario con rol USUARIO queda autenticado con ROLE_USUARIO")
    void usuarioObtieneRoleUsuario() throws Exception {
        MockHttpServletRequest request = requestConBearer();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        when(jwtUtil.validateToken("token")).thenReturn(true);
        when(jwtUtil.getUsernameFromToken("token")).thenReturn("cliente");
        when(usuarioRepository.findByNombreUsuarioWithRol("cliente"))
            .thenReturn(Optional.of(usuario("cliente", "USUARIO", true)));

        filter.doFilter(request, response, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities())
            .extracting(GrantedAuthority::getAuthority)
            .containsExactly("ROLE_USUARIO");
    }

    @Test
    @DisplayName("Rol null no autentica ni fabrica ROLE_USUARIO")
    void rolNullNoFabricaRoleUsuario() throws Exception {
        MockHttpServletRequest request = requestConBearer();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        when(jwtUtil.validateToken("token")).thenReturn(true);
        when(jwtUtil.getUsernameFromToken("token")).thenReturn("Jhossuant");
        when(usuarioRepository.findByNombreUsuarioWithRol("Jhossuant"))
            .thenReturn(Optional.of(usuario("Jhossuant", null, true)));

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(usuarioRepository).findByNombreUsuarioWithRol("Jhossuant");
    }

    private static MockHttpServletRequest requestConBearer() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/productos");
        request.addHeader("Authorization", "Bearer token");
        return request;
    }

    private static modelUsuario usuario(String username, String nombreRol, boolean activo) {
        modelRolUsuario rol = null;
        if (nombreRol != null) {
            rol = new modelRolUsuario();
            rol.setNombreRol(nombreRol);
        }
        modelUsuario usuario = new modelUsuario();
        usuario.setNombreUsuario(username);
        usuario.setActivo(activo);
        usuario.setRol(rol);
        return usuario;
    }
}
