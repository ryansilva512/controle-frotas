import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setupVite(server: Server, app: Express) {
  const vite = await createViteServer({
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: {
        port: 5001,
      },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Always serve the index.html from the client folder
      const template = fs.readFileSync(
        path.resolve(__dirname, "..", "client", "index.html"),
        "utf-8"
      );

      // 3. Apply Vite HTML transforms. This injects the Vite HMR client, and
      //    also applies HTML transforms from Vite plugins, e.g. global preambles
      //    from @vitejs/plugin-react
      const appHtml = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(appHtml);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
