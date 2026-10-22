// PWA用アイコン(PNG)を外部ライブラリなしで描く。クリーム色に、青と赤の吹き出し(会話)。
// 出力: app/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const BG = hex('#fdf8f1'), BLUE = hex('#1f5fae'), RED = hex('#d23c4a'), WHITE = hex('#ffffff');
// 楕円の吹き出し+小さな三角のしっぽ
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
const inTri = (x, y, a, b, c) => { const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]); const d1 = s([x, y], a, b), d2 = s([x, y], b, c), d3 = s([x, y], c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };

function draw(size, pad) {
  const S = 4, px = Buffer.alloc(size * size * 4);
  const u = v => v * (1 - 2 * pad) + pad, sc = 1 - 2 * pad;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const acc = [0, 0, 0];
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const fx = (x + (sx + 0.5) / S) / size, fy = (y + (sy + 0.5) / S) / size;
      let col = BG;
      // 青い吹き出し(左上)
      if (inEll(fx, fy, u(0.40), u(0.38), 0.30 * sc, 0.22 * sc) || inTri(fx, fy, [u(0.24), u(0.52)], [u(0.36), u(0.56)], [u(0.16), u(0.70)])) col = BLUE;
      // 点3つ(話している)
      [0.30, 0.40, 0.50].forEach(cx => { if (inEll(fx, fy, u(cx), u(0.38), 0.035 * sc, 0.035 * sc)) col = WHITE; });
      // 赤い吹き出し(右下)
      if (inEll(fx, fy, u(0.62), u(0.66), 0.26 * sc, 0.19 * sc) || inTri(fx, fy, [u(0.74), u(0.78)], [u(0.66), u(0.82)], [u(0.84), u(0.94)])) col = RED;
      if (inEll(fx, fy, u(0.62), u(0.66), 0.10 * sc, 0.035 * sc)) col = WHITE;
      acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2];
    }
    const i = (y * size + x) * 4;
    px[i] = acc[0] / 16; px[i + 1] = acc[1] / 16; px[i + 2] = acc[2] / 16; px[i + 3] = 255;
  }
  return png(size, size, px);
}
const out = path.join(__dirname, '../app/icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), draw(192, 0.03));
fs.writeFileSync(path.join(out, 'icon-512.png'), draw(512, 0.03));
fs.writeFileSync(path.join(out, 'maskable-512.png'), draw(512, 0.14));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), draw(180, 0.05));
console.log('icons written');
