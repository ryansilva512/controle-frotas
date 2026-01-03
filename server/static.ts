import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

export function serveStatic(app: Express) {
  // Em produção na Vercel, os arquivos estáticos são servidos diretamente pela plataforma
  // Esta função é usada principalmente para desenvolvimento local
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.warn(`Pasta de build não encontrada em: ${distPath}`);
    console.warn("Execute 'npm run build' primeiro ou use 'npm run dev' para desenvolvimento.");
    return;
  }

  // Servir arquivos estáticos com tipos MIME corretos
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));

  // Fallback para SPA - todas as rotas não-API servem o index.html
  app.get("*", (_req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.sendFile(indexPath);
    } else {
      res.status(404).send("index.html não encontrado");
    }
  });
}















