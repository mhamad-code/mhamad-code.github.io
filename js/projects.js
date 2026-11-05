// ==========================================================
// Loads repositories from GitHub and renders project cards.
// Home page: first 7 + a "View more" tile. Projects page: all + search.
// Each card has a live preview when the project is hosted online.
// ==========================================================
import { GITHUB_USER } from "./config.js";
import { getConfig } from "./db.js";
import { createLoader } from "./loader.js";

const CACHE_KEY = `gh-repos:${GITHUB_USER}`;
const CACHE_MS = 10 * 60 * 1000; // GitHub allows 60 anonymous requests per hour

// Hosts allowed to show a live preview. Add your own domain here if needed.
const PREVIEW_HOSTS = ["github.io", "netlify.app", "vercel.app"];
const VIEW_W = 1280; // the preview renders a 1280px-wide page, scaled down to fit the card

const grid = document.getElementById("projectsGrid");
let limit = Number(grid.dataset.limit) || Infinity;
const moreHref = grid.dataset.more;
const searchInput = document.getElementById("search");
const countEl = document.getElementById("resultCount");

/* ---------- Data ---------- */

async function getRepos() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
        if (cached && Date.now() - cached.time < CACHE_MS) return cached.repos;
    } catch { /* ignore broken cache */ }

    const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`);
    if (!res.ok) throw new Error(`GitHub responded with ${res.status}`);

    const repos = (await res.json())
        .filter((r) => !r.fork && r.name.toLowerCase() !== GITHUB_USER.toLowerCase())
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), repos }));
    } catch { /* storage full or blocked */ }
    return repos;
}

// Returns the live site URL for a repo, or null if it isn't published
function previewUrl(repo) {
    if (repo.__preview === "off") return null;
    if (repo.__preview) return repo.__preview;
    const site = repo.homepage;
    if (site && /^https?:\/\//i.test(site)) {
        try {
            const host = new URL(site).hostname;
            if (PREVIEW_HOSTS.some((h) => host === h || host.endsWith("." + h))) return site;
        } catch { /* invalid URL */ }
    }
    if (repo.has_pages) {
        const owner = repo.owner.login.toLowerCase();
        return repo.name.toLowerCase() === `${owner}.github.io`
            ? `https://${owner}.github.io/`
            : `https://${owner}.github.io/${repo.name}/`;
    }
    return null;
}

/* ---------- DOM helpers (text goes through textContent, never innerHTML) ---------- */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function icon(classes) {
    return el("i", classes);
}

function iconLink(href, iconClass, label) {
    const a = el("a", "switch-circle icon-btn");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = label;
    a.setAttribute("aria-label", label);
    a.append(icon(iconClass));
    return a;
}

function metaItem(iconClass, text) {
    const span = el("span");
    span.append(icon(iconClass), document.createTextNode(text));
    return span;
}

/* ---------- Previews ---------- */

// Load each iframe only when its card is about to be visible
const lazyLoader = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const frame = entry.target.querySelector("iframe");
        frame.src = frame.dataset.src;
        lazyLoader.unobserve(entry.target);
    });
}, { rootMargin: "200px" });

// Keep the scale in sync with the card width
const scaler = new ResizeObserver((entries) => {
    entries.forEach(({ target, contentRect }) => {
        target.style.setProperty("--scale", contentRect.width / VIEW_W);
    });
});

function previewBox(repo) {
    const box = el("div", "preview");
    const url = previewUrl(repo);

    if (!url) {
        const state = el("div", "preview-state");
        state.append(icon("fa-solid fa-hourglass-half"), document.createTextNode("Preview coming soon"));
        box.append(state);
        return box;
    }

    const loading = el("div", "preview-state");
    loading.append(createLoader(true));

    const frame = document.createElement("iframe");
    frame.dataset.src = url;
    frame.title = `Live preview of ${repo.name}`;
    frame.tabIndex = -1;
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.referrerPolicy = "no-referrer";
    frame.addEventListener("load", () => frame.classList.add("loaded"));

    const link = el("a", "preview-link");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `Open ${repo.name} live site`);

    box.append(loading, frame, link);
    lazyLoader.observe(box);
    scaler.observe(box);
    return box;
}

/* ---------- Cards ---------- */

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

