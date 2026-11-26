package com.rankforge.config;

import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds initial development and live demo accounts if the database is empty.
 * Controlled by rankforge.seed-demo-data: true (default enabled for dev/demo).
 */
@Component
@ConditionalOnProperty(prefix = "rankforge", name = "seed-demo-data", havingValue = "true", matchIfMissing = true)
public class DemoDataSeeder implements CommandLineRunner {

        private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

        private final UserRepository userRepository;
        private final StudentProfileRepository studentProfileRepository;
        private final PointTransactionRepository pointTransactionRepository;
        private final PasswordEncoder passwordEncoder;

        public DemoDataSeeder(UserRepository userRepository,
                        StudentProfileRepository studentProfileRepository,
                        PointTransactionRepository pointTransactionRepository,
                        PasswordEncoder passwordEncoder) {
                this.userRepository = userRepository;
                this.studentProfileRepository = studentProfileRepository;
                this.pointTransactionRepository = pointTransactionRepository;
                this.passwordEncoder = passwordEncoder;
        }

        @Override
        @Transactional
        public void run(String... args) {
                if (userRepository.count() > 0) {
                        log.info("Database already contains user records. Skipping demo data seeding.");
                        return;
                }

                log.info("Seeding RankForge live demo development accounts...");

                // 1. Provision Teacher Account
                User teacher = new User(
                                "eleanor.davis",
                                "Professor Eleanor Davis",
                                "teacher@rankforge.edu",
                                passwordEncoder.encode("Teacher123!"),
                                Role.TEACHER);
                userRepository.save(teacher);

                // 2. Provision 5 Seeded Students
                seedStudent("Alice Vance", "alice", "alice@rankforge.edu", "Student123!", 120L, teacher,
                                "High performance in Software Architecture project");
                seedStudent("Bob Martinez", "bob", "bob@rankforge.edu", "Student123!", 120L, teacher,
                                "Exceptional academic leadership & peer mentoring (Tie with Alice)");
                seedStudent("Charlie Chen", "charlie", "charlie@rankforge.edu", "Student123!", 95L, teacher,
                                "Consistent homework excellence and lab results");
                seedStudent("Diana Prince", "diana", "diana@rankforge.edu", "Student123!", 50L, teacher,
                                "Active participation in academic hackathon");
                seedStudent("Ethan Hunt", "ethan", "ethan@rankforge.edu", "Student123!", 15L, teacher,
                                "First lab submission and quiz completion");

                log.info("Successfully seeded demo teacher (teacher@rankforge.edu) and 5 student accounts.");
        }

        private void seedStudent(String name, String username, String email, String rawPassword, Long points, User teacher,
                        String reason) {
                User user = new User(username, name, email, passwordEncoder.encode(rawPassword), Role.STUDENT);
                userRepository.save(user);

                StudentProfile profile = new StudentProfile(user);
                profile.setTotalPoints(points);
                studentProfileRepository.save(profile);

                if (points > 0) {
                        PointTransaction tx = new PointTransaction(profile, teacher, points.intValue(), reason);
                        pointTransactionRepository.save(tx);
                }
        }
}
