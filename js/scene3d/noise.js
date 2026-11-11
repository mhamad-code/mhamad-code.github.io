// Seeded value noise (no libraries, same result on every device).
export function makeNoise(seed = 7) {
    const hash = (x, y) => {
        let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const noise = (x, y) => {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = smooth(x - ix), fy = smooth(y - iy);
        const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;      // 0..1
    };
    const fbm = (x, y, oct = 4) => {
        let sum = 0, amp = 0.5, norm = 0;
        for (let i = 0; i < oct; i++) { sum += noise(x, y) * amp; norm += amp; x *= 2.03; y *= 2.03; amp *= 0.5; }
        return sum / norm;                                                      // 0..1
    };
    const ridged = (x, y, oct = 4) => {
        let sum = 0, amp = 0.5, norm = 0;
        for (let i = 0; i < oct; i++) { sum += (1 - Math.abs(noise(x, y) * 2 - 1)) * amp; norm += amp; x *= 2.1; y *= 2.1; amp *= 0.5; }
        return sum / norm;                                                      // 0..1, sharp crests
    };
    return { noise, fbm, ridged };
}
