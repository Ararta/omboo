/** Thrown by services when a `@omboo/shared` rule-engine check fails (e.g. հոդված 163 chunk
 * rule) or another business-rule precondition isn't met. Carries the exact Armenian message
 * so the API response text matches web/mobile's inline validation verbatim. */
export class DomainValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainValidationError";
  }
}
