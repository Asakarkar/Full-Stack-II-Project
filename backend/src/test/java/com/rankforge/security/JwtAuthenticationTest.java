package com.rankforge.security;

import com.rankforge.config.AppProperties;
import com.rankforge.entity.Role;
import com.rankforge.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtAuthenticationTest {

    private AppProperties appProperties;
    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        // Base64 256-bit key
        appProperties.getJwt().setSecret("dGVzdC1zZWNyZXQta2V5LXNob3VsZC1iZS1hdC1sZWFzdC0yNTYtYml0cy1sb25nLWZvci1oczI1NiE=");
        appProperties.getJwt().setExpirationMs(3600000L);

        jwtService = new JwtService(appProperties);

        testUser = new User(UUID.randomUUID(), "Alice Student", "alice@example.com", "hashedPassword", Role.STUDENT);
    }

    @Test
    @DisplayName("Generates signed token with email, userId, and role claims")
    void generateAndParseValidToken() {
        String token = jwtService.generateToken(testUser);
        assertNotNull(token);

        assertTrue(jwtService.isTokenValid(token));
        assertEquals("alice@example.com", jwtService.extractEmail(token));
        assertEquals(testUser.getId(), jwtService.extractUserId(token));
        assertEquals(Role.STUDENT, jwtService.extractRole(token));
        assertTrue(jwtService.validateToken(token, testUser));
    }

    @Test
    @DisplayName("Rejects token when validated against a different user")
    void tokenInvalidForDifferentUser() {
        String token = jwtService.generateToken(testUser);
        User differentUser = new User(UUID.randomUUID(), "Bob Student", "bob@example.com", "hash", Role.STUDENT);

        assertFalse(jwtService.validateToken(token, differentUser));
    }

    @Test
    @DisplayName("Rejects weak JWT signing secrets (less than 256 bits)")
    void rejectsWeakSigningSecret() {
        AppProperties weakProps = new AppProperties();
        weakProps.getJwt().setSecret(Base64.getEncoder().encodeToString("short-key-16-bytes!".getBytes()));
        weakProps.getJwt().setExpirationMs(3600000L);

        assertThrows(IllegalStateException.class, () -> new JwtService(weakProps));
    }

    @Test
    @DisplayName("Rejects token expiration below 1 minute threshold")
    void rejectsTooShortExpiration() {
        AppProperties shortProps = new AppProperties();
        shortProps.getJwt().setExpirationMs(5000L); // 5 seconds < 60000 ms

        assertThrows(IllegalStateException.class, () -> new JwtService(shortProps));
    }

    @Test
    @DisplayName("Rejects malformed or tampered token")
    void rejectsMalformedToken() {
        assertFalse(jwtService.isTokenValid("not.a.valid.jwt.token"));
        assertFalse(jwtService.isTokenValid(""));
    }
}
