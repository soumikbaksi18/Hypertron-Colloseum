import { useEffect, useRef } from "react";

/** Glyph atlas, left to right. Space is unused. */
const GLYPHS = " .:-+01ABCDEFGHKLMNOPRSTUVWXYZ#@%*";
const OCEAN = [1, 2, 3, 4];
const LAND = [5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 31, 32];

const MASK_W = 720;
const MASK_H = 360;
const CELL_W = 8;
const CELL_H = 11;
const ATLAS = 8;

const TILT = (14 * Math.PI) / 180;
const BASE_LON = (42 * Math.PI) / 180;
const SPIN = 0.000055;

const PURPLE = { lat: (6 * Math.PI) / 180, lon: (18 * Math.PI) / 180, sigma: 0.42 };
const GOLD = { lat: (-25 * Math.PI) / 180, lon: (133 * Math.PI) / 180, sigma: 0.28 };

type Star = { x: number; y: number; s: number; p: number; big: boolean };

function mix(n: number) {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function ring(pts: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i += 2) out.push([pts[i], pts[i + 1]]);
  return out;
}

const RINGS: Array<Array<[number, number]>> = [
  ring([
    -117.2, 32.6, -121.8, 36.6, -124.2, 43, -124.5, 48.4, -127, 50.5, -133, 54.4,
    -138, 58.5, -146, 60, -153, 57.5, -160, 55.5, -165.5, 60, -166.5, 64.5, -163, 66.5,
    -167, 68.5, -166, 71, -156, 71.4, -140, 69.5, -120, 73, -100, 74, -85, 73.5, -72, 69,
    -64.5, 66.5, -62, 58.5, -56, 52, -56, 47, -61, 46, -64.5, 44, -70, 43.6, -70.2, 41.8,
    -74, 40.5, -75, 36.8, -76, 34.8, -81, 31.4, -80.2, 25.4, -81.8, 26, -82.4, 27.8,
    -84.8, 29.7, -87.6, 30.4, -90, 29.1, -94, 29.6, -97, 26, -97.4, 22.2, -96.5, 18.5,
    -94.5, 16.2, -91, 14.5, -87.5, 13.5, -84, 10, -81, 8.2, -77.2, 7.4, -80, 8.5, -83, 9.5,
    -85, 11, -87, 13.4, -90.5, 14, -92.5, 14.8, -96, 16, -99, 16.5, -104.5, 19, -105.5, 21.5,
    -109.8, 23, -112.5, 25.5, -114.5, 27.8, -115.2, 31, -117.2, 32.6,
  ]),
  ring([
    -77, 7.5, -75, 8.5, -71.5, 12.2, -67, 10.5, -62, 8.5, -60, 8.2, -54, 5.5, -51, 4.2,
    -48.5, 0, -44, -2.5, -38, -4, -35, -6.5, -34.8, -8, -38.5, -13, -39, -16.5, -40.5, -20.5,
    -43, -23, -48, -28, -49.5, -30, -52, -33, -55, -35, -58, -38, -62.5, -40, -65.5, -43.5,
    -68, -47, -71.5, -52, -74.5, -51.5, -74, -46, -73, -42, -72, -36, -71.5, -30, -71.5, -22,
    -70.5, -18, -75, -14.5, -77, -8, -79.5, -3, -80, 0.5, -78.5, 2.5, -77.5, 6.5, -77, 7.5,
  ]),
  ring([
    -73, 78, -68, 76, -60, 81, -48, 82, -28, 80, -20, 74, -22, 70, -32, 68, -44, 60, -48, 61,
    -55, 66, -62, 66, -68, 70, -73, 76,
  ]),
  ring([-24, 65, -22, 64, -14, 64, -13.5, 65.5, -16, 66.5, -22, 66.5]),
  ring([
    -9.5, 37, -9, 42, -8.8, 43.5, -2, 43.4, 3.2, 42.3, 3, 41.5, -0.2, 38.8, -5.5, 36, -7.5, 37,
  ]),
  ring([
    -4.8, 48.2, -2, 48.6, 1.5, 51, 4.5, 52.2, 7, 53.5, 8.5, 55, 8, 57.5, 10.5, 59, 5.5, 62, 7, 63,
    12, 66, 16, 69, 24, 71, 30, 70, 32, 67, 40, 67, 48, 68.5, 58, 68, 60, 60, 58, 56, 50, 50, 40,
    47.5, 32, 46.5, 29, 45.5, 24, 45, 20, 42, 16, 41, 12.5, 42, 10, 43.5, 7.5, 43.6, 4.5, 43.3, 3,
    46, 1, 49.5, -1.5, 49.5,
  ]),
  ring([-5.5, 50, -5, 54.5, -3.5, 58.5, -1.5, 58.6, 0.2, 53.5, 1.4, 52.5, 1.2, 51.2, 0.2, 50.6, -2, 50.2]),
  ring([7.5, 44, 9.5, 44.2, 12.5, 42, 15.5, 41, 18, 40.2, 16.5, 39, 15.5, 38, 13.5, 41, 12, 42.5, 10, 43.8]),
  ring([
    -17, 14.5, -16.5, 20.5, -13, 27.5, -9.5, 31.5, -6, 35, -2, 35.2, 3, 36.8, 9.5, 37, 10.5, 33.5,
    10, 30.5, 20, 32.5, 25, 31.5, 32.5, 31.2, 34.5, 28, 36, 22, 39, 18, 43, 12.5, 48, 11.5, 51.2,
    12, 51, 10, 45, 5, 43.5, 2, 42, -2, 41.5, -10, 40.5, -15.5, 35.5, -20, 32.5, -26, 28.5, -32.5,
    25.5, -34, 20, -34.8, 18.5, -32.5, 16.5, -28, 14, -22, 12.5, -17, 13, -10, 12, -6, 10, 1.5, 9,
    4.3, 8.2, 4.5, 9.5, 6.5, 6, 5, 2, 6, -4, 5, -8, 4.5, -12, 7.5, -15, 11,
  ]),
  ring([43.3, -12.2, 44, -16, 47.2, -24.8, 47, -25.2, 44, -25, 43.5, -22, 43.2, -16]),
  ring([
    60, 58, 70, 68, 90, 75, 110, 76, 140, 72, 160, 66, 178, 66, 178, 62, 165, 60, 155, 55, 145, 48,
    142, 46, 135, 43, 132, 43, 130, 34, 127, 35, 122, 38, 120, 39, 122, 32, 121, 29, 118, 24, 110,
    20, 108, 21, 102, 22, 98, 24, 90, 28, 80, 30, 72, 40, 66, 45, 60, 50,
  ]),
  ring([
    68.5, 23.5, 70, 20.5, 72.5, 18, 73, 15, 75, 11, 77.2, 8.2, 78.2, 8.5, 80.2, 13, 80.5, 15.5,
    83, 17.5, 85.5, 20, 87.5, 21.5, 88.5, 22, 87, 25, 83, 26, 78, 26.5, 73, 24, 70, 23,
  ]),
  ring([
    34.6, 28, 35, 24, 36.5, 20, 39, 17, 42.5, 14.5, 46, 13.5, 52, 16.5, 56, 24, 56.5, 26, 52, 27,
    48, 29.5, 44, 30, 40, 31, 35.5, 32,
  ]),
  ring([
    97.5, 16.5, 98.5, 12.5, 100, 8.5, 102, 6, 103.5, 1.5, 104.5, 1.3, 105.5, 4, 109, 10.5, 109.2,
    13.5, 107.5, 16.5, 105, 17.5, 102.5, 18.5, 100, 20,
  ]),
  ring([
    130.5, 31.5, 131, 33.5, 133.5, 34, 136, 35, 138.5, 36.5, 140.5, 36.8, 141, 39, 141.5, 41.5,
    143, 43, 145.5, 43.3, 145, 44, 142, 45.5, 140.5, 42.5, 139.5, 38.5, 137, 35, 133, 33.5, 131,
    32.5,
  ]),
  ring([120.5, 14, 121.5, 13.5, 123.5, 10, 125.5, 8, 126, 8.5, 125, 12, 122.5, 18, 120.8, 18.2]),
  ring([95.2, 5.5, 98, 4, 102, 0, 105.5, -3, 105.8, -5.5, 104.5, -5.8, 102.5, -3.5, 100, -1, 96.5, 2, 95.2, 5]),
  ring([105.5, -6, 108, -6.5, 114, -7.5, 114.5, -8.5, 111, -8.3, 106, -7.2]),
  ring([109.2, 2, 111, 1, 116, 1.5, 119, 5, 118, 7, 117, 7.2, 114, 5, 110.5, 1.5]),
  ring([132, -1, 134, -2.5, 141, -2.8, 147, -6, 150.5, -8.5, 147, -9.5, 141, -8, 134, -6, 131, -2.5]),
  ring([79.7, 8, 81.2, 7, 81.8, 6.2, 81, 6, 80, 6.2]),
  ring([
    113.5, -22, 114, -28, 115, -33.5, 117.5, -35, 124, -33.5, 129, -31.8, 134, -32.5, 137.5, -35.5,
    140, -38, 145, -38.8, 148, -37.5, 150.5, -35, 153.2, -28, 153.5, -25, 150.5, -22, 146, -19,
    142.5, -11, 136.5, -12.2, 132, -12, 127.5, -14, 125, -16, 122, -18, 114.5, -21.5,
  ]),
  ring([172.5, -41, 174.5, -41.5, 176.5, -39, 178, -37.5, 176, -37.8, 174.5, -39, 173, -41]),
  ring([166.5, -46, 168, -46.5, 170.5, -46, 169, -44, 167, -44.5]),
];

