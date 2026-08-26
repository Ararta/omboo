import { z } from "zod";

export const documentCategorySchema = z.enum(["CONTRACT", "ORDER", "CERTIFICATE", "ID_DOCUMENT", "OTHER"]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const documentUploadMetaSchema = z.object({
  employeeId: z.string().min(1),
  title: z.string().min(1, "Վերնագիրը պարտադիր է։"),
  category: documentCategorySchema,
});
export type DocumentUploadMetaInput = z.infer<typeof documentUploadMetaSchema>;

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: "Աշխատանքային պայմանագիր",
  ORDER: "Հրաման",
  CERTIFICATE: "Տեղեկանք",
  ID_DOCUMENT: "Անձնագիր/ID",
  OTHER: "Այլ",
};
