import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { MarketingAssetsController } from "./marketing-assets.controller";
import { MarketingAssetsService } from "./marketing-assets.service";

@Module({
  imports: [StorageModule],
  controllers: [MarketingAssetsController],
  providers: [MarketingAssetsService],
  exports: [MarketingAssetsService],
})
export class MarketingAssetsModule {}
