import { z } from "zod";

export const documentCategorySchema = z.enum([
  "CONTRACT",
  "AGREEMENT",
  "ORDER",
  "STATEMENT",
  "CLAIM",
  "CERTIFICATE",
  "ID_DOCUMENT",
  "OTHER",
]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const documentUploadMetaSchema = z.object({
  employeeId: z.string().min(1),
  title: z.string().min(1, "Վերնագիրը պարտադիր է։"),
  category: documentCategorySchema,
});
export type DocumentUploadMetaInput = z.infer<typeof documentUploadMetaSchema>;

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: "Աշխատանքային պայմանագիր",
  AGREEMENT: "Համաձայնագիր",
  ORDER: "Հրաման",
  STATEMENT: "Դիմում",
  CLAIM: "Հայտ",
  CERTIFICATE: "Տեղեկանք",
  ID_DOCUMENT: "Անձնագիր/ID",
  OTHER: "Այլ",
};

// The five categories DocumentTemplate/GeneratedDocument are restricted to — the other three
// DocumentCategory values (CERTIFICATE, ID_DOCUMENT, OTHER) only ever apply to plain manual
// uploads (documentUploadMetaSchema above), never to a template.
export const TEMPLATE_CATEGORIES = ["CONTRACT", "AGREEMENT", "ORDER", "STATEMENT", "CLAIM"] as const;
export const templateCategorySchema = z.enum(TEMPLATE_CATEGORIES);
export type TemplateCategory = z.infer<typeof templateCategorySchema>;

// Plural framing ("Պայմանագրեր") for category-tab/list headings, as opposed to
// DOCUMENT_CATEGORY_LABELS's singular item-type wording used in the plain-upload dropdown.
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  CONTRACT: "Պայմանագրեր",
  AGREEMENT: "Համաձայնագրեր",
  ORDER: "Հրամաններ",
  STATEMENT: "Դիմումներ",
  CLAIM: "Հայտեր",
};

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Անվանումը պարտադիր է։"),
  category: templateCategorySchema,
  contentHtml: z.string().min(1, "Բովանդակությունը պարտադիր է։"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  contentHtml: z.string().min(1).optional(),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// Auto-filled from Employee/OrgSettings data at generation time — see
// GeneratedDocumentsService.resolveKnownPlaceholders. Any other {{token}} found in a template's
// contentHtml is treated as a custom field HR fills in by hand per generation.
export const KNOWN_PLACEHOLDER_FIELDS = [
  "employeeName",
  "employeePosition",
  "employeeHireDate",
  "employeeEmail",
  "companyName",
  "companyAddress",
  "directorName",
  "hrName",
  "today",
] as const;

// Single source of truth for the {{token}} shape — both custom-field detection and
// generation-time substitution must agree on exactly what counts as a placeholder.
export const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const KNOWN_PLACEHOLDER_LABELS: Record<(typeof KNOWN_PLACEHOLDER_FIELDS)[number], string> = {
  employeeName: "Աշխատողի անուն",
  employeePosition: "Աշխատողի պաշտոն",
  employeeHireDate: "Աշխատողի աշխ. սկիզբ",
  employeeEmail: "Աշխատողի էլ. փոստ",
  companyName: "Կազմակերպության անվանում",
  companyAddress: "Կազմակերպության հասցե",
  directorName: "Տնoրենի անուն",
  hrName: "ՄՌԿ մասնագետի անուն",
  today: "Այսօրվա ամսաթիվ",
};

export const generateDocumentSchema = z.object({
  employeeId: z.string().min(1),
  customFields: z.record(z.string(), z.string()).default({}),
});
export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;

export const generatedDocumentStatusSchema = z.enum([
  "PENDING_EMPLOYEE_SIGNATURE",
  "PENDING_DIRECTOR_SIGNATURE",
  "COMPLETED",
  "CANCELLED",
]);
export type GeneratedDocumentStatus = z.infer<typeof generatedDocumentStatusSchema>;

export const GENERATED_DOCUMENT_STATUS_LABELS: Record<GeneratedDocumentStatus, string> = {
  PENDING_EMPLOYEE_SIGNATURE: "Սպասում է աշխատողի ստորագրությանը",
  PENDING_DIRECTOR_SIGNATURE: "Սպասում է տնoրենի ստորագրությանը",
  COMPLETED: "Ավարտված",
  CANCELLED: "Չեղարկված",
};
