-- Invalidate existing JWTs after password change by versioning sessions per user.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
