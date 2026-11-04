// Shared helpers for the blog pages
import { createLoader } from "./loader.js";

export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export async function getPosts() {
    const res = await fetch("posts/index.json");
    if (!res.ok) throw new Error(`Could not load posts/index.json (${res.status})`);
    const posts = await res.json();
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
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
