-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_token (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_password_reset_token_user ON password_reset_token(user_id);
CREATE INDEX ix_password_reset_token_token ON password_reset_token(token);
CREATE INDEX ix_password_reset_token_expires ON password_reset_token(expires_at);

-- Clean up expired tokens (optional: can be run periodically)
-- DELETE FROM password_reset_token WHERE expires_at < NOW() OR used = true;

