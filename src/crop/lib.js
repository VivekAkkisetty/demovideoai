// shared easing / path helpers
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const smooth = u => u * u * (3 - 2 * u);
export const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
export const easeOutBack = u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const lerp = (a, b, u) => a + (b - a) * u;

// Hermite path through [t, ...values] keys; zero tangent at holds/ends.
export function makePath(keys, dims) {
  const n = keys.length;
  const tan = keys.map((k, i) => {
    const m = new Array(dims).fill(0);
    if (i === 0 || i === n - 1) return m;
    const p = keys[i - 1], q = keys[i + 1];
    let hold = true;
    for (let d = 0; d < dims; d++) if (k[1 + d] !== p[1 + d] && k[1 + d] !== q[1 + d]) hold = false;
    const same = (a, b) => { for (let d = 0; d < dims; d++) if (a[1 + d] !== b[1 + d]) return false; return true; };
    if (same(k, p) || same(k, q)) return m;
    for (let d = 0; d < dims; d++) m[d] = (q[1 + d] - p[1 + d]) / (q[0] - p[0]);
    return m;
  });
  return t => {
    if (t <= keys[0][0]) return keys[0].slice(1);
    if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 0; while (keys[i + 1][0] < t) i++;
    const a = keys[i], b = keys[i + 1], h = b[0] - a[0], s = (t - a[0]) / h;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    const out = [];
    for (let d = 0; d < dims; d++) out.push(h00 * a[1 + d] + h10 * h * tan[i][d] + h01 * b[1 + d] + h11 * h * tan[i + 1][d]);
    return out;
  };
}

