/**
 * sha256.js — Browser-side SHA-256 hashing of files using the Web Crypto API.
 *
 * IMPORTANT NOTES:
 * ─────────────────
 * 1. SHA-256 is NOT encryption. It is a one-way fingerprint of the file bytes.
 *    The hash cannot be reversed to recover the PDF.
 *
 * 2. We intentionally use SHA-256 (not Ethereum's keccak256).
 *    The smart contract stores the SHA-256 hash as a bytes32 value.
 *    Mixing algorithms would silently produce wrong verification results.
 *
 * 3. The PDF file is NEVER sent to any server. Hashing happens entirely
 *    inside the user's browser using the Web Crypto API (window.crypto.subtle).
 *
 * 4. Verification compares the exact file bytes. Even a cosmetic change
 *    (metadata, watermark, print-to-PDF) will produce a different hash and
 *    will return "not registered."
 */

/**
 * Compute SHA-256 hash of a File or Blob and return it as a 0x-prefixed
 * 64-character hex string suitable for passing to the smart contract.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>}  e.g. "0xabc123..."
 */
export async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  const hashHex    = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hashHex;
}

/**
 * Verify the browser's SHA-256 output against a known test vector.
 * The test vector is the SHA-256 hash of the ASCII string "abc".
 * Expected: ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469db5de85d274a2efd4
 *
 * Call this once at startup to confirm the Web Crypto API is working.
 * @returns {Promise<boolean>}
 */
export async function verifySha256Implementation() {
  const encoder = new TextEncoder();
  const data     = encoder.encode("abc");
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashHex    = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const EXPECTED = "ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469db5de85d274a2efd4";
  return hashHex === EXPECTED;
}

/**
 * Format a bytes32 hash for display (show first 8 + "..." + last 6 chars).
 * @param {string} hash  "0x..." 66-char hex
 * @returns {string}
 */
export function shortHash(hash) {
  if (!hash || hash.length < 20) return hash;
  return hash.slice(0, 10) + "…" + hash.slice(-6);
}
