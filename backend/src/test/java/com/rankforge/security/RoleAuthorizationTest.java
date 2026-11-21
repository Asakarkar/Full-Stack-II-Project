package com.rankforge.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rankforge.dto.request.LoginRequest;
import com.rankforge.dto.request.PointAdjustmentRequest;
import com.rankforge.dto.request.RegisterRequest;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RoleAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private com.rankforge.repository.PointTransactionRepository pointTransactionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String student1Token;
    private String student2Token;
    private String teacherToken;

    private StudentProfile student1Profile;
    private StudentProfile student2Profile;

    @BeforeEach
    void setUp() {
        pointTransactionRepository.deleteAll();
        studentProfileRepository.deleteAll();
        userRepository.deleteAll();

        // Seed Student 1
        User student1 = new User("Student Alpha", "alpha@rankforge.local", passwordEncoder.encode("Password123!"), Role.STUDENT);
        userRepository.save(student1);
        student1Profile = studentProfileRepository.save(new StudentProfile(student1));
        student1Token = "Bearer " + jwtService.generateToken(student1);

        // Seed Student 2
        User student2 = new User("Student Beta", "beta@rankforge.local", passwordEncoder.encode("Password123!"), Role.STUDENT);
        userRepository.save(student2);
        student2Profile = studentProfileRepository.save(new StudentProfile(student2));
        student2Token = "Bearer " + jwtService.generateToken(student2);

        // Seed Teacher
        User teacher = new User("Teacher Lead", "teacher@rankforge.local", passwordEncoder.encode("Password123!"), Role.TEACHER);
        userRepository.save(teacher);
        teacherToken = "Bearer " + jwtService.generateToken(teacher);
    }

    @Test
    @DisplayName("Public authentication endpoints are accessible without token")
    void publicAuthEndpointsAccessible() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest("New Student", "newstudent@rankforge.local", "SecurePass123!", Role.STUDENT, null);
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("newstudent@rankforge.local"));

        LoginRequest loginRequest = new LoginRequest("alpha@rankforge.local", "Password123!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("Teacher dashboard endpoint enforces strict TEACHER role authorization")
    void teacherDashboardAuthorization() throws Exception {
        // 1. Unauthenticated -> 401
        mockMvc.perform(get("/api/v1/teacher/dashboard"))
                .andExpect(status().isUnauthorized());

        // 2. Student role -> 403 Forbidden
        mockMvc.perform(get("/api/v1/teacher/dashboard")
                        .header("Authorization", student1Token))
                .andExpect(status().isForbidden());

        // 3. Teacher role -> 200 OK
        mockMvc.perform(get("/api/v1/teacher/dashboard")
                        .header("Authorization", teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudents").value(2));
    }

    @Test
    @DisplayName("Teacher-only point modification endpoint permits teachers and forbids students")
    void teacherPointModificationAuthorization() throws Exception {
        PointAdjustmentRequest request = new PointAdjustmentRequest(10, "Class participation");

        // Student attempting to adjust points -> 403 Forbidden
        mockMvc.perform(post("/api/v1/teacher/students/" + student1Profile.getId() + "/points")
                        .header("Authorization", student1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Teacher adjusting points -> 201 Created
        mockMvc.perform(post("/api/v1/teacher/students/" + student1Profile.getId() + "/points")
                        .header("Authorization", teacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.deltaPoints").value(10))
                .andExpect(jsonPath("$.studentId").value(student1Profile.getId().toString()));
    }

    @Test
    @DisplayName("Student access to private profile enforces student-only ownership or teacher access")
    void studentPrivateDataAccessControl() throws Exception {
        // Student accessing own profile -> 200 OK
        mockMvc.perform(get("/api/v1/students/" + student1Profile.getId())
                        .header("Authorization", student1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(student1Profile.getId().toString()));

        // Student accessing another student's profile -> 403 Forbidden
        mockMvc.perform(get("/api/v1/students/" + student2Profile.getId())
                        .header("Authorization", student1Token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // Teacher accessing student's profile -> 200 OK
        mockMvc.perform(get("/api/v1/students/" + student1Profile.getId())
                        .header("Authorization", teacherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(student1Profile.getId().toString()));
    }

    @Test
    @DisplayName("Leaderboard requires authentication and allows any authenticated user")
    void leaderboardAuthorization() throws Exception {
        // Unauthenticated -> 401
        mockMvc.perform(get("/api/v1/leaderboard"))
                .andExpect(status().isUnauthorized());

        // Student -> 200 OK
        mockMvc.perform(get("/api/v1/leaderboard")
                        .header("Authorization", student1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // Teacher -> 200 OK
        mockMvc.perform(get("/api/v1/leaderboard")
                        .header("Authorization", teacherToken))
                .andExpect(status().isOk());
    }
}
