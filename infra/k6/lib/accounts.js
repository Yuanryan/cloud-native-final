/**
 * Parse a JSON string (previously read with open()) into a token array.
 * Returns array of { email, role, token }.
 *
 * @param {string} rawJson - content of the tokens JSON file
 */
export function parseTokens(rawJson) {
  const tokens = JSON.parse(rawJson);
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error('No tokens found in token JSON');
  }
  return tokens;
}

/**
 * @deprecated Use parseTokens(open(filePath)) at global scope instead.
 * Kept for reference — calling open() inside a function throws in k6.
 */
export function loadTokens(_filePath) {
  throw new Error(
    'loadTokens() cannot be called inside setup() or default().\n' +
    'Use: const _raw = open(filePath) at global scope, then parseTokens(_raw).',
  );
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
