import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // Em produção na Vercel, os arquivos públicos podem estar em diferentes locais
  // dependendo de onde o código é executado
  let distPath = path.resolve(__dirname, "..", "dist", "public");

  // Fallback para o diretório de trabalho atual se o caminho relativo não existir
  if (!fs.existsSync(distPath)) {
    distPath = path.resolve(process.cwd(), "dist", "public");
  }

  if (!fs.existsSync(distPath)) {
    console.error(`Pasta de build não encontrada em: ${distPath}`);
    console.error(`__dirname: ${__dirname}`);
    console.error(`process.cwd(): ${process.cwd()}`);
    // Não lançar erro, apenas retornar uma resposta adequada
    app.get("*", (_req, res) => {
      res.status(500).json({
        error: "Build folder not found",
        paths: { distPath, __dirname, cwd: process.cwd() }
      });
    });
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









