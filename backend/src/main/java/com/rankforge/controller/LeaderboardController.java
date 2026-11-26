package com.rankforge.controller;

import com.rankforge.dto.response.LeaderboardEntryResponse;
import com.rankforge.dto.response.PagedResponse;
import com.rankforge.entity.User;
import com.rankforge.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/leaderboard", "/api/leaderboard"})
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<LeaderboardEntryResponse>> getLeaderboard(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String direction,
            @RequestParam(defaultValue = "totalPoints") String sort) {
        PagedResponse<LeaderboardEntryResponse> response = leaderboardService.getLeaderboard(page, size, direction, sort);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<LeaderboardEntryResponse> getMyRank(@AuthenticationPrincipal User currentUser) {
        LeaderboardEntryResponse response = leaderboardService.getMyRank(currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/activity")
    public ResponseEntity<PagedResponse<com.rankforge.dto.response.PointTransactionResponse>> getRecentActivity(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        PagedResponse<com.rankforge.dto.response.PointTransactionResponse> response = leaderboardService.getRecentActivity(page, size);
        return ResponseEntity.ok(response);
    }
}


