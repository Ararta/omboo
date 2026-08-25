import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { DomainValidationError } from "../errors/domain-validation.error";

@Catch(DomainValidationError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      code: exception.code,
      message: exception.message,
    });
  }
}
