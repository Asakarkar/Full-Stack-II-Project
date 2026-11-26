package com.rankforge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User extends AuditedEntity implements UserDetails {

    @Id
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String accountUsername;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    protected User() {
    }

    public User(String accountUsername, String fullName, String email, String passwordHash, Role role) {
        this.id = UUID.randomUUID();
        this.accountUsername = normalizeAccountUsername(accountUsername);
        this.fullName = fullName != null ? fullName.trim() : "";
        this.email = email != null ? email.trim().toLowerCase(Locale.ROOT) : "";
        this.passwordHash = passwordHash;
        this.role = role != null ? role : Role.STUDENT;
    }

    public User(UUID id, String accountUsername, String fullName, String email, String passwordHash, Role role) {
        this.id = id != null ? id : UUID.randomUUID();
        this.accountUsername = normalizeAccountUsername(accountUsername);
        this.fullName = fullName != null ? fullName.trim() : "";
        this.email = email != null ? email.trim().toLowerCase(Locale.ROOT) : "";
        this.passwordHash = passwordHash;
        this.role = role != null ? role : Role.STUDENT;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getAccountUsername() {
        return accountUsername;
    }

    public void setAccountUsername(String accountUsername) {
        this.accountUsername = normalizeAccountUsername(accountUsername);
    }

    public void setFullName(String fullName) {
        this.fullName = fullName != null ? fullName.trim() : "";
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email != null ? email.trim().toLowerCase(Locale.ROOT) : "";
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    private String normalizeAccountUsername(String username) {
        return username != null ? username.trim().toLowerCase(Locale.ROOT) : "";
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
