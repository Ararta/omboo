import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { EmailModule } from "../email/email.module";
import { DealsController } from "./deals.controller";
import { DealsService } from "./deals.service";
import { DealPdfService } from "./deal-pdf.service";

@Module({
  imports: [StorageModule, EmailModule],
  controllers: [DealsController],
  providers: [DealsService, DealPdfService],
})
export class DealsModule {}
