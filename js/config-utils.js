// ==========================================================
// Pure helpers (no DOM, no Firebase) shared by the site and the admin panel.
// ==========================================================

/* ---------- Safe values coming from the database ---------- */

const ICON_RE = /^fa-(solid|regular|brands) fa-[a-z0-9-]+$/;

export const isIconClass = (value) => ICON_RE.test(String(value || "").trim());

export const safeIcon = (value, fallback = "fa-solid fa-circle") =>
    isIconClass(value) ? String(value).trim() : fallback;

// Only http(s) links and files inside the site (assets/...) are allowed
export function safeUrl(value) {
    const s = String(value || "").trim();
    return /^(https?:\/\/[^\s"'<>]+|assets\/[^\s"'<>]+)$/i.test(s) ? s : null;
}

const USER_RE = /^[A-Za-z0-9_.-]{1,40}$/;

// Turns usernames / numbers into links. Invalid values are left out.
export function socialUrls(social = {}) {
    const out = {};
    const clean = (v) => String(v || "").trim().replace(/^@/, "");
    if (USER_RE.test(clean(social.github))) out.github = `https://github.com/${clean(social.github)}`;
    if (USER_RE.test(clean(social.telegram))) out.telegram = `https://t.me/${clean(social.telegram)}`;
    if (USER_RE.test(clean(social.instagram))) out.instagram = `https://instagram.com/${clean(social.instagram)}`;
    const wa = String(social.whatsapp || "").replace(/\D/g, "");
    if (/^\d{6,15}$/.test(wa)) out.whatsapp = `https://wa.me/${wa}`;
    const mail = String(social.email || "").trim();
    if (/^[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+$/.test(mail)) out.email = `mailto:${mail}`;
    return out;
}

/* ---------- Posts ---------- */

export function slugify(text) {
    return String(text)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

export const isSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 60;

/* ---------- Objects ---------- */

export function getPath(obj, path) {
    return path.split(".").reduce((o, key) => (o == null ? undefined : o[key]), obj);
}

// Objects are merged, everything else (arrays included) is replaced
export function deepMerge(a, b) {
    const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
    if (!isObj(a) || !isObj(b)) return b;
    const out = { ...a };
    for (const key of Object.keys(b)) out[key] = key in a ? deepMerge(a[key], b[key]) : b[key];
    return out;
}

/* ---------- Visitor statistics ---------- */

export function dayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Name used to count a page: "index", "blog", "post-my-slug" ...
export function pageName(pathname, search = "") {
    const file = pathname.split("/").pop().replace(/\.html$/, "") || "index";
    if (file === "post") {
        const slug = (new URLSearchParams(search).get("slug") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
        return slug ? `post-${slug.slice(0, 60)}` : "post";
    }
    return file.replace(/[^a-z0-9_-]/gi, "-").slice(0, 40) || "index";
}

const PAGE_LABELS = { index: "Home", projects: "Projects", blog: "Blog", tools: "Tools", settings: "Settings", post: "Post" };

export function pageLabel(name) {
    if (name.startsWith("post-")) return `Post: ${name.slice(5)}`;
    return PAGE_LABELS[name] || name;
}

// rows: [{ day: "2026-11-05", visits, unique, pages: { index: 3 } }]
export function summarizeStats(rows, now = new Date()) {
    const byDay = new Map(rows.map((r) => [r.day, r]));
    const keys = [];
    for (let i = 29; i >= 0; i--) {
        keys.push(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
    }
    const sum = (list) => list.reduce((acc, k) => {
        const r = byDay.get(k);
        return r ? { visits: acc.visits + (r.visits || 0), unique: acc.unique + (r.unique || 0) } : acc;
    }, { visits: 0, unique: 0 });

    const pages = new Map();
    keys.forEach((k) => {
        const r = byDay.get(k);
        if (r && r.pages) for (const [name, n] of Object.entries(r.pages)) pages.set(name, (pages.get(name) || 0) + n);
    });

    return {
        today: sum(keys.slice(-1)),
        last7: sum(keys.slice(-7)),
        last30: sum(keys),
        chart: keys.slice(-14).map((k) => ({ day: k, visits: (byDay.get(k) || {}).visits || 0 })),
        topPages: [...pages].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))
    };
}
