# Correção do Build e Deploy na Vercel

**Data:** 02 de Janeiro de 2026

---

## Problema 1: Páginas Vazias (Build Error)

### Erro Identificado

```
"default" is not exported by "client/src/pages/home.tsx", imported by "client/src/App.tsx"
```

### Causa

Dois arquivos de páginas estavam vazios e não possuíam o export default necessário:

1. `client/src/pages/home.tsx` - estava vazio
2. `client/src/pages/vehicles.tsx` - estava vazio

### Solução Aplicada

#### Criação do arquivo `client/src/pages/home.tsx`

Foi criado um componente HomePage completo com:
- Dashboard de status da frota (veículos em movimento, parados, offline)
- Cards de estatísticas com contadores
- Links rápidos para todas as seções do sistema
- Exibição de alertas recentes não lidos
- Design responsivo com tema claro/escuro

#### Criação do arquivo `client/src/pages/vehicles.tsx`

Foi criado um componente VehiclesPage completo com:
- Listagem de todos os veículos da frota
- Busca por nome, placa ou modelo
- Filtros por status (em movimento, parado, ocioso, offline)
- Cards individuais para cada veículo
- Ações rápidas (ver no mapa, ver histórico, remover)
- Design responsivo em grid

---

## Problema 2: Módulo Não Encontrado (Runtime Error)

### Erro Identificado

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/auth' imported from /var/task/api/index.js
```

### Causa

A função serverless da Vercel (`api/index.ts`) estava tentando fazer imports dinâmicos de arquivos do diretório `server/`:

```typescript
const { setupAuth } = await import("../server/auth");
const { registerRoutes } = await import("../server/routes");
```

Esses arquivos não estavam sendo incluídos no bundle da função serverless, pois a Vercel processava apenas o arquivo `api/index.ts` sem resolver as dependências locais.

### Solução Aplicada

#### 1. Modificação do script de build (`script/build.ts`)

Adicionado um passo de build adicional que compila `api/index.ts` como um bundle único usando esbuild, incluindo todo o código do servidor:

```typescript
console.log("building vercel api function...");
await esbuild({
  entryPoints: ["api/index.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "api/index.js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  minify: true,
  external: ["@vercel/node"],
  logLevel: "info",
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});
```

#### 2. Atualização do `vercel.json`

Alterado para usar o arquivo JavaScript compilado:

```json
{
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/index.js"
    }
  ]
}
```

#### 3. Atualização do `.gitignore`

Adicionado `api/index.js` para não commitar o arquivo gerado pelo build.

---

## Arquivos Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `client/src/pages/home.tsx` | Criado | Página inicial com dashboard de status |
| `client/src/pages/vehicles.tsx` | Criado | Página de gerenciamento de veículos |
| `script/build.ts` | Modificado | Adicionado build da função API como bundle |
| `vercel.json` | Modificado | Configurado para usar `api/index.js` |
| `.gitignore` | Modificado | Adicionado `api/index.js` |

---

## Resultado do Build

```
building client...
✓ 3508 modules transformed.
✓ built in 23.54s

building server...
dist/index.cjs  1.2mb
Done in 7079ms

building vercel api function...
api/index.js  1.3mb
Done in 295ms
```

---

## Como Testar

1. Execute o build localmente:
   ```bash
   npm run build:vercel
   ```

2. Verifique se os arquivos foram gerados:
   - `dist/public/` - Frontend compilado
   - `dist/index.cjs` - Servidor para execução local
   - `api/index.js` - Função serverless para Vercel

3. Faça deploy na Vercel através de push para a branch main.

