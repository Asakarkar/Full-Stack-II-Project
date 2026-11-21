package com.rankforge.service;

import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.entity.User;

import java.util.UUID;

public interface StudentService {
    StudentProfileResponse getMyProfile(User currentUser);
    StudentProfileResponse getStudentById(UUID studentId, User currentUser);
    PagedResponse<PointTransactionResponse> getStudentTransactions(UUID studentId, int page, int size, User currentUser);
}


