package com.rankforge.service;

import com.rankforge.dto.response.LeaderboardEntryResponse;
import com.rankforge.dto.response.PagedResponse;
import com.rankforge.entity.User;

public interface LeaderboardService {
    PagedResponse<LeaderboardEntryResponse> getLeaderboard(int page, int size, String direction, String sortField);
    LeaderboardEntryResponse getMyRank(User currentUser);
}
