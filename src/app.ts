import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { apiEndpoints } from "./config/api";
import { methodNotAllowed } from "./middleware/http";
import agentRoutes from "./routes/agent.routes";
import leadRoutes from "./routes/lead.routes";

interface ExpressBodyError extends Error {
  status?: number;
  type?: string;
}

const isMalformedJsonError = (error: unknown): error is ExpressBodyError =>
  error instanceof SyntaxError &&
  typeof error === "object" &&
  error !== null &&
  "type" in error &&
  error.type === "entity.parse.failed";

const isPayloadTooLargeError = (error: unknown): error is ExpressBodyError =>
  error instanceof Error &&
  typeof error === "object" &&
  error !== null &&
  "type" in error &&
  error.type === "entity.too.large";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "A7 Group AI Calling CRM backend is running",
      api_index: "/api",
    });
  });

  app.get("/api", (_req, res) => {
    res.json({
      success: true,
      message: "A7 Group AI Calling CRM API endpoints",
      endpoints: apiEndpoints,
    });
  });

  app.all("/", methodNotAllowed(["GET"]));
  app.all("/api", methodNotAllowed(["GET"]));

  app.use("/api/agent", agentRoutes);
  app.use("/api/leads", leadRoutes);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
      method: req.method,
      path: req.path,
      api_index: "/api",
    });
  });

  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (isMalformedJsonError(error)) {
        res.status(400).json({
          success: false,
          message: "Malformed JSON body",
        });
        return;
      }

      if (isPayloadTooLargeError(error)) {
        res.status(413).json({
          success: false,
          message: "Request body is too large",
        });
        return;
      }

      console.error("Unhandled server error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    },
  );

  return app;
};
