// ==========================================================
// The landscape as pure math: heights, colors and where trees grow.
// World units: x right, y up, z toward the camera (the view looks toward -z).
// ==========================================================
import { makeNoise } from "./noise.js";

const N = makeNoise(11);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export const WORLD = { xMin: -200, xMax: 200, zMin: -250, zMax: 90 };
export const LAKE = { x: 24, z: 14, rx: 38, rz: 22, level: 0.2 };
export const CABIN = { x: -17, z: 29 };
export const MOON = { x: -10, y: 110, z: -235 };

const cone = (x, z, cx, cz, r, h) => h * Math.pow(Math.max(0, 1 - Math.hypot(x - cx, z - cz) / r), 1.5);

function rawHeight(x, z) {
    // Valley floor with soft rolling meadows
    let h = (N.fbm(x * 0.03, z * 0.03, 3) - 0.5) * 3.2;

    // Mountains: wide jagged ranges toward the back, with a few big named peaks
    const back = smoothstep(-25, -150, z);
    const crest = N.ridged(x * 0.012 + 4, z * 0.02 + 9, 4);
    h += back * (12 + 46 * crest * crest) * (0.65 + 0.35 * N.fbm(x * 0.008, z * 0.01, 2));
    h += cone(x, z, -42, -52, 70, 54) + cone(x, z, 38, -105, 105, 62) + cone(x, z, 118, -80, 80, 44) + cone(x, z, -125, -110, 95, 48);

    // Big dark slopes in front, left and right, leaving the centre open
    h += smoothstep(16, 62, x) * smoothstep(-10, 48, z) * 26;
    h += smoothstep(-34, -70, x) * smoothstep(8, 52, z) * 16;

    // Hill with the cabin on the left, then the lake basin
    h += cone(x, z, CABIN.x - 6, CABIN.z + 4, 40, 7);
    const d = Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
    h -= 4.2 * smoothstep(1.05, 0.15, d);

    // A flat clearing for the cabin
    const flat = smoothstep(11, 5, Math.hypot(x - CABIN.x, z - CABIN.z));
    return mix(h, 5.2, flat);
}

export const heightAt = (x, z) => rawHeight(x, z);

// How "foreground-slope" a spot is (0..1): used to darken the big front hills
export const frontSlope = (x, z) =>
    clamp(smoothstep(16, 62, x) * smoothstep(-10, 48, z) + smoothstep(-34, -70, x) * smoothstep(8, 52, z), 0, 1);

const C = {
    meadow: [0.23, 0.55, 0.96], purple: [0.25, 0.17, 0.62], high: [0.34, 0.31, 0.86], dark: [0.15, 0.1, 0.42]
};
const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// Color of the ground at a point (flat, vector-art palette from the original picture)
export function groundColor(x, z, h) {
    let c = lerp3(C.purple, C.high, smoothstep(6, 40, h));
    c = lerp3(c, C.meadow, smoothstep(5.5, 2.2, h) * smoothstep(-20, 20, z) * (1 - frontSlope(x, z)));
    return lerp3(c, C.dark, frontSlope(x, z) * 0.85);
}

// Deterministic random numbers
export function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Where pine trees grow: { x, z, y, s } in three depth bands
export function placeTrees(count, seed = 5) {
    const rand = rng(seed);
    const out = [];
    const bands = [
        { share: 0.2, x: [-120, 120], z: [22, 70], s: [1.8, 2.7], minY: 2, side: true },     // big foreground trees on the slopes
        { share: 0.3, x: [-110, 110], z: [-45, 25], s: [0.8, 1.35], minY: -1, side: false },  // middle forest
        { share: 0.5, x: [-170, 170], z: [-120, -45], s: [0.55, 1.0], minY: 0, side: false }  // small far trees
    ];
    for (const band of bands) {
        const target = Math.round(count * band.share);
        let tries = 0, made = 0;
        while (made < target && tries++ < target * 40) {
            const x = mix(band.x[0], band.x[1], rand()), z = mix(band.z[0], band.z[1], rand());
            const y = heightAt(x, z);
            const lake = Math.hypot((x - LAKE.x) / (LAKE.rx + 4), (z - LAKE.z) / (LAKE.rz + 3));
            if (y < band.minY || lake < 1) continue;
            if (Math.hypot(x - CABIN.x, z - CABIN.z) < 10) continue;
            if (band.side && Math.abs(x) < 22) continue;                       // keep the middle open
            if (!band.side && y > 30) continue;                                 // no trees on high peaks
            const clump = N.fbm(x * 0.05 + 20, z * 0.05, 2);
            if (rand() > 0.25 + clump * 1.1) continue;                           // trees come in groves
            out.push({ x, z, y, s: mix(band.s[0], band.s[1], rand()), r: rand() * 6.283 });
            made++;
        }
    }
    return out;
}
