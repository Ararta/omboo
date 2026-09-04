-- Layer 2 (Postgres RLS) for the B2B Partner Portal — a second, independent tenant-isolation
-- barrier keyed on partnerId / app.current_partner_id, parallel to (never merged with) the
-- organizationId / app.current_org_id barrier from the enable_rls migration. omboo_app already
-- has SELECT/INSERT/UPDATE/DELETE on these tables via that migration's
-- ALTER DEFAULT PRIVILEGES, so no GRANT is needed here.
--
-- Only the three partner-owned transactional tables are protected. partners/partner_users/
-- partner_refresh_tokens are pre-auth lookup tables (same reasoning as organizations/users/
-- refresh_tokens staying unprotected) and packages/package_prices/commission_rates/
-- marketing_assets are platform-global, gated at the API layer by isPlatformOwner, not by RLS.

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "orders"
  USING ("partnerId" = current_setting('app.current_partner_id', true));

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoices"
  USING ("partnerId" = current_setting('app.current_partner_id', true));

ALTER TABLE "partner_invoice_sequences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "partner_invoice_sequences"
  USING ("partnerId" = current_setting('app.current_partner_id', true));
