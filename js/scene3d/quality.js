// ==========================================================
// How much detail this device can afford (pure, no Three.js).
// ==========================================================
export function pickQuality({ cores = 4, memory = 4, dpr = 1, width = 1280, saveData = false, coarse = false, reducedMotion = false } = {}) {
    let score = 0;
    score += cores >= 8 ? 2 : cores >= 4 ? 1 : 0;
    score += memory >= 8 ? 2 : memory >= 4 ? 1 : 0;
    score += width >= 1000 ? 1 : 0;
    score -= coarse ? 1 : 0;
    const tier = saveData || score <= 1 ? "low" : score <= 3 ? "medium" : "high";

    const table = {
        low:    { cap: 1,   terrain: [64, 44],  trees: 170, particles: 40,  stars: 120, mist: 2, fps: 30 },
        medium: { cap: 1.5, terrain: [100, 70], trees: 380, particles: 110, stars: 220, mist: 3, fps: 60 },
        high:   { cap: 2,   terrain: [140, 100], trees: 650, particles: 220, stars: 360, mist: 4, fps: 60 }
    }[tier];

    return { tier, ...table, pixelRatio: Math.min(dpr, table.cap), antialias: tier === "high", animate: !reducedMotion };
}
