package com.rankforge.concurrency;

import com.rankforge.dto.request.PointAdjustmentRequest;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.InsufficientPointsException;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.repository.UserRepository;
import com.rankforge.service.PointService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class PointConcurrencyTest {

    @Autowired
    private PointService pointService;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PointTransactionRepository pointTransactionRepository;

    private User teacher;
    private StudentProfile studentProfile;

    @BeforeEach
    void setUp() {
        pointTransactionRepository.deleteAll();
        studentProfileRepository.deleteAll();
        userRepository.deleteAll();

        teacher = userRepository.save(new User("Teacher Concurrency", "teacher.conc@rankforge.local", "hash", Role.TEACHER));
        User studentUser = userRepository.save(new User("Student Concurrency", "student.conc@rankforge.local", "hash", Role.STUDENT));
        studentProfile = studentProfileRepository.save(new StudentProfile(studentUser));
    }

    @Test
    @DisplayName("Handles concurrent point adjustments safely under multi-threaded execution")
    void concurrentPointAdjustmentsHandledSafely() throws InterruptedException {
        int initialPoints = 100;
        studentProfile.setTotalPoints((long) initialPoints);
        studentProfileRepository.saveAndFlush(studentProfile);

        int numberOfThreads = 10;
        // 5 threads will add 10 points (+50), 5 threads will deduct 10 points (-50)
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch readyLatch = new CountDownLatch(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);

        UUID studentId = studentProfile.getId();

        for (int i = 0; i < numberOfThreads; i++) {
            final int index = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    int points = (index % 2 == 0) ? 10 : -10;
                    String reason = "Concurrent adjustment #" + index;
                    pointService.adjustPoints(studentId, teacher, new PointAdjustmentRequest(points, reason));
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    errorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        boolean completed = doneLatch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All concurrent tasks should complete within timeout");
        assertEquals(numberOfThreads, successCount.get(), "All updates should succeed via optimistic locking retries");

        StudentProfile updatedProfile = studentProfileRepository.findById(studentId).orElseThrow();
        assertEquals(100L, updatedProfile.getTotalPoints(), "Net point balance should remain 100 (+50 -50)");

        long recordedTransactions = pointTransactionRepository.countByStudentId(studentId);
        assertEquals(numberOfThreads, recordedTransactions, "Every adjustment must record a ledger transaction");
    }

    @Test
    @DisplayName("Prevents negative balance under concurrent race condition deductions")
    void concurrentDeductionsPreventNegativeBalance() throws InterruptedException {
        // Balance starts at 15 points
        studentProfile.setTotalPoints(15L);
        studentProfileRepository.saveAndFlush(studentProfile);

        int numberOfThreads = 2;
        // 2 threads both attempt to deduct 10 points concurrently (requires 20 points, but only 15 available)
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch readyLatch = new CountDownLatch(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientPointsCount = new AtomicInteger(0);

        UUID studentId = studentProfile.getId();

        for (int i = 0; i < numberOfThreads; i++) {
            final int index = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    pointService.adjustPoints(studentId, teacher, new PointAdjustmentRequest(-10, "Attempt deduction " + index));
                    successCount.incrementAndGet();
                } catch (InsufficientPointsException e) {
                    insufficientPointsCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Exactly one deduction must succeed (balance 15 - 10 = 5), the second must fail with InsufficientPointsException
        assertEquals(1, successCount.get());
        assertEquals(1, insufficientPointsCount.get());

        StudentProfile updatedProfile = studentProfileRepository.findById(studentId).orElseThrow();
        assertEquals(5L, updatedProfile.getTotalPoints());
        assertTrue(updatedProfile.getTotalPoints() >= 0, "Student balance must never become negative");
    }
}
