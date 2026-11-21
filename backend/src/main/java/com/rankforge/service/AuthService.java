package com.rankforge.service;

import com.rankforge.dto.request.LoginRequest;
import com.rankforge.dto.request.RegisterRequest;
import com.rankforge.dto.response.AuthResponse;
import com.rankforge.dto.response.UserResponse;
import com.rankforge.entity.User;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    UserResponse getCurrentUser(User currentUser);
}
