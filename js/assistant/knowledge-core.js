// ==========================================================
// Turns site content into searchable pieces. Pure functions, no network:
// knowledge.js fetches the data, this file shapes it.
// ==========================================================
import { DEFAULTS } from "../defaults.js";
import { deepMerge, socialUrls } from "../config-utils.js";
import { chunkText, chunkMarkdown } from "./retrieve.js";

export const TOOLS = [
    { id: "qr", title: "QR code generator", text: "Makes a QR code from a link or text, with a chosen size and colors. Download it as PNG or SVG." },
    { id: "password", title: "Password generator", text: "Creates strong random passwords from 8 to 64 characters with uppercase, lowercase, numbers and symbols, and shows how strong they are. It uses the browser's secure random numbers." },
    { id: "json", title: "JSON formatter", text: "Formats, minifies and validates JSON. It points to the line and column of an error. Copy or download the result." },
    { id: "color", title: "Color converter", text: "Converts between HEX, RGB and HSL, with a color picker and the contrast against white and black text." }
];

const add = (list, url, title, text) => {
    const body = String(text || "").trim();
    if (body) chunkText(body, 700).forEach((piece) => list.push({ url, title, text: piece }));
};

// Home page: the defaults plus what the admin saved. Hidden sections are left out.
export function homeChunks(cfg) {
    const c = deepMerge(DEFAULTS, cfg || {});
    const on = (id) => c.sections[id] !== false;
    const out = [];

    add(out, "index.html", `${c.site.name}: introduction`, `${c.site.name}. ${c.hero.title}. ${c.hero.text} ${c.site.tagline}`);
    if (on("about")) add(out, "index.html#about", "About", c.about.paragraphs.join("\n\n"));

    if (on("skills")) {
        const names = [...c.skills.row1, ...c.skills.row2].map((s) => s.label).filter(Boolean);
        add(out, "index.html#skills", "Skills", `Skills and tools: ${names.join(", ")}.`);
    }

    if (on("services")) c.services.forEach((s) => add(out, "index.html#services", `Service: ${s.title}`, `${s.title}. ${s.text}`));

    if (on("reviews")) {
        c.reviews
            .filter((r) => r.text && !/^Replace this text/i.test(r.text))   // skip the placeholders
            .forEach((r) => add(out, "index.html#reviews", `Review by ${r.name || "a client"}`,
                `${r.name || "A client"}${r.role ? ` (${r.role})` : ""} gave ${r.rating || 5} out of 5 stars: ${r.text}`));
    }

    if (on("faq")) c.faq.forEach((f) => add(out, "index.html#faq", `FAQ: ${f.q}`, `Question: ${f.q}\nAnswer: ${f.a}`));

    if (on("contact")) {
        const u = socialUrls(c.social);
        const lines = [
            u.whatsapp && `WhatsApp: ${u.whatsapp} (number ${c.social.whatsapp})`,
            u.telegram && `Telegram: ${u.telegram}`,
            u.instagram && `Instagram: ${u.instagram}`,
            u.github && `GitHub: ${u.github}`,
            u.email && `Email: ${c.social.email}`
        ].filter(Boolean);
        add(out, "index.html#contact", "Contact",
            `Ways to contact ${c.site.name}. ${lines.join(". ")}. There is also a contact form with name, email and message on the home page.`);
    }
    return { chunks: out, config: c };
}

// posts[i] goes with texts[i] (its Markdown)
export function postsToChunks(posts, texts) {
    const out = [];
    posts.forEach((p, i) => {
        const url = `post.html?slug=${encodeURIComponent(p.slug)}`;
        add(out, url, `Post: ${p.title}`, `Blog post "${p.title}" by ${p.author || "the author"}, ${p.date || ""}. ${p.description || ""}`);
        chunkMarkdown(texts[i] || "", 700).forEach((s) => {
            out.push({ url, title: `Post: ${p.title}${s.heading ? " > " + s.heading : ""}`, text: s.text });
        });
    });
    return out;
}

export function reposToChunks(repos, settings = {}) {
    const hidden = new Set(settings.hidden || []);
    const overrides = new Map((settings.overrides || []).map((o) => [o.repo, o]));
    return (repos || []).filter((r) => !hidden.has(r.name)).map((r) => {
        const o = overrides.get(r.name) || {};
        const live = r.homepage || (r.has_pages ? `https://${r.owner.login.toLowerCase()}.github.io/${r.name}/` : "");
        const facts = [
            `Project "${r.name}": ${o.description || r.description || "no description"}.`,
            r.language && `Main language: ${r.language}.`,
            (r.topics || []).length && `Topics: ${r.topics.join(", ")}.`,
            `Stars: ${r.stargazers_count}. Last updated ${String(r.pushed_at).slice(0, 10)}.`,
            `Code: ${r.html_url}.`,
            live && `Live site: ${live}.`
        ].filter(Boolean).join(" ");
        return { url: "projects.html", title: `Project: ${r.name}`, text: facts };
    });
}

export function staticChunks() {
    return [
        ...TOOLS.map((t) => ({ url: `tools.html#${t.id}`, title: `Tool: ${t.title}`, text: t.text })),
        { url: "settings.html", title: "Settings page", text: "The settings page has a switch to change the look of the whole site between the default soft theme and the glass theme with a night landscape. The choice is saved on the visitor's device." },
        { url: "login.html", title: "Login page", text: "Visitors can log in or create an account with email and password, or with Google or GitHub." }
    ];
}

const HOME_LINKS = [
    ["about", "- About: index.html#about"],
    ["skills", "- Skills: index.html#skills"],
    ["services", "- Services: index.html#services"],
    ["projects", "- Latest projects: index.html#projects"],
    ["reviews", "- Client reviews: index.html#reviews"],
    ["faq", "- FAQ: index.html#faq"],
    ["contact", "- Contact form and links: index.html#contact"]
];

// Every page and section the assistant may link to
export function buildSitemap(config, posts) {
    const sections = (config && config.sections) || {};
    return [
        "- Home: index.html — introduction, about, skills, services, projects, reviews, FAQ and the contact form",
        ...HOME_LINKS.filter(([id]) => sections[id] !== false).map(([, line]) => line),
        "- All projects (with search): projects.html",
        "- Blog (all posts, with search): blog.html",
        ...posts.map((p) => `- Post "${p.title}": post.html?slug=${encodeURIComponent(p.slug)}`),
        "- Tools: tools.html",
        ...TOOLS.map((t) => `- ${t.title}: tools.html#${t.id}`),
        "- Settings (light/glass theme switch): settings.html",
        "- Login and sign-up (email, Google, GitHub): login.html"
    ].join("\n");
}
