package com.rankforge.controller;

import com.rankforge.dto.request.PointAdjustmentRequest;
import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.dto.response.TeacherDashboardResponse;
import com.rankforge.entity.User;
import com.rankforge.service.PointService;
import com.rankforge.service.TeacherService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/teacher", "/api/teacher"})
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    private final TeacherService teacherService;
    private final PointService pointService;

    public TeacherController(TeacherService teacherService, PointService pointService) {
        this.teacherService = teacherService;
        this.pointService = pointService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<TeacherDashboardResponse> getDashboard() {
        TeacherDashboardResponse dashboard = teacherService.getDashboard();
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/students")
    public ResponseEntity<PagedResponse<StudentProfileResponse>> searchStudents(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        PagedResponse<StudentProfileResponse> response = teacherService.searchStudents(search, page, size, sort);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/students/{id}/points")
    public ResponseEntity<PointTransactionResponse> adjustPoints(
            @PathVariable UUID id,
            @Valid @RequestBody PointAdjustmentRequest request,
            @AuthenticationPrincipal User teacher) {
        PointTransactionResponse response = pointService.adjustPoints(id, teacher, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/students/{id}/points/award")
    public ResponseEntity<PointTransactionResponse> awardPoints(
            @PathVariable UUID id,
            @Valid @RequestBody PointAdjustmentRequest request,
            @AuthenticationPrincipal User teacher) {
        int points = Math.abs(request.points());
        PointAdjustmentRequest awardRequest = new PointAdjustmentRequest(points, request.reason());
        PointTransactionResponse response = pointService.adjustPoints(id, teacher, awardRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/students/{id}/points/deduct")
    public ResponseEntity<PointTransactionResponse> deductPoints(
            @PathVariable UUID id,
            @Valid @RequestBody PointAdjustmentRequest request,
            @AuthenticationPrincipal User teacher) {
        int points = -Math.abs(request.points());
        PointAdjustmentRequest deductRequest = new PointAdjustmentRequest(points, request.reason());
        PointTransactionResponse response = pointService.adjustPoints(id, teacher, deductRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}


