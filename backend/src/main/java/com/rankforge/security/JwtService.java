package com.rankforge.security;

import com.rankforge.config.AppProperties;
import com.rankforge.entity.Role;
import com.rankforge.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    @org.springframework.beans.factory.annotation.Autowired
    public JwtService(AppProperties appProperties) {
        String secret = appProperties.getJwt().getSecret();
        this.expirationMs = appProperties.getJwt().getExpirationMs();

        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret key must be at least 256 bits (32 bytes)");
        }
        if (expirationMs < 60000) {
            throw new IllegalStateException("JWT expiration must be at least 60000 ms (1 minute)");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public JwtService(String secret, long expirationMs) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret key must be at least 256 bits (32 bytes)");
        }
        if (expirationMs < 60000) {
            throw new IllegalStateException("JWT expiration must be at least 60000 ms (1 minute)");
        }
        this.expirationMs = expirationMs;
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId().toString())
                .claim("role", user.getRole().name())
                .claim("fullName", user.getFullName())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public UUID extractUserId(String token) {
        String idStr = parseClaims(token).get("userId", String.class);
        return idStr != null ? UUID.fromString(idStr) : null;
    }

    public Role extractRole(String token) {
        String roleStr = parseClaims(token).get("role", String.class);
        return roleStr != null ? Role.valueOf(roleStr) : null;
    }

    public boolean validateToken(String token, User user) {
        try {
            Claims claims = parseClaims(token);
            String email = claims.getSubject();
            boolean isExpired = claims.getExpiration().before(new Date());
            return email != null && email.equalsIgnoreCase(user.getEmail()) && !isExpired;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
