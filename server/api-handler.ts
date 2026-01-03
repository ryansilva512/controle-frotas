import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

// Cache the app instance
let app: express.Express | null = null;

async function getApp() {
  if (app) return app;

  app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Logging middleware para debug
  app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
  });

  setupAuth(app);

  // Para Vercel, não precisamos do httpServer, passamos null
  await registerRoutes(null as any, app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[API Error]", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const expressApp = await getApp();
    expressApp(req as any, res as any);
  } catch (error) {
    console.error("[Vercel Handler Error]", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}



