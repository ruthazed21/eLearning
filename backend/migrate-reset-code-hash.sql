-- Widen reset_code column to store bcrypt hashes (password reset OTP)
ALTER TABLE users ALTER COLUMN reset_code TYPE VARCHAR(255);
