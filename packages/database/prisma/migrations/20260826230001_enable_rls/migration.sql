-- Layer 2 of the multi-tenant isolation model: Postgres Row-Level Security. The `omboo` role
-- (which owns every table and runs migrations) is a superuser and therefore always bypasses RLS
-- by Postgres design — no ROW LEVEL SECURITY policy can restrict a superuser. The running API
-- server connects as a separate, deliberately unprivileged role instead (see APP_DATABASE_URL),
-- so RLS actually applies to it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'omboo_app') THEN
    CREATE ROLE omboo_app LOGIN PASSWORD 'omboo_app_dev_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE omboo TO omboo_app;
GRANT USAGE ON SCHEMA public TO omboo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO omboo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO omboo_app;

-- `organizations`, `users`, and `refresh_tokens` are intentionally NOT RLS-protected:
-- Organization is the tenant directory itself (slug lookups during login/registration are
-- cross-tenant by design); User.email and RefreshToken.tokenHash are global unique identifiers
-- that login/refresh must resolve before any organizationId is known. Both are still confined by
-- the app-level tenant-scope extension whenever a tenant context exists (approving/listing
-- pending users, issuing tokens, etc). Every other tenant table gets a hard DB-level policy: a
-- query issued by omboo_app with no app.current_org_id set for the session (the default for any
-- ad-hoc/manual psql connection, and the only way to connect as omboo_app at all) returns zero
-- rows from every one of them, regardless of what the application code does or doesn't filter by.

ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "employees"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "employee_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "employee_documents"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "attendance_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "attendance_logs"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "requests"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "request_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "request_history"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "recalls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "recalls"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "org_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "org_settings"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "order_sequences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "order_sequences"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notifications"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "balance_adjustment_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "balance_adjustment_log"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_log"
  USING ("organizationId" = current_setting('app.current_org_id', true));
