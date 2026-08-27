-- Extends Layer 2 (Postgres RLS, see the enable_rls migration) to the two tables the document-
-- template feature added. Same pattern: omboo_app (the role the running app connects as) gets
-- zero rows back with no app.current_org_id session variable set.

ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "document_templates"
  USING ("organizationId" = current_setting('app.current_org_id', true));

ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "generated_documents"
  USING ("organizationId" = current_setting('app.current_org_id', true));
