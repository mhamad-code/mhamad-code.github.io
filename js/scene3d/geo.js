// ==========================================================
// Geometry as plain arrays (no Three.js), so it can be tested anywhere.
// Triangles are not indexed and wound counter-clockwise seen from outside.
// ==========================================================
const LIGHT = (() => { const v = [-0.45, 0.8, 0.4]; const l = Math.hypot(...v); return v.map((c) => c / l); })();

const quad = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];

export function box(w, h, d) {
    const x0 = -w / 2, x1 = w / 2, y0 = 0, y1 = h, z0 = -d / 2, z1 = d / 2;
    return Float32Array.from([
        ...quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]),
        ...quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]),
        ...quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]),
        ...quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]),
        ...quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]),
        ...quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1])
    ]);
}

// Cone with its base centre at height y0
export function cone(r, h, seg, y0 = 0) {
    const out = [];
    const apex = [0, y0 + h, 0], c = [0, y0, 0];
    for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const b0 = [r * Math.cos(a0), y0, r * Math.sin(a0)], b1 = [r * Math.cos(a1), y0, r * Math.sin(a1)];
        out.push(...b0, ...apex, ...b1, ...c, ...b0, ...b1);
    }
    return Float32Array.from(out);
}

// Gable roof: width w at the eaves, height h, length l (along z)
export function prism(w, h, l) {
    const lf = [-w / 2, 0, l / 2], rf = [w / 2, 0, l / 2], af = [0, h, l / 2];
    const lb = [-w / 2, 0, -l / 2], rb = [w / 2, 0, -l / 2], ab = [0, h, -l / 2];
    return Float32Array.from([...lf, ...rf, ...af, ...rb, ...lb, ...ab, ...quad(lf, af, ab, lb), ...quad(rb, ab, af, rf)]);
}

// Vertical rectangle facing +z (returns positions and uvs)
export function plane(w, h) {
    const a = [-w / 2, -h / 2, 0], b = [w / 2, -h / 2, 0], c = [w / 2, h / 2, 0], d = [-w / 2, h / 2, 0];
    const t = (p, q, r) => [...p, ...q, ...r];
    return {
        position: Float32Array.from([...t(a, b, c), ...t(a, c, d)]),
        uv: Float32Array.from([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])
    };
}

export function circle(r, seg = 32) {
    const out = [];
    for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        out.push(0, 0, 0, r * Math.cos(a0), r * Math.sin(a0), 0, r * Math.cos(a1), r * Math.sin(a1), 0);
    }
    return Float32Array.from(out);
}

// Dome used for the sky (draw it double-sided)
export function sphere(r, lat = 12, lon = 20) {
    const p = (i, j) => {
        const v = (i / lat) * Math.PI, u = (j / lon) * Math.PI * 2;
        return [r * Math.sin(v) * Math.cos(u), r * Math.cos(v), r * Math.sin(v) * Math.sin(u)];
    };
    const out = [];
    for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) out.push(...quad(p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)));
    return Float32Array.from(out);
}

export function merge(parts) {
    const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}

export function translate(pos, x, y, z) {
    const out = new Float32Array(pos);
    for (let i = 0; i < out.length; i += 3) { out[i] += x; out[i + 1] += y; out[i + 2] += z; }
    return out;
}

// Flat per-face colors: colorAt(x, y, z) is the base color, each face is lit by the moon
export function shadeFaces(pos, colorAt) {
    const out = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 9) {
        const [ax, ay, az, bx, by, bz, cx, cy, cz] = [pos[i], pos[i + 1], pos[i + 2], pos[i + 3], pos[i + 4], pos[i + 5], pos[i + 6], pos[i + 7], pos[i + 8]];
        let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
        let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        const len = Math.hypot(nx, ny, nz) || 1;
        const shade = 0.72 + 0.28 * Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / len);
        const col = colorAt((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3);
        for (let k = 0; k < 3; k++) {
            out[i + k * 3] = col[0] * shade; out[i + k * 3 + 1] = col[1] * shade; out[i + k * 3 + 2] = col[2] * shade;
        }
    }
    return out;
}

// The ground: a grid of [sx x sz] cells over bounds {xMin,xMax,zMin,zMax}
export function terrain(heightAt, [sx, sz], b) {
    const gx = sx + 1, gz = sz + 1;
    const xs = Array.from({ length: gx }, (_, i) => b.xMin + ((b.xMax - b.xMin) * i) / sx);
    const zs = Array.from({ length: gz }, (_, j) => b.zMin + ((b.zMax - b.zMin) * j) / sz);
    const h = new Float32Array(gx * gz);
    for (let j = 0; j < gz; j++) for (let i = 0; i < gx; i++) h[j * gx + i] = heightAt(xs[i], zs[j]);
    const P = (i, j) => [xs[i], h[j * gx + i], zs[j]];
    const out = new Float32Array(sx * sz * 18);
    let o = 0;
    for (let j = 0; j < sz; j++) for (let i = 0; i < sx; i++) {
        const p00 = P(i, j), p10 = P(i + 1, j), p01 = P(i, j + 1), p11 = P(i + 1, j + 1);
        for (const v of [...p00, ...p01, ...p10, ...p10, ...p01, ...p11]) out[o++] = v;
    }
    return out;
}

// Horizontal rectangle facing up, centred, half sizes w and d
export function floor(w, d) {
    const a = [-w, 0, -d], b = [-w, 0, d], c = [w, 0, d], e = [w, 0, -d];
    return Float32Array.from([...a, ...b, ...c, ...a, ...c, ...e]);
}

export function rotateY(pos, angle) {
    const out = new Float32Array(pos), s = Math.sin(angle), c = Math.cos(angle);
    for (let i = 0; i < out.length; i += 3) { const x = out[i], z = out[i + 2]; out[i] = x * c + z * s; out[i + 2] = -x * s + z * c; }
    return out;
}
