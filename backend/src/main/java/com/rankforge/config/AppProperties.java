package com.rankforge.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "rankforge")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Teacher teacher = new Teacher();
    private final Points points = new Points();
    private final Cors cors = new Cors();

    public Jwt getJwt() {
        return jwt;
    }

    public Teacher getTeacher() {
        return teacher;
    }

    public Points getPoints() {
        return points;
    }

    public Cors getCors() {
        return cors;
    }

    public static class Jwt {
        private String secret = "dGVzdC1zZWNyZXQta2V5LXNob3VsZC1iZS1hdC1sZWFzdC0yNTYtYml0cy1sb25nLWZvci1oczI1NiE=";
        private long expirationMs = 3600000;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getExpirationMs() {
            return expirationMs;
        }

        public void setExpirationMs(long expirationMs) {
            this.expirationMs = expirationMs;
        }
    }

    public static class Teacher {
        private String invitationCode = "DEV-TEACHER-SECRET-KEY";

        public String getInvitationCode() {
            return invitationCode;
        }

        public void setInvitationCode(String invitationCode) {
            this.invitationCode = invitationCode;
        }
    }

    public static class Points {
        private int maxPerTransaction = 10000;

        public int getMaxPerTransaction() {
            return maxPerTransaction;
        }

        public void setMaxPerTransaction(int maxPerTransaction) {
            this.maxPerTransaction = maxPerTransaction;
        }
    }

    public static class Cors {
        private String allowedOrigins = "*";

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }
}


