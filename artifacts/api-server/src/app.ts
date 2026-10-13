import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { isOwnOrigin } from "./lib/siteOrigin";

const app: Express = express();
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// JSON-only API: nothing here is meant to be framed, embedded or run as a page.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
  }),
);
// The site calls the API from its own origin; other sites get no CORS access.
app.use(cors({ origin: (origin, done) => done(null, Boolean(origin && isOwnOrigin(origin))) }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

// Chat and admin answers belong to one browser; never let anything cache them.
app.use(["/api/chat", "/api/admin"], (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", router);

app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

/** Error details for the log without query parameters (they can hold private messages). */
function describeError(err: unknown) {
  if (!(err instanceof Error)) return { message: String(err).slice(0, 200) };
  return {
    name: err.name,
    message: err.message.split("\nparams:")[0].slice(0, 500),
    cause: err.cause instanceof Error ? err.cause.message.slice(0, 300) : undefined,
    stack: err.stack?.split("\n").slice(1, 8).join("\n"),
  };
}

// Always answer with JSON and never send stack traces to the browser.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const info = err as { type?: string; status?: number };
  if (info?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Body must be valid JSON" });
    return;
  }
  if (info?.type === "entity.too.large") {
    res.status(413).json({ error: "Body is too large" });
    return;
  }
  const status = typeof info?.status === "number" && info.status >= 400 ? info.status : 500;
  if (status >= 500) {
    req.log.error({ error: describeError(err) }, "Unhandled error");
  }
  if (res.headersSent) return;
  res.status(status).json({ error: status >= 500 ? "Internal error" : "Bad request" });
});

export default app;
