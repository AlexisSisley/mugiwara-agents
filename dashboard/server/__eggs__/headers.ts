// ============================================================
// _egg-headers.ts — Custom HTTP Headers Easter Egg
// Adds One Piece themed headers to every API response.
// Only visible to those who inspect network traffic.
// Removal: delete this file + remove the import in server/index.ts.
// ============================================================

import type { RequestHandler } from 'express';

// If you found these headers in your DevTools... congratulations.
// You are now an honorary member of the Straw Hat crew.
const PIRATE_HEADERS: Record<string, string> = {
  'X-Pirate-King': 'Monkey-D-Luffy',
  'X-Crew': 'Mugiwara',
  'X-Hidden-Message': 'The-treasure-is-in-the-code',
  'X-Bounty': '3000000000',
  'X-Dream': 'All-Blue',
};

/**
 * Express middleware that injects One Piece themed HTTP headers.
 * Completely invisible to the end user unless they open DevTools.
 */
export const eggHeadersMiddleware: RequestHandler = (_req, res, next) => {
  if (process.env['ENABLE_EGGS'] !== 'false') {
    for (const [key, value] of Object.entries(PIRATE_HEADERS)) {
      res.setHeader(key, value);
    }
  }
  next();
};