function inside(x: number, y: number, poly: Array<[number, number]>) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

let landMask: Uint8Array | null = null;

function getLandMask() {
  if (landMask) return landMask;
  const mask = new Uint8Array(MASK_W * MASK_H);
  for (const poly of RINGS) {
    let minX = 180;
    let maxX = -180;
    let minY = 90;
    let maxY = -90;
    for (const [lon, lat] of poly) {
      if (lon < minX) minX = lon;
      if (lon > maxX) maxX = lon;
      if (lat < minY) minY = lat;
      if (lat > maxY) maxY = lat;
    }
    const x0 = Math.max(0, Math.floor(((minX + 180) / 360) * MASK_W) - 1);
    const x1 = Math.min(MASK_W - 1, Math.ceil(((maxX + 180) / 360) * MASK_W) + 1);
    const y0 = Math.max(0, Math.floor(((90 - maxY) / 180) * MASK_H) - 1);
    const y1 = Math.min(MASK_H - 1, Math.ceil(((90 - minY) / 180) * MASK_H) + 1);
    for (let y = y0; y <= y1; y++) {
      const lat = 90 - ((y + 0.5) / MASK_H) * 180;
      for (let x = x0; x <= x1; x++) {
        const lon = -180 + ((x + 0.5) / MASK_W) * 360;
        if (inside(lon, lat, poly)) mask[y * MASK_W + x] = 1;
      }
    }
  }
  for (let y = 0; y < MASK_H; y++) {
    for (let x = 0; x < MASK_W; x++) {
      const i = y * MASK_W + x;
      if (!mask[i]) continue;
      const left = mask[y * MASK_W + ((x - 1 + MASK_W) % MASK_W)];
      const right = mask[y * MASK_W + ((x + 1) % MASK_W)];
      const up = y > 0 ? mask[i - MASK_W] : 1;
      const down = y < MASK_H - 1 ? mask[i + MASK_W] : 1;
      if (!left || !right || !up || !down) mask[i] = 2;
    }
  }
  landMask = mask;
  return mask;
}

