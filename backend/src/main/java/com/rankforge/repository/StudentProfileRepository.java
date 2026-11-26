package com.rankforge.repository;

import com.rankforge.entity.StudentProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID> {

    @EntityGraph(attributePaths = { "user" })
    @Query("SELECT sp FROM StudentProfile sp WHERE sp.user.id = :userId")
    Optional<StudentProfile> findByUserId(@Param("userId") UUID userId);

    @EntityGraph(attributePaths = { "user" })
    @Query("SELECT sp FROM StudentProfile sp WHERE sp.id = :id")
    Optional<StudentProfile> findWithUserById(@Param("id") UUID id);

    @EntityGraph(attributePaths = { "user" })
    @Query("SELECT sp FROM StudentProfile sp")
    Page<StudentProfile> findAllWithUser(Pageable pageable);

    @EntityGraph(attributePaths = { "user" })
    @Query("""
                SELECT sp FROM StudentProfile sp
                WHERE (:search IS NULL OR
                       LOWER(sp.user.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR
                       LOWER(sp.user.email) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<StudentProfile> searchStudents(@Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(sp) + 1 FROM StudentProfile sp WHERE sp.totalPoints > :points")
    long countCompetitionRank(@Param("points") Long points);

    @Query("""
                SELECT COUNT(sp) + 1 FROM StudentProfile sp
                WHERE sp.totalPoints > :points
                   OR (sp.totalPoints = :points AND sp.id < :studentId)
            """)
    long countDeterministicRank(@Param("points") Long points, @Param("studentId") UUID studentId);

    @Query("SELECT COALESCE(SUM(sp.totalPoints), 0) FROM StudentProfile sp")
    long sumTotalPoints();
}
