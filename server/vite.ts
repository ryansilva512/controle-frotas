import type { Express } from "express";
import type { Server } from "http";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import path from "path";

export async function setupVite(server: Server, app: Express) {
  const vite: ViteDevServer = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: {
        server,
      },
    },
    appType: "spa",
  });

  app.use(vite.middlewares);
}

