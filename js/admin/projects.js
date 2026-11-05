// Projects tab: how many on the home page, pin, hide, custom previews and descriptions.
import { GITHUB_USER } from "../config.js";
import { DEFAULTS } from "../defaults.js";
import { createLoader } from "../loader.js";
import { el, field, toggle, saveBar, heading, setMsg } from "./form.js";

const CACHE_KEY = `gh-repos:${GITHUB_USER}`;

async function loadRepos() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
        if (cached && Date.now() - cached.time < 10 * 60 * 1000) return cached.repos;
    } catch { /* ignore */ }
    const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`);
    if (!res.ok) throw new Error(`GitHub responded with ${res.status}`);
    return (await res.json())
        .filter((r) => !r.fork && r.name.toLowerCase() !== GITHUB_USER.toLowerCase())
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
}

export async function projectsPanel(box, ctx) {
    box.replaceChildren(createLoader(true));

    let repos;
    try {
        repos = await loadRepos();
    } catch (err) {
        console.error(err);
        const msg = el("p", "form-msg");
        setMsg(msg, "Couldn’t load your repositories from GitHub. Try again in a minute.", "error");
        box.replaceChildren(msg);
        return;
    }

    const settings = { ...DEFAULTS.projects, ...(ctx.config.projects || {}) };
    const overrides = new Map((settings.overrides || []).map((o) => [o.repo, o]));

    const count = field({ label: "Projects on the home page", value: String(settings.homeCount), icon: "fa-hashtag", type: "number" });

    const rows = repos.map((repo) => {
        const o = overrides.get(repo.name) || {};
        const pinned = toggle("Pinned", (settings.pinned || []).includes(repo.name), "Shown first");
        const hidden = toggle("Hidden", (settings.hidden || []).includes(repo.name), "Not shown on the site");
        const preview = field({ label: "Preview link (empty = automatic, “off” = coming soon)", value: o.preview || "", icon: "fa-eye" });
        const description = field({ label: "Description (empty = from GitHub)", value: o.description || "", icon: "fa-align-left" });

        const card = el("div", "item-card");
        const head = el("div", "item-head");
        head.append(el("strong", "", repo.name));
        card.append(head, pinned.root, hidden.root, preview.root, description.root);
        return { repo, pinned, hidden, preview, description, card };
    });

    box.replaceChildren(
        heading("Home page"), count.root,
        heading("Your repositories", "Projects are loaded from GitHub. Here you decide how each one appears."),
        el("div", "list-items", undefined),
        saveBar(async () => {
            const n = Math.round(Number(count.input.value));
            if (!(n >= 1 && n <= 24)) return "Choose between 1 and 24 projects for the home page.";

            const patch = { homeCount: n, hidden: [], pinned: [], overrides: [] };
            for (const row of rows) {
                const name = row.repo.name;
                const preview = row.preview.input.value.trim();
                const description = row.description.input.value.trim();
                if (preview && preview.toLowerCase() !== "off" && !/^https?:\/\//i.test(preview)) {
                    return `The preview for “${name}” must start with https:// (or be “off”).`;
                }
                if (row.hidden.get()) patch.hidden.push(name);
                if (row.pinned.get()) patch.pinned.push(name);
                if (preview || description) patch.overrides.push({ repo: name, preview, description });
            }
            await ctx.save({ projects: patch });
        })
    );
    box.querySelector(".list-items").append(...rows.map((r) => r.card));
}
