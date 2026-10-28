// Draws the app icons (a small shelf of cloth-bound books) as PNGs: node scripts/make-icons.mjs
// No image library needed: the icon is only rectangles, written with node's zlib.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const CLOTH = [0x27, 0x35, 0x52];
const SHELF = [0x16, 0x1d, 0x33];
const BAND = [0xed, 0xe6, 0xd3];
// Spines as fractions of the icon: [x, width, top, colour]. The shelf sits at y = 0.74.
const SPINES = [
  [0.22, 0.12, 0.30, [0xa9, 0x46, 0x5f]],
  [0.355, 0.12, 0.36, [0x8f, 0x65, 0x14]],
  [0.49, 0.13, 0.26, [0x3b, 0x66, 0x84]],
  [0.635, 0.12, 0.33, [0x56, 0x49, 0x7f]],
];
const SHELF_Y = 0.74;

/** RGB pixel at (x, y) in a size×size icon. `pad` shrinks the drawing toward the centre (maskable safe zone). */
export function pixel(x, y, size, pad = 0) {
  const u = (x + 0.5) / size;
  const v = (y + 0.5) / size;
  const s = 1 - 2 * pad;
  const fx = (u - pad) / s;
  const fy = (v - pad) / s;
  if (fy >= SHELF_Y && fy < SHELF_Y + 0.05 && fx > 0.14 && fx < 0.86) return SHELF;
  for (const [x0, w, top, rgb] of SPINES) {
    if (fx >= x0 && fx < x0 + w && fy >= top && fy < SHELF_Y) {
      const band = fy > top + 0.06 && fy < top + 0.075;
      return band ? BAND : rgb;
    }
  }
  return CLOTH;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function png(size, pad = 0) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size, pad);
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head.set([8, 2, 0, 0, 0], 8);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", head), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "icon-192.png"), png(192));
  writeFileSync(join(out, "icon-512.png"), png(512));
  writeFileSync(join(out, "maskable-512.png"), png(512, 0.1));
  writeFileSync(join(out, "apple-touch-icon.png"), png(180, 0.04));
  console.log(`icons written to ${out}`);
}
