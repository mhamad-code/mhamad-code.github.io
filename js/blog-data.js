// Shared helpers for the blog pages
import { createLoader } from "./loader.js";
import { getPublishedPosts } from "./db.js";

export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

// Posts from posts/index.json plus the ones written in the admin panel
export async function getPosts() {
    let files = [];
    let fileError = null;
    try {
        const res = await fetch("posts/index.json");
        if (!res.ok) throw new Error(`Could not load posts/index.json (${res.status})`);
        files = await res.json();
    } catch (err) {
        fileError = err;
    }

    let live = [];
    try {
        live = await getPublishedPosts();
    } catch (err) {
        console.warn("Could not load posts from the database:", err);
    }

    if (fileError && !live.length) throw fileError;

    const bySlug = new Map(files.map((p) => [p.slug, p]));
    live.forEach((p) => bySlug.set(p.slug, p)); // a database post replaces a file with the same slug
    return [...bySlug.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
export const formatDate = (iso) => dateFormat.format(new Date(iso));

export function stateBlock(iconClass, text, linkText, linkHref) {
    const box = el("div", "grid-state");
    box.append(iconClass.includes("fa-spinner") ? createLoader() : el("i", iconClass), document.createTextNode(text));
    if (linkText) {
        box.append(document.createElement("br"));
        const a = el("a", "", linkText);
        a.href = linkHref;
        box.append(a);
    }
    return box;
}
