package com.rankforge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;

import java.util.UUID;

@Entity
@Table(name = "student_profiles",
        uniqueConstraints = @UniqueConstraint(name = "uq_student_profiles_user_id", columnNames = "user_id"))
public class StudentProfile extends AuditedEntity {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "total_points", nullable = false)
    private Long totalPoints = 0L;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    protected StudentProfile() {
    }

    public StudentProfile(User user) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.totalPoints = 0L;
        this.version = 0L;
    }

    public StudentProfile(UUID id, User user, Long totalPoints) {
        this.id = id != null ? id : UUID.randomUUID();
        this.user = user;
        this.totalPoints = totalPoints != null ? totalPoints : 0L;
        this.version = 0L;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Long getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(Long totalPoints) {
        this.totalPoints = totalPoints;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}


