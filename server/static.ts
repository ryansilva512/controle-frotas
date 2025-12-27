import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

// Função para encontrar o diretório dist/public em vários caminhos possíveis
function findDistPath(): string | null {
  const possiblePaths = [
    // Caminho padrão para desenvolvimento local
    path.resolve(process.cwd(), "dist", "public"),
    // Caminho para Vercel serverless (arquivos incluídos via includeFiles)
    path.resolve("/var/task", "dist", "public"),
    // Caminho alternativo com api (onde a função serverless é executada)
    path.resolve("/var/task/api", "..", "dist", "public"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found dist path: ${p}`);
      return p;
    }
  }

  console.error("Could not find dist/public in any of these paths:");
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  console.error(`process.cwd(): ${process.cwd()}`);

  return null;
}

export function serveStatic(app: Express) {
  const distPath = findDistPath();

  if (!distPath) {
    // Não lançar erro, apenas retornar uma resposta adequada
    app.get("*", (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Build folder not found</h1>
            <p>cwd: ${process.cwd()}</p>
          </body>
        </html>
      `);
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
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(404).send("<!DOCTYPE html><html><body><h1>index.html not found</h1></body></html>");
    }
  });
}









