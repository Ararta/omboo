import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { DomainExceptionFilter } from "./common/filters/domain-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (CSP, HSTS, X-Frame-Options/clickjacking, X-Content-Type-Options, etc.).
  // The API only ever serves JSON/redirects, never renders HTML, so a strict default-deny CSP
  // is safe here — it isn't the web app's CSP.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  app.useGlobalFilters(new DomainExceptionFilter());
  app.setGlobalPrefix("api");

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Omboo API listening on http://localhost:${port}/api`);
}

bootstrap();
