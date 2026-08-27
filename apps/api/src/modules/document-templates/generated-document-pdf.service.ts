import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Handlebars from "handlebars";
import puppeteer, { type Browser } from "puppeteer";

export interface GeneratedDocumentViewModel {
  title: string;
  contentHtml: string;
  companyName: string;
  employeeName: string;
  employeeSignedAtHY: string;
  directorName: string;
  directorSignedAtHY: string;
}

/** Mirrors OrderPdfService's structure exactly (own puppeteer instance, own compiled template)
 * — kept as a separate service rather than a shared one so the two features' rendering can
 * evolve independently without risking the already-working order-PDF flow. */
@Injectable()
export class GeneratedDocumentPdfService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;
  private readonly template: Handlebars.TemplateDelegate<GeneratedDocumentViewModel>;

  constructor() {
    const templatePath = join(__dirname, "templates", "generated-document.hbs");
    const source = readFileSync(templatePath, "utf-8");
    this.template = Handlebars.compile<GeneratedDocumentViewModel>(source);
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browserPromise;
  }

  async renderPdf(data: GeneratedDocumentViewModel): Promise<Buffer> {
    const html = this.template(data);
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy() {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
    }
  }
}
