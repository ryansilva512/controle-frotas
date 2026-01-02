import type { VercelRequest, VercelResponse } from "@vercel/node";

// Import the bundled API handler
const bundledHandler = require("../dist/api.cjs");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return bundledHandler.default(req, res);
}

