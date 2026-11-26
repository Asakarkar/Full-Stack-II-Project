ALTER TABLE users
    DROP INDEX uq_users_username;

UPDATE users u
JOIN (
    SELECT id, base_username,
           ROW_NUMBER() OVER (PARTITION BY base_username ORDER BY id) AS duplicate_rank
    FROM (
        SELECT id,
               CASE
                   WHEN REGEXP_LIKE(clean_username, '^[a-z0-9]') THEN clean_username
                   ELSE CONCAT('user_', LEFT(clean_username, 24))
               END AS base_username
        FROM (
            SELECT id,
                   LOWER(REGEXP_REPLACE(
                       LEFT(SUBSTRING_INDEX(email, '@', 1), 30),
                       '[^a-zA-Z0-9_.-]',
                       '_'
                   )) AS clean_username
            FROM users
        ) normalized
    ) candidates
) ranked ON ranked.id = u.id
SET u.username = CASE
    WHEN ranked.duplicate_rank = 1 THEN ranked.base_username
    ELSE CONCAT('u_', LOWER(REPLACE(u.id, '-', '')))
END;

ALTER TABLE users
    ADD CONSTRAINT uq_users_username UNIQUE (username);
