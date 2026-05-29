/**
 * k6 shared helper — token pool management
 *
 * Usage in k6 scripts:
 *   import { loadTokens, tokenForVu } from './lib/accounts.js';
 *
 *   export function setup() {
 *     const tokens = loadTokens(__ENV.TOKENS_FILE);
 *     return { tokens };
 *   }
 *
 *   export default function (data) {
 *     const { token } = tokenForVu(data.tokens, __VU);
 *     ...
 *   }
 */

/**
 * Load token list from a JSON file (must be mounted into the k6 container).
 * Returns array of { email, role, token }.
 *
 * @param {string} filePath - absolute path inside the container, e.g. /scripts/load-test-tokens.json
 */
export function loadTokens(filePath) {
  const raw = open(filePath);
  const tokens = JSON.parse(raw);
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error(`No tokens found in ${filePath}`);
  }
  return tokens;
}

/**
 * Assign one token deterministically to a VU.
 * VUs are 1-indexed; tokens are 0-indexed.
 * Uses modulo so scripts work even if token count < VU count.
 *
 * @param {Array<{email: string, role: string, token: string}>} tokens
 * @param {number} vu - k6 __VU value
 */
export function tokenForVu(tokens, vu) {
  return tokens[(vu - 1) % tokens.length];
}

/**
 * Convenience: build Authorization header value from a token entry.
 */
export function bearerHeader(tokenEntry) {
  return `Bearer ${tokenEntry.token}`;
}
