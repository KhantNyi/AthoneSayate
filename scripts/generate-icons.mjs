// Generates the PWA/app icons procedurally (no image deps).
// Run from repo root: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SS = 4; // supersampling factor for anti-aliasing

// Palette pulled from app/globals.css dark theme tokens
const BG_TOP = [16, 26, 58];
const BG_BOTTOM = [9, 13, 26]; // --paper (dark)
const GLOW = [96, 148, 255]; // --river (dark)
const BARS = [
  [96, 148, 255], // river
  [62, 200, 116], // moss
  [245, 173, 46] // amber
];

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
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

function encodePng(pixels, width, height) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function insideRoundedRect(u, v, x0, y0, x1, y1, r) {
  const cx = Math.min(Math.max(u, x0 + r), x1 - r);
  const cy = Math.min(Math.max(v, y0 + r), y1 - r);
  const dx = u - cx;
  const dy = v - cy;
  return dx * dx + dy * dy <= r * r;
}

// Bars in unit coordinates: [centerX, topY]; shared width and baseline
const BAR_W = 0.16;
const BAR_GAP = 0.07;
const BASELINE = 0.74;
const BAR_TOPS = [0.44, 0.28, 0.36];

function renderIcon(size, { contentScale = 1 } = {}) {
  const w = size * SS;
  const pixels = Buffer.alloc(size * size * 4);
  const scaled = (p) => 0.5 + (p - 0.5) * contentScale;

  const bars = BAR_TOPS.map((top, i) => {
    const cx = 0.5 + (i - 1) * (BAR_W + BAR_GAP);
    return {
      x0: scaled(cx - BAR_W / 2),
      x1: scaled(cx + BAR_W / 2),
      y0: scaled(top),
      y1: scaled(BASELINE),
      color: BARS[i]
    };
  });

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px * SS + sx + 0.5) / w;
          const v = (py * SS + sy + 0.5) / w;
          // vertical background gradient
          let cr = BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * v;
          let cg = BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * v;
          let cb = BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * v;
          // soft radial glow behind the bars
          const gd = Math.hypot(u - 0.5, v - 0.34);
          const ga = Math.max(0, 1 - gd / 0.8) ** 2 * 0.24;
          cr += (GLOW[0] - cr) * ga;
          cg += (GLOW[1] - cg) * ga;
          cb += (GLOW[2] - cb) * ga;
          for (const bar of bars) {
            const radius = (bar.x1 - bar.x0) / 2;
            if (insideRoundedRect(u, v, bar.x0, bar.y0, bar.x1, bar.y1, radius)) {
              [cr, cg, cb] = bar.color;
              break;
            }
          }
          r += cr;
          g += cg;
          b += cb;
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * 4;
      pixels[o] = Math.round(r / n);
      pixels[o + 1] = Math.round(g / n);
      pixels[o + 2] = Math.round(b / n);
      pixels[o + 3] = 255;
    }
  }
  return encodePng(pixels, size, size);
}

const outputs = [
  ["apps/web/public/icons/icon-192.png", 192, {}],
  ["apps/web/public/icons/icon-512.png", 512, {}],
  ["apps/web/public/icons/icon-maskable-512.png", 512, { contentScale: 0.72 }],
  ["apps/web/app/apple-icon.png", 180, {}],
  ["apps/web/app/icon.png", 64, {}]
];

for (const [rel, size, opts] of outputs) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderIcon(size, opts));
  console.log(`wrote ${rel} (${size}x${size})`);
}
