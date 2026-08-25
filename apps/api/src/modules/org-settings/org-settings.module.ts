import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { OrgSettingsController } from "./org-settings.controller";
import { OrgSettingsService } from "./org-settings.service";

@Module({
  imports: [StorageModule],
  controllers: [OrgSettingsController],
  providers: [OrgSettingsService],
  exports: [OrgSettingsService],
})
export class OrgSettingsModule {}
