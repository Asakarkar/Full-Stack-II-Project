package com.rankforge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "point_transactions")
public class PointTransaction {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "delta_points", nullable = false)
    private Integer deltaPoints;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PointTransaction() {
    }

    public PointTransaction(StudentProfile student, User teacher, Integer deltaPoints, String reason) {
        this.id = UUID.randomUUID();
        this.student = student;
        this.teacher = teacher;
        this.deltaPoints = deltaPoints;
        this.reason = reason != null ? reason.trim() : "";
        this.createdAt = Instant.now();
    }

    public PointTransaction(UUID id, StudentProfile student, User teacher, Integer deltaPoints, String reason, Instant createdAt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.student = student;
        this.teacher = teacher;
        this.deltaPoints = deltaPoints;
        this.reason = reason != null ? reason.trim() : "";
        this.createdAt = createdAt != null ? createdAt : Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public StudentProfile getStudent() {
        return student;
    }

    public void setStudent(StudentProfile student) {
        this.student = student;
    }

    public User getTeacher() {
        return teacher;
    }

    public void setTeacher(User teacher) {
        this.teacher = teacher;
    }

    public Integer getDeltaPoints() {
        return deltaPoints;
    }

    public void setDeltaPoints(Integer deltaPoints) {
        this.deltaPoints = deltaPoints;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason != null ? reason.trim() : "";
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
