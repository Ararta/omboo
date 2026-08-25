import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/** Wraps a `@omboo/shared` zod schema as a Nest pipe — the exact same schema object web/mobile
 * use with React Hook Form, so client and server accept/reject identical input shapes. */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      throw new BadRequestException({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: firstIssue?.message ?? "Անվավեր տվյալներ։",
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
