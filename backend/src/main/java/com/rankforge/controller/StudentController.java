package com.rankforge.controller;

import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.entity.User;
import com.rankforge.service.StudentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/students", "/api/students"})
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/me")
    public ResponseEntity<StudentProfileResponse> getMyProfile(@AuthenticationPrincipal User currentUser) {
        StudentProfileResponse response = studentService.getMyProfile(currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentProfileResponse> getStudentById(@PathVariable UUID id,
                                                                 @AuthenticationPrincipal User currentUser) {
        StudentProfileResponse response = studentService.getStudentById(id, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<PagedResponse<PointTransactionResponse>> getStudentTransactions(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User currentUser) {
        PagedResponse<PointTransactionResponse> response = studentService.getStudentTransactions(id, page, size, currentUser);
        return ResponseEntity.ok(response);
    }
}
