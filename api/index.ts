import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    // Lazy-load application to avoid module-init crashes when env is invalid
    const mod = await import("../src/app.ts");
    const createApp = mod.createApp as () => any;
    const app = createApp();

    return await new Promise<void>((resolve) => {
      res.on("finish", resolve);
      app(req as any, res as any);
    });
  } catch (err) {
    console.error("API initialization failed:", err);
    // Return a safe HTML response so the site doesn't show 500
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end("<html><body><h1>Service temporarily unavailable</h1></body></html>");
    return;
  }
}
