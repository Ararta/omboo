-- Platform Admin (an Organization with isPlatformOwner = true) needs to read/update orders and
-- invoices ACROSS every partner for oversight (PartnersOverviewSection) and the manual
-- "mark invoice paid" action — but those tables' existing tenant_isolation RLS policy only
-- admits rows matching app.current_partner_id, which is never set for an org-JWT request (see
-- PartnerContextMiddleware: it only sets partner context when a partner JWT verifies).
--
-- Postgres combines multiple PERMISSIVE policies on the same table with OR, so this adds a
-- second policy that admits every row when app.is_platform_admin is set — which only happens
-- inside PlatformAdminTransactionInterceptor, itself only reachable after PlatformAdminGuard has
-- already verified role=DIRECTOR && isPlatformOwner=true. A partner's own request never sets
-- this session var, so this bypass can never leak one partner's rows to another partner.

CREATE POLICY platform_admin_bypass ON "orders"
  USING (current_setting('app.is_platform_admin', true) = 'true');

CREATE POLICY platform_admin_bypass ON "invoices"
  USING (current_setting('app.is_platform_admin', true) = 'true');
