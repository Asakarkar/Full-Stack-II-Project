ALTER TABLE users
    ADD COLUMN username VARCHAR(50) NULL;

UPDATE users
SET username = CONCAT(
    LOWER(REGEXP_REPLACE(LEFT(SUBSTRING_INDEX(email, '@', 1), 16), '[^a-zA-Z0-9_]', '_')),
    '_',
    LOWER(REPLACE(id, '-', ''))
);

ALTER TABLE users
    MODIFY COLUMN username VARCHAR(50) NOT NULL,
    ADD CONSTRAINT uq_users_username UNIQUE (username);
