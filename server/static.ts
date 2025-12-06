import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Pasta de build não encontrada em ${distPath}. Execute 'npm run build' primeiro.`
    );
  }

  // Servir arquivos estáticos
  app.use(express.static(distPath));

  // Fallback para SPA - todas as rotas não-API servem o index.html
  app.get("*", (_req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("index.html não encontrado");
    }
  });
}


