import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  balanceAdjustmentSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  type BalanceAdjustmentInput,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@omboo/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { EmployeesService } from "./employees.service";

@Controller("employees")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @Roles("HR", "DIRECTOR")
  findAll() {
    return this.employees.findAll();
  }

  @Get("me")
  async findMe(@CurrentUser() user: AuthenticatedUser) {
    if (!user.employeeId) throw new ForbiddenException("Այս հաշիվը կապված չէ աշխատողի հետ։");
    return this.employees.findByIdOrThrow(user.employeeId);
  }

  @Post()
  @Roles("HR")
  create(@Body(new ZodValidationPipe(createEmployeeSchema)) dto: CreateEmployeeInput) {
    return this.employees.create(dto);
  }

  @Patch(":id")
  @Roles("HR")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateEmployeeSchema)) dto: UpdateEmployeeInput) {
    return this.employees.update(id, dto);
  }

  @Patch(":id/balance")
  @Roles("HR")
  adjustBalance(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(balanceAdjustmentSchema)) dto: BalanceAdjustmentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employees.adjustBalance(id, dto.balance, user.userId);
  }
}
