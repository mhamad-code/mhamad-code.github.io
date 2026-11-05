// ==========================================================
// Public pages: applies what you saved in the admin panel
// (texts, lists, links, visibility, maintenance mode) and counts the visit.
// Anything you did not change keeps the text written in the HTML.
// ==========================================================
import { getConfig, getCachedConfig, isAdminUser, trackVisit } from "./db.js";
import { safeIcon, safeUrl, socialUrls, pageName } from "./config-utils.js";

const SECTIONS = ["about", "skills", "services", "projects", "reviews", "faq", "contact"];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

const icon = (classes) => {
    const i = el("i", classes);
    i.setAttribute("aria-hidden", "true");
    return i;
};

const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const list = (value) => (Array.isArray(value) ? value : []);

/* ---------- Each part is independent: one failure never breaks the page ---------- */

function identity(cfg) {
    const site = cfg.site || {};
    const name = text(site.name);
    if (name) {
        $$(".brand > span:last-child, .footer-brand strong").forEach((n) => (n.textContent = name));
        $$(".logo img").forEach((img) => (img.alt = name));
    }

    const avatar = safeUrl(site.avatar);
    if (avatar) $$(".logo img").forEach((img) => (img.src = avatar));

    const tagline = text(site.tagline);
    const brandText = $(".footer-brand p");
    if (tagline && brandText) {
        const strong = $("strong", brandText);
        brandText.replaceChildren(...(strong ? [strong] : []), document.createTextNode(tagline));
    }

    const footer = text(site.footer);
    const copyright = $(".copyright");
    if (footer && copyright) {
        const year = $("#year", copyright) || el("span");
        if (!year.id) { year.id = "year"; year.textContent = new Date().getFullYear(); }
        copyright.replaceChildren(document.createTextNode("© "), year, document.createTextNode(" " + footer));
    }
}

function social(cfg) {
    const urls = socialUrls(cfg.social);
    const labels = { github: "GitHub", telegram: "Telegram", instagram: "Instagram", whatsapp: "WhatsApp", email: "Email" };
    for (const [key, label] of Object.entries(labels)) {
        if (!urls[key]) continue;
        $$(`.footer-social a[aria-label="${label}"]`).forEach((a) => (a.href = urls[key]));
    }
    if (urls.github) $$("#about .about-card .main-btn").forEach((a) => (a.href = urls.github));
}

function hero(cfg) {
    const h = cfg.hero || {};
    if (text(h.title) && $(".hero h1")) $(".hero h1").textContent = text(h.title);
    if (text(h.text) && $(".hero p")) $(".hero p").textContent = text(h.text);
    const image = safeUrl(h.image);
    if (image && $(".hero-photo img")) $(".hero-photo img").src = image;
}

function about(cfg) {
    const paragraphs = list(cfg.about && cfg.about.paragraphs).filter((p) => text(p));
    const card = $("#about .about-card");
    if (!paragraphs.length || !card) return;
    $$("p", card).forEach((p) => p.remove());
    const anchor = $(".main-btn", card);
    paragraphs.forEach((p) => card.insertBefore(el("p", "", p), anchor));
}

function skills(cfg) {
    const rows = [list(cfg.skills && cfg.skills.row1), list(cfg.skills && cfg.skills.row2)];
    const tracks = $$("#skills .marquee-track");
    rows.forEach((items, i) => {
        const track = tracks[i];
        const nodes = items.filter((it) => it && text(it.label)).map((it) => {
            const chip = el("span", "skill");
            chip.append(icon(safeIcon(it.icon)), document.createTextNode(it.label.trim()));
            return chip;
        });
        if (!track || !nodes.length) return;
        // Two copies make the scrolling loop seamless
        const copies = nodes.map((n) => {
            const c = n.cloneNode(true);
            c.setAttribute("aria-hidden", "true");
            return c;
        });
        track.replaceChildren(...nodes, ...copies);
    });
}

function services(cfg) {
    const grid = $("#services .services-grid");
    const cards = list(cfg.services).filter((s) => s && text(s.title)).map((s) => {
        const card = el("article", "project-card service-card");
        const badge = el("span", "card-icon");
        badge.append(icon(safeIcon(s.icon, "fa-solid fa-star")));
        card.append(badge, el("h3", "", s.title.trim()), el("p", "", s.text || ""));
        return card;
    });
    if (grid && cards.length) grid.replaceChildren(...cards);
}