function projectCard(repo) {
    const card = el("article", "project-card");

    const top = el("div", "card-top");
    const folder = el("span", "card-icon");
    folder.append(icon("fa-solid fa-folder-open"));
    const stars = el("span", "card-stars");
    stars.append(icon("fa-solid fa-star"), document.createTextNode(repo.stargazers_count));
    top.append(folder, stars);

    const title = el("h3");
    const titleLink = el("a", "", repo.name);
    titleLink.href = repo.html_url;
    titleLink.target = "_blank";
    titleLink.rel = "noopener";
    title.append(titleLink);

    const desc = el("p", "card-desc", repo.description || "No description yet.");

    const meta = el("div", "card-meta");
    if (repo.language) meta.append(metaItem("fa-solid fa-code", repo.language));
    meta.append(metaItem("fa-regular fa-clock", dateFormat.format(new Date(repo.pushed_at))));

    const actions = el("div", "card-actions");
    actions.append(iconLink(repo.html_url, "fa-brands fa-github", "View code on GitHub"));
    const live = previewUrl(repo);
    if (live) actions.append(iconLink(live, "fa-solid fa-arrow-up-right-from-square", "Open live site"));

    card.append(previewBox(repo), top, title, desc, meta, actions);
    return card;
}

function moreCard() {
    const a = el("a", "project-card more-card");
    a.href = moreHref;
    const circle = el("span", "switch-circle");
    circle.append(icon("fa-solid fa-arrow-right"));
    a.append(circle, document.createTextNode("View more projects"));
    return a;
}

function stateBlock(iconClass, text, linkText, linkHref) {
    const box = el("div", "grid-state");
    box.append(iconClass.includes("fa-spinner") ? createLoader() : icon(iconClass), document.createTextNode(text));
    if (linkText) {
        box.append(document.createElement("br"));
        const a = el("a", "", linkText);
        a.href = linkHref;
        a.target = "_blank";
        a.rel = "noopener";
        box.append(a);
    }
    return box;
}

/* ---------- Render ---------- */

function render(repos, query = "") {
    const q = query.trim().toLowerCase();
    const list = q
        ? repos.filter((r) => `${r.name} ${r.description || ""} ${r.language || ""}`.toLowerCase().includes(q))
        : repos;

    if (countEl) {
        countEl.textContent = q
            ? `${list.length} of ${repos.length} projects`
            : `${repos.length} projects`;
    }

    if (!list.length) {
        const text = q ? `No projects match “${query.trim()}”.` : "No public projects yet.";
        grid.replaceChildren(stateBlock("fa-solid fa-folder-open", text));
        return;
    }

    const cards = list.slice(0, limit).map(projectCard);
    if (moreHref) cards.push(moreCard());
    grid.replaceChildren(...cards);
}

// Admin settings: how many on the home page, hidden, pinned, custom previews and descriptions
async function applySettings(repos) {
    let settings = {};
    try {
        settings = (await getConfig()).projects || {};
    } catch { /* keep the defaults */ }

    if (Number(settings.homeCount) > 0 && grid.dataset.limit) limit = Number(settings.homeCount);

    const hidden = new Set(settings.hidden || []);
    const pinned = settings.pinned || [];
    const overrides = new Map((settings.overrides || []).map((o) => [o.repo, o]));

    const rank = (r) => {
        const i = pinned.indexOf(r.name);
        return i === -1 ? 1e9 : i;
    };

    return repos
        .filter((r) => !hidden.has(r.name))
        .map((r) => {
            const o = overrides.get(r.name);
            if (!o) return r;
            const preview = String(o.preview || "").trim();
            const off = preview.toLowerCase() === "off";
            return {
                ...r,
                description: o.description || r.description,
                __preview: off ? "off" : /^https?:\/\//i.test(preview) ? preview : undefined
            };
        })
        .sort((a, b) => rank(a) - rank(b));
}

async function init() {
    grid.replaceChildren(stateBlock("fa-solid fa-spinner fa-spin", "Loading projects…"));
    try {
        const repos = await applySettings(await getRepos());
        render(repos);
        if (searchInput) searchInput.addEventListener("input", () => render(repos, searchInput.value));
    } catch (err) {
        console.error(err);
        grid.replaceChildren(stateBlock(
            "fa-solid fa-circle-exclamation",
            "Couldn’t load projects from GitHub. Refresh the page in a minute.",
            "Open my GitHub profile",
            `https://github.com/${GITHUB_USER}`
        ));
    }
}

init();
