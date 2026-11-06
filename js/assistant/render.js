// ==========================================================
// Turns the assistant's Markdown into safe HTML: tables, lists, links,
// and code blocks that are colored and have a Copy button.
// The libraries are loaded the first time the chat opens.
// ==========================================================

const LIBS = [
    ["marked", "https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"],
    ["DOMPurify", "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.9/purify.min.js"],
    ["hljs", "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"]
];

let loading = null;

function loadScript(src) {
    return new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);   // the chat still works, with plain text
        document.head.append(s);
    });
}

export function loadRenderLibs() {
    if (!loading) {
        loading = Promise.all(LIBS.map(([name, src]) => (window[name] ? true : loadScript(src))));
    }
    return loading;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function copy(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = el("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;opacity:0";
        document.body.append(area);
        area.select();
        let ok = false;
        try { ok = document.execCommand("copy"); } catch { /* ignore */ }
        area.remove();
        return ok;
    }
}

function decorateCode(root) {
    root.querySelectorAll("pre > code").forEach((code) => {
        const pre = code.parentElement;
        const lang = ([...code.classList].find((c) => c.startsWith("language-")) || "").replace("language-", "");
        if (window.hljs) {
            try { window.hljs.highlightElement(code); } catch { /* unknown language */ }
        }

        const text = code.textContent;
        const block = el("div", "code-block");
        block.dir = "ltr";

        const head = el("div", "code-head");
        head.append(el("span", "", lang || "code"));
        const btn = el("button", "code-btn");
        btn.type = "button";
        const label = (icon, words) => {
            btn.replaceChildren(el("i", icon), document.createTextNode(words));
        };
        label("fa-regular fa-copy", "Copy");
        btn.addEventListener("click", async () => {
            label((await copy(text)) ? "fa-solid fa-check" : "fa-solid fa-xmark", "Copied");
            setTimeout(() => label("fa-regular fa-copy", "Copy"), 1500);
        });
        head.append(btn);

        pre.replaceWith(block);
        block.append(head, pre);
    });
}

function decorateLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
        try {
            const url = new URL(a.getAttribute("href"), location.href);
            if (url.origin !== location.origin) {
                a.target = "_blank";
                a.rel = "noopener noreferrer";
            }
        } catch {
            a.removeAttribute("href");
        }
    });
}

// Writes `markdown` into `target`
export function renderMarkdown(target, markdown) {
    if (!(window.marked && window.DOMPurify)) {
        target.textContent = markdown;
        return;
    }
    const html = window.marked.parse(markdown, { gfm: true, breaks: true });
    target.innerHTML = window.DOMPurify.sanitize(html, { FORBID_TAGS: ["img", "style", "form", "input"], FORBID_ATTR: ["style"] });
    decorateLinks(target);
    decorateCode(target);
}
