import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

/** When EMAIL_SEND_ENABLED is not "true" (the safe local/dev default), emails are logged
 * instead of sent — no Resend API key is required to run the rest of the system locally. */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = (process.env.EMAIL_SEND_ENABLED ?? "false") === "true";
    this.fromEmail = process.env.RESEND_FROM_EMAIL ?? "Omboo <no-reply@omboo.am>";
    this.resend = this.enabled ? new Resend(process.env.RESEND_API_KEY) : null;
  }

  async sendPdf(to: string, subject: string, text: string, pdf: Buffer, filename: string): Promise<void> {
    if (!this.enabled || !this.resend) {
      this.logger.log(`[email disabled] would send "${subject}" to ${to} — attachment ${filename} (${pdf.length} bytes)`);
      return;
    }
    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject,
      text,
      attachments: [{ filename, content: pdf.toString("base64") }],
    });
  }
}
