ALTER TABLE app_user
  DROP CONSTRAINT IF EXISTS app_user_user_type_check;

ALTER TABLE app_user
  ADD CONSTRAINT app_user_user_type_check
  CHECK (user_type IN ('ADMIN','EMPLOYEE','CLIENT'));
