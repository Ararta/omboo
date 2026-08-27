import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { OrgSettingsModule } from "../org-settings/org-settings.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DocumentTemplatesController } from "./document-templates.controller";
import { DocumentTemplatesService } from "./document-templates.service";
import { GeneratedDocumentsController } from "./generated-documents.controller";
import { GeneratedDocumentsService } from "./generated-documents.service";
import { GeneratedDocumentPdfService } from "./generated-document-pdf.service";

@Module({
  imports: [StorageModule, OrgSettingsModule, NotificationsModule],
  controllers: [DocumentTemplatesController, GeneratedDocumentsController],
  providers: [DocumentTemplatesService, GeneratedDocumentsService, GeneratedDocumentPdfService],
})
export class DocumentTemplatesModule {}
