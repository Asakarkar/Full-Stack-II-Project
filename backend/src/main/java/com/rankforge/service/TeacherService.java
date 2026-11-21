package com.rankforge.service;

import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.dto.response.TeacherDashboardResponse;

public interface TeacherService {
    TeacherDashboardResponse getDashboard();
    PagedResponse<StudentProfileResponse> searchStudents(String search, int page, int size, String sort);
}


