-- An employee can have at most one attendance_logs row with checkOutAt still null (i.e. at
-- most one "open" check-in session at a time). The app already pre-checks this with a
-- findFirst before creating, but that's a check-then-act race: two concurrent check-in
-- requests (double-tap, retry) can both pass the pre-check and create two open sessions,
-- corrupting the hours report. This partial unique index makes the DB the real guard; the
-- app-level pre-check stays only as a fast, friendly error path.
CREATE UNIQUE INDEX "attendance_logs_one_open_session_per_employee"
  ON "attendance_logs" ("employeeId")
  WHERE "checkOutAt" IS NULL;
