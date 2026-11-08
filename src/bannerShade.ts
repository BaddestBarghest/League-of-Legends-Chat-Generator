// The last pass on the Victory/Defeat letters, pixel by pixel. It adds what
// gradients alone can't: a bright rim on every edge with a faint groove inside
// it, light from above, horizontal brush streaks and a lift on the brightest
// spots. The numbers were fitted against Riot's own word art.

export interface Finish {
  rim: number; // brightness added on the outermost pixel
  groove: number; // darkening just inside the rim
  grooveAt: number; // how far in the groove sits, in pixels at 1x
  light: number; // brightening on edges that face up, darkening on ones that face down
  lightReach: number; // how far in the light reaches
  streak: number; // strength of the brush streaks
  streakRows: number; // rows per streak
  streakLen: number; // length of a streak wiggle
  lift: number; // extra brightness on highlights
  liftSat: number; // extra color on highlights
  liftFrom: number; // brightness where the lift starts, 0 to 1
}

export const FINISH: Finish = {
  rim: 0.15,
  groove: 0.016,
  grooveAt: 0.65,
  light: 0.112,
  lightReach: 3.7,
  streak: 0.061,
  streakRows: 1,
  streakLen: 9.5,
  lift: 0.015,
  liftSat: 0.075,
  liftFrom: 0.75,
};

// Squared distance along one row or column (Felzenszwalb and Huttenlocher).
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}

// How far each letter pixel is from the outside, in pixels.
function distanceInside(alpha: Uint8Array, w: number, h: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = alpha[i] > 127 ? 1e10 : 0;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]);
  }
  // Soft edge pixels sit part of a pixel in.
  for (let i = 0; i < w * h; i++) if (alpha[i] > 0 && alpha[i] <= 127) g[i] = alpha[i] / 255;
  return g;
}

// Repeatable noise, so the same text always comes out the same.
function hash(n: number): number {
  n = n ^ 61 ^ (n >>> 16);
  n = n + (n << 3);
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

function wave(x: number, row: number, len: number): number {
  const p = x / len;
  const i = Math.floor(p);
  const t = p - i;
  const s = t * t * (3 - 2 * t);
  const a = hash(row * 7919 + i);
  const b = hash(row * 7919 + i + 1);
  return (a + (b - a) * s) * 2 - 1;
}

// px is how many canvas pixels make one pixel of the game's art.
export function finishLetters(img: ImageData, f: Finish, px: number): void {
  const { width: w, height: h, data } = img;
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];
  const dist = distanceInside(alpha, w, h);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]);
  const band = Math.max(1, Math.round(f.streakRows * px));

  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / band);
    const rt = (y % band) / band;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!alpha[i]) continue;
      const d = dist[i] / px;
      // The distance grows downward under an edge that faces up.
      const gx = at(x + 1, y) - at(x - 1, y);
      const gy = at(x, y + 1) - at(x, y - 1);
      const up = gy / (Math.hypot(gx, gy) || 1);
      const sx = x / px;
      let k = 1;
      k += f.rim * Math.exp(-((d - 0.5) ** 2) / 0.35);
      k -= f.groove * Math.exp(-((d - f.grooveAt) ** 2) / 0.6);
      k += f.light * up * Math.exp(-d / f.lightReach);
      k += f.streak * (wave(sx, row, f.streakLen) * (1 - rt) + wave(sx, row + 1, f.streakLen) * rt);

      const j = i * 4;
      let r = data[j] * k;
      let g = data[j + 1] * k;
      let b = data[j + 2] * k;
      const top = Math.min(255, Math.max(r, g, b)) / 255;
      if (top > f.liftFrom) {
        const t = (top - f.liftFrom) / (1 - f.liftFrom);
        const mean = (r + g + b) / 3;
        const sat = 1 + f.liftSat * t;
        const lift = 1 + f.lift * t;
        r = (mean + (r - mean) * sat) * lift;
        g = (mean + (g - mean) * sat) * lift;
        b = (mean + (b - mean) * sat) * lift;
      }
      data[j] = r;
      data[j + 1] = g;
      data[j + 2] = b;
    }
  }
}
