import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";

// Create require function for ESM compatibility
const require = createRequire(import.meta.url);

// Import the bundled API handler
const bundledHandler = require("../dist/api.cjs");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return bundledHandler.default(req, res);
}

