import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { recallRequestSchema, recallRespondSchema, type RecallRequestInput, type RecallRespondInput } from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { RecallsService } from "./recalls.service";

@Controller("recalls")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecallsController {
  constructor(private readonly recalls: RecallsService) {}

  @Get("recallable")
  @Roles("HR")
  listRecallable() {
    return this.recalls.listRecallable();
  }

  @Get("to-finalize")
  @Roles("HR")
  listToFinalize() {
    return this.recalls.listToFinalize();
  }

  @Post(":requestId/request")
  @Roles("HR")
  requestRecall(@Param("requestId") requestId: string, @Body(new ZodValidationPipe(recallRequestSchema)) dto: RecallRequestInput) {
    return this.recalls.requestRecall(requestId, dto);
  }

  @Patch(":requestId/respond")
  @Roles("EMPLOYEE")
  respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId") requestId: string,
    @Body(new ZodValidationPipe(recallRespondSchema)) dto: RecallRespondInput,
  ) {
    if (!user.employeeId) throw new ForbiddenException("Այս հաշիվը կապված չէ աշխատողի հետ։");
    return this.recalls.respond(user.employeeId, requestId, dto.accept);
  }

  @Post(":requestId/finalize")
  @Roles("HR")
  finalize(@Param("requestId") requestId: string) {
    return this.recalls.finalize(requestId);
  }
}
