import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createRequestSchema,
  directorDecisionSchema,
  hrScheduleVacationSchema,
  type CreateRequestInput,
  type DirectorDecisionInput,
  type HrScheduleVacationInput,
} from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { RequestsService } from "./requests.service";

function requireEmployeeId(user: AuthenticatedUser): string {
  if (!user.employeeId) throw new ForbiddenException("Այս հաշիվը կապված չէ աշխատողի հետ։");
  return user.employeeId;
}

@Controller("requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @Roles("EMPLOYEE")
  submit(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createRequestSchema)) dto: CreateRequestInput) {
    return this.requests.submit(requireEmployeeId(user), dto);
  }

  @Get("mine")
  @Roles("EMPLOYEE")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.requests.listMine(requireEmployeeId(user));
  }

  @Post(":id/cancel")
  @Roles("EMPLOYEE")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.requests.cancel(requireEmployeeId(user), id);
  }

  @Get()
  @Roles("HR")
  listAll() {
    return this.requests.listAll();
  }

  @Get("pending-director")
  @Roles("DIRECTOR")
  listPendingForDirector() {
    return this.requests.listPendingForDirector();
  }

  @Get("pending-hr")
  @Roles("HR")
  listPendingForHR() {
    return this.requests.listPendingForHR();
  }

  @Get("team-out")
  listTeamOut() {
    return this.requests.listTeamOutThisMonth();
  }

  @Patch(":id/decision")
  @Roles("DIRECTOR")
  decide(@Param("id") id: string, @Body(new ZodValidationPipe(directorDecisionSchema)) dto: DirectorDecisionInput) {
    return this.requests.decide(id, dto);
  }

  @Post("hr-schedule")
  @Roles("HR")
  hrSchedule(@Body(new ZodValidationPipe(hrScheduleVacationSchema)) dto: HrScheduleVacationInput) {
    return this.requests.hrScheduleVacation(dto);
  }
}
