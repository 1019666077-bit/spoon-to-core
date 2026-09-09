/** Creator compressUuid / decompressUuid (non-min, 5-char hex prefix). */
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const ASCII_TO_64 = (() => {
  const table = new Array<number>(128).fill(0);
  for (let i = 0; i < 64; i += 1) table[BASE64.charCodeAt(i)] = i;
  return table;
})();

export function compressUuid(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32) throw new Error(`expected 32 hex chars, got ${hex.length}`);
  let out = hex.slice(0, 5);
  for (let i = 5; i < hex.length; i += 3) {
    const a = parseInt(hex[i], 16);
    const b = parseInt(hex[i + 1], 16);
    const c = parseInt(hex[i + 2], 16);
    out += BASE64[(a << 2) | (b >> 2)];
    out += BASE64[((b & 3) << 4) | c];
  }
  return out;
}

export function decompressUuid(compressed: string): string {
  if (compressed.length !== 23) return compressed;
  const hex: string[] = [];
  for (let i = 5; i < 23; i += 2) {
    const lhs = ASCII_TO_64[compressed.charCodeAt(i)] ?? 0;
    const rhs = ASCII_TO_64[compressed.charCodeAt(i + 1)] ?? 0;
    hex.push((lhs >> 2).toString(16));
    hex.push((((lhs & 3) << 2) | (rhs >> 4)).toString(16));
    hex.push((rhs & 0xf).toString(16));
  }
  const raw = compressed.slice(0, 5) + hex.join("");
  return [raw.slice(0, 8), raw.slice(8, 12), raw.slice(12, 16), raw.slice(16, 20), raw.slice(20)].join("-");
}