function reviews(cfg) {
    const grid = $("#reviews .services-grid");
    const cards = list(cfg.reviews).filter((r) => r && text(r.text)).map((r) => {
        const rating = Math.max(0, Math.min(5, Math.round(Number(r.rating)) || 0));
        const card = el("article", "project-card review-card");

        const stars = el("div", "stars");
        stars.setAttribute("aria-label", `${rating} out of 5 stars`);
        for (let i = 0; i < 5; i++) stars.append(icon(i < rating ? "fa-solid fa-star" : "fa-regular fa-star"));

        const initial = (text(r.name) || "?").charAt(0).toUpperCase();
        const avatar = el("span", "card-icon avatar-photo");
        const photo = safeUrl(r.photo);
        if (photo) {
            const img = el("img");
            img.src = photo;
            img.alt = "";
            img.loading = "lazy";
            img.referrerPolicy = "no-referrer";
            img.addEventListener("error", () => {
                avatar.classList.remove("avatar-photo");
                avatar.textContent = initial;
            });
            avatar.append(img);
        } else {
            avatar.classList.remove("avatar-photo");
            avatar.textContent = initial;
        }

        const who = el("div");
        who.append(el("strong", "", r.name || ""), el("span", "", r.role || ""));
        const person = el("div", "review-author");
        person.append(avatar, who);

        card.append(stars, el("p", "card-desc", r.text.trim()), person);
        return card;
    });
    if (grid && cards.length) grid.replaceChildren(...cards);
}

function faq(cfg) {
    const box = $("#faq .faq-list");
    const items = list(cfg.faq).filter((f) => f && text(f.q)).map((f) => {
        const item = el("details", "faq-item");
        const summary = el("summary");
        summary.append(document.createTextNode(f.q.trim()), icon("fa-solid fa-plus"));
        item.append(summary, el("p", "", f.a || ""));
        return item;
    });
    if (box && items.length) box.replaceChildren(...items);
}

function sections(cfg) {
    const flags = cfg.sections || {};
    SECTIONS.forEach((id) => {
        if (typeof flags[id] !== "boolean") return;
        const section = document.getElementById(id);
        if (section && section.tagName === "SECTION") section.hidden = !flags[id];
        $$(`a[href="#${id}"]`).forEach((a) => (a.hidden = !flags[id]));
    });
}

function customCss(cfg) {
    let style = document.getElementById("site-custom-css");
    const css = typeof cfg.customCss === "string" ? cfg.customCss : "";
    if (!css.trim()) {
        if (style) style.remove();
        return;
    }
    if (!style) {
        style = el("style");
        style.id = "site-custom-css";
        document.head.append(style);
    }
    style.textContent = css;
}

async function maintenance(cfg) {
    const old = document.getElementById("maintenance");
    const m = cfg.maintenance;
    if (!m || m.enabled !== true) {
        if (old) old.remove();
        return;
    }
    if (old) return;

    const overlay = el("div");
    overlay.id = "maintenance";
    overlay.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;"
        + "padding:20px;background:var(--bg);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)";

    const card = el("div", "settings-card");
    card.style.textAlign = "center";
    const wrench = icon("fa-solid fa-screwdriver-wrench");
    wrench.style.cssText = "display:block;margin-bottom:16px;font-size:34px;color:var(--blue)";
    const link = el("a", "", "Admin login");
    link.href = "login.html";
    link.style.cssText = "display:inline-block;margin-top:20px;font-size:13px;color:var(--muted)";
    card.append(wrench, el("p", "", text(m.message) || "The site is being updated. Please come back soon."), link);
    overlay.append(card);
    document.body.append(overlay);

    // The admin can still browse the site
    if (await isAdminUser()) overlay.remove();
}

/* ---------- Run ---------- */

function apply(cfg) {
    [identity, social, hero, about, skills, services, reviews, faq, sections, customCss, maintenance].forEach((step) => {
        try {
            const result = step(cfg || {});
            if (result && typeof result.catch === "function") result.catch((e) => console.warn(step.name, e));
        } catch (err) {
            console.warn(`Site content: ${step.name} failed`, err);
        }
    });
}

const cached = getCachedConfig();
if (cached) apply(cached);

getConfig().then(apply);
trackVisit(pageName(location.pathname, location.search));