function sample(mask: Uint8Array, lat: number, lon: number) {
  let lonDeg = (lon * 180) / Math.PI;
  const latDeg = (lat * 180) / Math.PI;
  lonDeg = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  const x = Math.min(MASK_W - 1, Math.max(0, Math.floor(((lonDeg + 180) / 360) * MASK_W)));
  const y = Math.floor(((90 - latDeg) / 180) * MASK_H);
  if (y < 0 || y >= MASK_H) return 0;
  return mask[y * MASK_W + x];
}

function glow(lat: number, lon: number, lat0: number, lon0: number, sigma: number) {
  const dLon = Math.atan2(Math.sin(lon - lon0), Math.cos(lon - lon0));
  const dLat = lat - lat0;
  const cosLat = Math.cos((lat + lat0) * 0.5);
  const dist2 = dLat * dLat + dLon * dLon * cosLat * cosLat;
  return Math.exp(-dist2 / (2 * sigma * sigma));
}

function makeStars(count: number): Star[] {
  let s = 0x12345678;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(),
      y: rand(),
      s: 0.35 + rand() * 0.65,
      p: rand() * Math.PI * 2,
      big: rand() > 0.9,
    });
  }
  return stars;
}

const STARS = makeStars(160);

function buildAtlas(cell: number) {
  const canvas = document.createElement("canvas");
  canvas.width = cell * GLYPHS.length;
  canvas.height = cell;
  const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `500 ${Math.max(6, Math.floor(cell * 0.92))}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < GLYPHS.length; i++) {
    const ch = GLYPHS[i];
    if (ch === " ") continue;
    ctx.fillText(ch, i * cell + cell / 2, cell / 2 + cell * 0.06);
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function stamp(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  atlas: Uint8ClampedArray,
  atlasStride: number,
  cell: number,
  glyph: number,
  dx: number,
  dy: number,
  r: number,
  g: number,
  b: number,
  alpha: number,
) {
  const origin = glyph * cell;
  for (let sy = 0; sy < cell; sy++) {
    const py = dy + sy;
    if (py < 0 || py >= height) continue;
    const row = (sy * atlasStride + origin) * 4;
    const dest = py * width;
    for (let sx = 0; sx < cell; sx++) {
      const a0 = atlas[row + sx * 4 + 3];
      if (a0 < 18) continue;
      const px = dx + sx;
      if (px < 0 || px >= width) continue;
      const a = (a0 * alpha) >> 8;
      if (a < 8) continue;
      const i = (dest + px) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
}

export function AsciiGlobe() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mask = getLandMask();
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);
    const pointer = { x: 0 };
    let cancelled = false;
    let raf = 0;
    let atlas: ImageData | null = null;
    let atlasCell = 0;
    let frame: ImageData | null = null;
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;

    function layout() {
      const rect = host!.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      const nextDpr = Math.min(2, window.devicePixelRatio || 1);
      const capped = nextW * nextH * nextDpr * nextDpr > 2_400_000 ? 1 : nextDpr;
      if (nextW === cssW && nextH === cssH && capped === dpr && atlas) return;
      cssW = nextW;
      cssH = nextH;
      dpr = capped;
      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round(cssH * dpr);
      if (canvas!.width !== pxW || canvas!.height !== pxH) {
        canvas!.width = pxW;
        canvas!.height = pxH;
      }
      const cell = Math.max(ATLAS, Math.round(ATLAS * dpr));
      if (!atlas || atlasCell !== cell) {
        atlas = buildAtlas(cell);
        atlasCell = cell;
      }
      frame = ctx!.createImageData(pxW, pxH);
    }

    function draw(now: number) {
      if (!atlas || !frame || cancelled) return;
      const width = canvas!.width;
      const height = canvas!.height;
      frame.data.fill(0);
      const data = frame.data;
      const rotation = BASE_LON + (reduce ? 0 : now * SPIN) + pointer.x;
      const cellW = CELL_W * dpr;
      const cellH = CELL_H * dpr;
      const compact = cssW < 760;
      const cx = cssW * (compact ? 0.7 : 0.6) * dpr;
      const cy = cssH * (compact ? 0.58 : 0.5) * dpr;
      const radius =
        (compact ? Math.min(cssW * 0.5, cssH * 0.4) : Math.min(cssH * 0.5, cssW * 0.36)) * dpr;
      const r2 = radius * radius;
      const tick = reduce ? 0 : Math.floor(now / 180);

      for (let i = 0; i < STARS.length; i++) {
        const star = STARS[i];
        const x = Math.round(star.x * width);
        const y = Math.round(star.y * height);
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < r2 * 0.96) continue;
        const tw = reduce ? 0.8 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.0014 + star.p));
        const a = Math.round(210 * star.s * tw);
        const put = (px: number, py: number, alpha: number) => {
          if (px < 0 || py < 0 || px >= width || py >= height) return;
          const p = (py * width + px) * 4;
          data[p] = 226;
          data[p + 1] = 232;
          data[p + 2] = 244;
          data[p + 3] = alpha;
        };
        put(x, y, a);
        if (star.big) {
          put(x - 1, y, a >> 1);
          put(x + 1, y, a >> 1);
          put(x, y - 1, a >> 1);
          put(x, y + 1, a >> 1);
        }
      }

      const cols = Math.ceil(width / cellW);
      const rows = Math.ceil(height / cellH);
      const halfCell = atlasCell / 2;

      for (let row = 0; row < rows; row++) {
        const py = (row + 0.5) * cellH;
        const dy = py - cy;
        const span2 = r2 - dy * dy;
        if (span2 <= 0) continue;
        const span = Math.sqrt(span2);
        const col0 = Math.max(0, Math.floor((cx - span) / cellW));
        const col1 = Math.min(cols - 1, Math.ceil((cx + span) / cellW));
        for (let col = col0; col <= col1; col++) {
          const px = (col + 0.5) * cellW;
          const dx = px - cx;
          if (dx * dx + dy * dy > r2) continue;
          const nx = dx / radius;
          const ny = -dy / radius;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const y = ny * cosT + nz * sinT;
          const z = -ny * sinT + nz * cosT;
          const lat = Math.asin(Math.max(-1, Math.min(1, y)));
          const lon = Math.atan2(nx, z) + rotation;
          const kind = sample(mask, lat, lon);
          const land = kind > 0;
          const rim = nz < 0.18;

          const ndotl = Math.max(0, nx * 0.35 + ny * 0.22 + nz * 0.91);
          const shade = 0.5 + 0.5 * ndotl * (0.45 + 0.55 * nz);
          const purple = land ? glow(lat, lon, PURPLE.lat, PURPLE.lon, PURPLE.sigma) : 0;
          const gold = land ? glow(lat, lon, GOLD.lat, GOLD.lon, GOLD.sigma) : 0;
          const wP = Math.min(1, purple);
          const wG = Math.min(1, gold);
          const wN = Math.max(0, 1 - wP - wG);
          const sum = wN + wP + wG;
          const baseR = land ? 216 : 150;
          const baseG = land ? 222 : 164;
          const baseB = land ? 236 : 190;
          const r = (baseR * wN + 198 * wP + 255 * wG) / sum;
          const g = (baseG * wN + 168 * wP + 196 * wG) / sum;
          const b = (baseB * wN + 255 * wP + 112 * wG) / sum;
          let alpha = (land ? 188 : 78) * shade;
          if (kind === 2) alpha += 28;
          if (rim) alpha += 24;
          alpha += wP * 70 + wG * 64;
          alpha = Math.max(0, Math.min(255, alpha));
          if (alpha < 14) continue;

          const bucket = tick + (mix(col + row * 13) & 3);
          const pool = land ? LAND : OCEAN;
          const glyph = pool[mix(col * 374761393 + row * 668265263 + bucket) % pool.length];
          stamp(
            data,
            width,
            height,
            atlas.data,
            atlas.width,
            atlasCell,
            glyph,
            Math.round(px - halfCell),
            Math.round(py - halfCell),
            r,
            g,
            b,
            alpha,
          );
        }
      }

      ctx!.putImageData(frame, 0, 0);
      ctx!.globalCompositeOperation = "screen";
      const blooms = [
        { ...PURPLE, color: "rgba(176, 148, 255, 0.45)", radius: radius * 0.46 },
        { ...GOLD, color: "rgba(255, 196, 90, 0.42)", radius: radius * 0.3 },
      ];
      for (const spot of blooms) {
        const x = Math.cos(spot.lat) * Math.sin(spot.lon - rotation);
        const y = Math.sin(spot.lat);
        const z = Math.cos(spot.lat) * Math.cos(spot.lon - rotation);
        const y2 = y * cosT - z * sinT;
        const z2 = y * sinT + z * cosT;
        if (z2 < 0.08) continue;
        const sx = cx + x * radius;
        const sy = cy - y2 * radius;
        const grad = ctx!.createRadialGradient(sx, sy, 0, sx, sy, spot.radius);
        grad.addColorStop(0, spot.color);
        grad.addColorStop(1, "transparent");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(sx, sy, spot.radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = "source-over";
    }

    function loop(now: number) {
      draw(now);
      if (!cancelled && !reduce && !document.hidden) raf = requestAnimationFrame(loop);
    }

    function onMove(event: PointerEvent) {
      pointer.x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 0.16;
    }

    function onVis() {
      if (cancelled || reduce) return;
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      layout();
      if (reduce) draw(0);
    });
    observer.observe(host);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("visibilitychange", onVis);

    void (async () => {
      const size = `${Math.round(ATLAS * dpr)}px`;
      await Promise.race([
        document.fonts.load(`500 ${size} "JetBrains Mono"`),
        new Promise((resolve) => window.setTimeout(resolve, 700)),
      ]);
      if (cancelled) return;
      atlas = null;
      layout();
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
