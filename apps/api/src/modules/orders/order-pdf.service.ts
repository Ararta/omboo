import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Handlebars from "handlebars";
import puppeteer, { type Browser } from "puppeteer";
import type { OrderDocumentViewModel } from "@omboo/shared";

@Injectable()
export class OrderPdfService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;
  private readonly template: Handlebars.TemplateDelegate<OrderDocumentViewModel>;

  constructor() {
    const templatePath = join(__dirname, "templates", "order-document.hbs");
    const source = readFileSync(templatePath, "utf-8");
    this.template = Handlebars.compile<OrderDocumentViewModel>(source);
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

  async renderPdf(data: OrderDocumentViewModel): Promise<Buffer> {
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
