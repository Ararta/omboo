import { Global, Module } from "@nestjs/common";
import { PartnerPrismaService } from "./partner-prisma.service";

@Global()
@Module({
  providers: [PartnerPrismaService],
  exports: [PartnerPrismaService],
})
export class PartnerPrismaModule {}
