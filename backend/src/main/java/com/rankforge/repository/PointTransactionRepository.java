package com.rankforge.repository;

import com.rankforge.entity.PointTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface PointTransactionRepository extends JpaRepository<PointTransaction, UUID> {

    @EntityGraph(attributePaths = {"student.user", "teacher"})
    Page<PointTransaction> findByStudentId(UUID studentId, Pageable pageable);

    @EntityGraph(attributePaths = {"student.user", "teacher"})
    Page<PointTransaction> findAll(Pageable pageable);

    @Query("SELECT COUNT(pt) FROM PointTransaction pt WHERE pt.createdAt >= :since")
    long countSince(@Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(pt.deltaPoints), 0) FROM PointTransaction pt WHERE pt.deltaPoints > 0 AND pt.createdAt >= :since")
    long sumAwardedSince(@Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(ABS(pt.deltaPoints)), 0) FROM PointTransaction pt WHERE pt.deltaPoints < 0 AND pt.createdAt >= :since")
    long sumDeductedSince(@Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(pt.deltaPoints), 0) FROM PointTransaction pt WHERE pt.deltaPoints > 0")
    long sumAllAwardedPoints();

    @Query("SELECT COUNT(pt) FROM PointTransaction pt WHERE pt.student.id = :studentId")
    long countByStudentId(@Param("studentId") UUID studentId);
}
