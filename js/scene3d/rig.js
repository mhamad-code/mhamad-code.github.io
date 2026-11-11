// ==========================================================
// Camera path and motion (pure math, no Three.js).
// Each section of the site has a waypoint; scrolling flies the camera
// along a smooth curve through the waypoints of the sections that exist.
// ==========================================================
export const WAYPOINTS = {
    hero:     { pos: [0, 11, 70],   look: [0, 24, -40] },
    about:    { pos: [-12, 7, 46],  look: [8, 11, -22] },
    skills:   { pos: [10, 6.5, 32], look: [20, 10, -30] },
    services: { pos: [22, 8, 16],   look: [-4, 15, -60] },
    projects: { pos: [18, 28, 30],  look: [2, 20, -90] },
    reviews:  { pos: [-16, 9, 8],   look: [4, 15, -60] },
    faq:      { pos: [-6, 7, 22],   look: [10, 13, -40] },
    contact:  { pos: [-10, 6.5, 38], look: [8, 17, -30] }
};
export const ORDER = ["hero", "about", "skills", "services", "projects", "reviews", "faq", "contact"];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Frame-rate independent smoothing
export const damp = (current, target, lambda, dt) => target + (current - target) * Math.exp(-lambda * dt);

function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// Point on the curve through `points` ([[x,y,z], ...]) at u in [0, points.length - 1]
export function sample(points, u) {
    const n = points.length;
    if (n === 1) return points[0].slice();
    u = clamp(u, 0, n - 1);
    const i = Math.min(n - 2, Math.floor(u));
    const f = u - i;
    const p = (k) => points[clamp(k, 0, n - 1)];
    return [0, 1, 2].map((a) => catmull(p(i - 1)[a], p(i)[a], p(i + 1)[a], p(i + 2)[a], f));
}

// Where we are along the sections: anchors = [{ id, y }] sorted by page position.
// `y` is the page position that should show the section (usually its centre).
export function progress(anchors, viewY) {
    if (!anchors.length) return 0;
    if (viewY <= anchors[0].y) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i].y, b = anchors[i + 1].y;
        if (viewY <= b) return i + (b === a ? 0 : (viewY - a) / (b - a));
    }
    return anchors.length - 1;
}

export const fovFor = (aspect) => (aspect >= 1 ? 50 : Math.min(80, 50 + (1 / aspect - 1) * 22));

export function createRig({ animate = true } = {}) {
    let ids = ["hero", "contact"];
    let anchors = [{ id: "hero", y: 0 }, { id: "contact", y: 1 }];
    let u = 0, px = 0, py = 0, tx = 0, ty = 0, lastInput = -1e9;

    return {
        // list = [{ id, y }] for the sections found on this page, or [] to spread two waypoints over the page
        setAnchors(list, maxScroll) {
            const known = list.filter((a) => WAYPOINTS[a.id]).sort((a, b) => a.y - b.y);
            if (known.length >= 2) { anchors = known; ids = known.map((a) => a.id); }
            else { ids = ["hero", "contact"]; anchors = [{ id: "hero", y: 0 }, { id: "contact", y: Math.max(1, maxScroll) }]; }
        },
        // x, y in -1..1 (mouse position, finger or device tilt)
        look(x, y, now) { tx = clamp(x, -1, 1); ty = clamp(y, -1, 1); lastInput = now; },
        update({ viewY, dt, now }) {
            const goal = progress(anchors, viewY);
            u = animate ? damp(u, goal, 3.4, dt) : goal;
            if (now - lastInput > 2500) { tx = 0; ty = 0; }                       // drift back to the calm view
            px = animate ? damp(px, tx, 3, dt) : tx;
            py = animate ? damp(py, ty, 3, dt) : ty;

            const pos = sample(ids.map((id) => WAYPOINTS[id].pos), u);
            const look = sample(ids.map((id) => WAYPOINTS[id].look), u);
            const sway = animate ? Math.sin(now / 1000 * 0.18) * 0.35 : 0;       // slow breathing
            pos[0] += px * 3.2 + sway;
            pos[1] += -py * 1.4;
            look[0] += px * 6;
            look[1] += -py * 2.5;
            return { pos, look, u };
        }
    };
}
