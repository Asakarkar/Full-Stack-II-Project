-- RankForge Database Schema Migration
-- Flyway V1: Initial Schema

CREATE TABLE users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('STUDENT', 'TEACHER'))
);

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    total_points BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_student_profiles_user_id UNIQUE (user_id),
    CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_student_profiles_total_points CHECK (total_points >= 0)
);

CREATE TABLE point_transactions (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    delta_points INTEGER NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_point_transactions_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_point_transactions_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_point_transactions_delta_nonzero CHECK (delta_points <> 0)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_student_profiles_points ON student_profiles(total_points DESC, id ASC);
CREATE INDEX idx_point_transactions_student_created ON point_transactions(student_id, created_at DESC);
CREATE INDEX idx_point_transactions_teacher_created ON point_transactions(teacher_id, created_at DESC);
