// Single post page: loads the Markdown file, renders it,
// highlights code and adds Copy / Download buttons to every code block.
import { el, getPosts, formatDate, stateBlock } from "./blog-data.js";

const root = document.getElementById("post");
const slug = new URLSearchParams(location.search).get("slug");

// File extension used by the Download button
const EXT = {
    javascript: "js", js: "js", typescript: "ts", ts: "ts", html: "html", xml: "xml",
    css: "css", scss: "scss", json: "json", python: "py", py: "py", bash: "sh", sh: "sh",
    shell: "sh", java: "java", c: "c", cpp: "cpp", csharp: "cs", cs: "cs", php: "php",
    sql: "sql", yaml: "yml", yml: "yml", markdown: "md", md: "md", go: "go", rust: "rs",
    kotlin: "kt", swift: "swift"
};

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback for browsers or pages without clipboard access
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

function toolButton(iconClass, label) {
    const btn = el("button", "code-btn");
    btn.type = "button";
    btn.append(el("i", iconClass), document.createTextNode(label));
    return btn;
}

function setLabel(btn, iconClass, label) {
    btn.replaceChildren(el("i", iconClass), document.createTextNode(label));
}

function enhanceCode(container, postSlug) {
    container.querySelectorAll("pre > code").forEach((code, i) => {
        const pre = code.parentElement;
        const lang = ([...code.classList].find((c) => c.startsWith("language-")) || "").replace("language-", "");

        if (window.hljs) hljs.highlightElement(code);

        const text = code.textContent;
        const block = el("div", "code-block");
        const head = el("div", "code-head");
        head.append(el("span", "", lang || "code"));

        const tools = el("div", "code-tools");
        const copy = toolButton("fa-regular fa-copy", "Copy");
        const download = toolButton("fa-solid fa-download", "Download");

        copy.addEventListener("click", async () => {
            const ok = await copyText(text);
            setLabel(copy, ok ? "fa-solid fa-check" : "fa-solid fa-xmark", ok ? "Copied" : "Failed");
            setTimeout(() => setLabel(copy, "fa-regular fa-copy", "Copy"), 1800);
        });

        download.addEventListener("click", () => {
            const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
            const a = el("a");
            a.href = url;
            a.download = `${postSlug}-${i + 1}.${EXT[lang.toLowerCase()] || "txt"}`;
            document.body.append(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });

        tools.append(copy, download);
        head.append(tools);
        pre.replaceWith(block);
        block.append(head, pre);
    });
}

function metaItem(iconClass, text) {
    const span = el("span");
    span.append(el("i", iconClass), document.createTextNode(text));
    return span;
}

function render(meta, markdown) {
    document.title = `${meta.title} | Mhamad`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);

    const minutes = Math.max(1, Math.round(markdown.split(/\s+/).length / 200));

    const back = el("a", "back-link");
    back.href = "blog.html";
    const arrow = el("span", "switch-circle icon-btn");
    arrow.append(el("i", "fa-solid fa-arrow-left"));
    back.append(arrow, document.createTextNode("All posts"));

    const head = el("header", "post-head");
    const info = el("div", "post-meta");
    info.append(
        metaItem("fa-solid fa-user", meta.author),
        metaItem("fa-regular fa-calendar", formatDate(meta.date)),
        metaItem("fa-regular fa-clock", `${minutes} min read`)
    );
    head.append(el("h1", "", meta.title), el("p", "post-lead", meta.description), info);

    const hero = el("div", "post-hero");
    const img = el("img");
    img.src = meta.image;
    img.alt = meta.title;
    hero.append(img);

    const body = el("div", "post-body prose");
    body.innerHTML = DOMPurify.sanitize(marked.parse(markdown));

    body.querySelectorAll("a[href^='http']").forEach((a) => {
        a.target = "_blank";
        a.rel = "noopener";
    });
    body.querySelectorAll("img").forEach((i) => (i.loading = "lazy"));
    enhanceCode(body, meta.slug);

    root.replaceChildren(back, head, hero, body);
}

async function init() {
    root.replaceChildren(stateBlock("fa-solid fa-spinner fa-spin", "Loading post…"));
    try {
        const meta = (await getPosts()).find((p) => p.slug === slug); // only slugs listed in index.json are loaded
        if (!meta) {
            root.replaceChildren(stateBlock("fa-solid fa-circle-exclamation", "This post doesn’t exist.", "Back to all posts", "blog.html"));
            return;
        }
        let markdown = meta.markdown; // posts written in the admin panel carry their text
        if (markdown === undefined) {
            const res = await fetch(`posts/${meta.slug}.md`);
            if (!res.ok) throw new Error(`Could not load posts/${meta.slug}.md (${res.status})`);
            markdown = await res.text();
        }
        render(meta, markdown);
    } catch (err) {
        console.error(err);
        root.replaceChildren(stateBlock("fa-solid fa-circle-exclamation", "Couldn’t load this post. Refresh the page and try again.", "Back to all posts", "blog.html"));
    }
}

init();
