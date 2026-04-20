ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "salutation"        VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "date_of_birth"     DATE,
  ADD COLUMN IF NOT EXISTS "anniversary_date"  DATE,
  ADD COLUMN IF NOT EXISTS "alternate_phone"   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "alternate_email"   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "avatar_r2_key"     VARCHAR(500);
