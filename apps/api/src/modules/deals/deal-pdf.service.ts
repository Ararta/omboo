import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Handlebars from "handlebars";
import puppeteer, { type Browser } from "puppeteer";
import { BILLING_CYCLE_LABELS, type BillingCycle } from "@omboo/shared";

export interface InvoiceDocumentViewModel {
  invoiceNumber: string;
  issueDateHY: string;
  customerCompanyName: string;
  customerContactName: string;
  customerEmail: string;
  customerPhone: string;
  partnerCompanyName: string;
  packageName: string;
  billingCycleHY: string;
  amountFormatted: string;
}

export function buildInvoiceDocumentData(input: {
  invoiceNumber: string;
  issueDateHY: string;
  customerCompanyName: string;
  customerContactName: string;
  customerEmail: string;
  customerPhone: string;
  partnerCompanyName: string;
  packageName: string;
  billingCycle: BillingCycle;
  amountAmd: number;
}): InvoiceDocumentViewModel {
  return {
    invoiceNumber: input.invoiceNumber,
    issueDateHY: input.issueDateHY,
    customerCompanyName: input.customerCompanyName,
    customerContactName: input.customerContactName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    partnerCompanyName: input.partnerCompanyName,
    packageName: input.packageName,
    billingCycleHY: BILLING_CYCLE_LABELS[input.billingCycle],
    amountFormatted: new Intl.NumberFormat("hy-AM").format(input.amountAmd),
  };
}

// Own Puppeteer instance + own .hbs template, mirroring OrderPdfService/
// GeneratedDocumentPdfService — every PDF-producing feature in this codebase keeps its own,
// rather than sharing a browser/template across unrelated document types.
@Injectable()
export class DealPdfService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;
  private readonly template: Handlebars.TemplateDelegate<InvoiceDocumentViewModel>;

  constructor() {
    const templatePath = join(__dirname, "templates", "prepayment-invoice.hbs");
    const source = readFileSync(templatePath, "utf-8");
    this.template = Handlebars.compile<InvoiceDocumentViewModel>(source);
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

  async renderPdf(data: InvoiceDocumentViewModel): Promise<Buffer> {
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
