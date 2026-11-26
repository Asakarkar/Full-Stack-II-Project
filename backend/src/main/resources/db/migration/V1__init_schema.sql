-- RankForge Database Schema Migration
-- Flyway V1: Initial Schema for MySQL

CREATE TABLE users (
    id VARCHAR(36) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('STUDENT', 'TEACHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_profiles (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    total_points BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_student_profiles_user_id UNIQUE (user_id),
    CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_student_profiles_total_points CHECK (total_points >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE point_transactions (
    id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    delta_points INTEGER NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_point_transactions_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_point_transactions_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_point_transactions_delta_nonzero CHECK (delta_points <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_student_profiles_points ON student_profiles(total_points DESC, id ASC);
CREATE INDEX idx_point_transactions_student_created ON point_transactions(student_id, created_at DESC);
CREATE INDEX idx_point_transactions_teacher_created ON point_transactions(teacher_id, created_at DESC);
