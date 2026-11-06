// ==========================================================
// Collects everything the assistant knows about the site (fetching
// the live data) and keeps it for a few minutes in this tab.
// ==========================================================
import { getConfig, getPublishedPosts } from "../db.js";
import { GITHUB_USER } from "../config.js";
import { homeChunks, postsToChunks, reposToChunks, staticChunks, buildSitemap } from "./knowledge-core.js";

const CACHE_KEY = "assistant-kb-v1";
const CACHE_MS = 10 * 60 * 1000;
const MAX_POSTS = 40;

async function loadPosts() {
    let files = [];
    try {
        const res = await fetch("posts/index.json");
        if (res.ok) files = await res.json();
    } catch { /* no file posts */ }

    let live = [];
    try { live = await getPublishedPosts(); } catch { /* database unavailable */ }

    const bySlug = new Map(files.map((p) => [p.slug, p]));
    live.forEach((p) => bySlug.set(p.slug, p));   // an admin post replaces a file post with the same slug
    const posts = [...bySlug.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, MAX_POSTS);

    const texts = await Promise.all(posts.map(async (p) => {
        if (typeof p.markdown === "string") return p.markdown;
        try {
            const res = await fetch(`posts/${encodeURIComponent(p.slug)}.md`);
            return res.ok ? await res.text() : "";
        } catch {
            return "";
        }
    }));
    return { posts, texts };
}

async function loadRepos() {
    const key = `gh-repos:${GITHUB_USER}`;   // the same cache the projects page uses
    try {
        const cached = JSON.parse(sessionStorage.getItem(key));
        if (cached && Array.isArray(cached.repos)) return cached.repos;
    } catch { /* ignore */ }
    try {
        const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`);
        if (!res.ok) return [];
        return (await res.json())
            .filter((r) => !r.fork && r.name.toLowerCase() !== GITHUB_USER.toLowerCase())
            .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    } catch {
        return [];
    }
}

async function build() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
        if (cached && Date.now() - cached.time < CACHE_MS) return cached.data;
    } catch { /* rebuild */ }

    let cfg = {};
    try { cfg = await getConfig(); } catch { /* defaults only */ }

    const home = homeChunks(cfg);
    const [{ posts, texts }, repos] = await Promise.all([loadPosts(), loadRepos()]);

    const data = {
        chunks: [...home.chunks, ...reposToChunks(repos, cfg.projects), ...postsToChunks(posts, texts), ...staticChunks()],
        sitemap: buildSitemap(home.config, posts)
    };
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data })); } catch { /* too big or blocked */ }
    return data;
}

let pending = null;

// { chunks: [{ url, title, text }], sitemap: "..." }
export function getKnowledge() {
    if (!pending) pending = build();
    return pending;
}
