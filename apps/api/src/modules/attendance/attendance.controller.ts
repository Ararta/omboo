import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  attendanceManualCreateSchema,
  attendanceUpdateSchema,
  gpsPointSchema,
  type AttendanceManualCreateInput,
  type AttendanceUpdateInput,
  type GpsPointInput,
} from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { AttendanceService } from "./attendance.service";

function requireEmployeeId(user: AuthenticatedUser): string {
  if (!user.employeeId) throw new ForbiddenException("Այս հաշիվը կապված չէ աշխատողի հետ։");
  return user.employeeId;
}

@Controller("attendance")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post("check-in")
  checkIn(@Body(new ZodValidationPipe(gpsPointSchema)) dto: GpsPointInput, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkIn(requireEmployeeId(user), dto);
  }

  @Post("check-out")
  checkOut(@Body(new ZodValidationPipe(gpsPointSchema)) dto: GpsPointInput, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkOut(requireEmployeeId(user), dto);
  }

  @Get("status")
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.status(requireEmployeeId(user));
  }

  @Get("mine")
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.listMine(requireEmployeeId(user));
  }

  @Get()
  @Roles("HR")
  list(@Query("employeeId") employeeId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.attendance.listAll({ employeeId, from, to });
  }

  @Get("report")
  @Roles("HR")
  report(@Query("from") from?: string, @Query("to") to?: string) {
    return this.attendance.report({ from, to });
  }

  @Post("manual")
  @Roles("HR")
  createManual(
    @Body(new ZodValidationPipe(attendanceManualCreateSchema)) dto: AttendanceManualCreateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.createManual(dto, user.userId);
  }

  @Patch(":id")
  @Roles("HR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(attendanceUpdateSchema)) dto: AttendanceUpdateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.update(id, dto, user.userId);
  }
}
