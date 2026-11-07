// ==========================================================
// Site assistant: a chat button in the bottom-right corner.
// It searches everything the site contains (pages, posts, projects, tools),
// sends the best pieces to the assistant service and streams the answer back
// with Markdown, tables, a "thinking" block and colored code.
// The chat is kept while you move between pages.
// ==========================================================
import * as config from "./config.js";
import { parseSSE, readDelta, extractThink } from "./assistant/stream.js";
import { rank, expandQuery } from "./assistant/retrieve.js";
import { getKnowledge } from "./assistant/knowledge.js";
import { loadRenderLibs, renderMarkdown } from "./assistant/render.js";
import { getTurnstileToken } from "./assistant/turnstile.js";

const ENDPOINT = config.ASSISTANT_URL || "";
const SITE_KEY = config.TURNSTILE_SITE_KEY || ""; // empty = no human check
const STORE = "assistant-chat-v1";
const OPEN = "assistant-open";
const MAX_STORED = 30;
const MAX_SENT = 10;

const SUGGESTIONS = [
    "What projects do you have?",
    "How can I contact you?",
    "Show me the blog posts",
    "What tools are on this site?"
];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function icon(classes) {
    const i = el("i", classes);
    i.setAttribute("aria-hidden", "true");
    return i;
}

function iconButton(iconClass, label, className = "") {
    const b = el("button", ("switch-circle icon-btn " + className).trim());
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.append(icon(iconClass));
    return b;
}

function store(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* storage blocked */ }
}

function init() {
    let messages = [];
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORE));
        if (Array.isArray(saved)) messages = saved.filter((m) => m && typeof m.content === "string");
    } catch { /* start fresh */ }

    let busy = false;
    let controller = null;
    let restored = false;

    /* ---------- Markup ---------- */

    const root = el("div");
    root.id = "assistant";

    const fab = el("button", "assistant-fab");
    fab.type = "button";
    fab.setAttribute("aria-label", "Open the site assistant");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "assistant-panel");
    fab.append(icon("fa-solid fa-comments"));

    const panel = el("section", "assistant-panel");
    panel.id = "assistant-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Site assistant");

    const head = el("div", "assistant-head");
    const title = el("div", "assistant-title");
    title.append(icon("fa-solid fa-wand-magic-sparkles"), el("span", "", "Site assistant"));
    const tools = el("div", "assistant-tools");
    const resetBtn = iconButton("fa-solid fa-trash", "Start a new chat");
    const closeBtn = iconButton("fa-solid fa-xmark", "Close");
    tools.append(resetBtn, closeBtn);
    head.append(title, tools);

    const log = el("div", "assistant-log");
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");

    const form = el("form", "assistant-form");
    const input = el("textarea", "assistant-input");
    input.rows = 1;
    input.maxLength = 1500;
    input.placeholder = "Ask about this site…";
    input.setAttribute("aria-label", "Your question");
    const sendBtn = iconButton("fa-solid fa-paper-plane", "Send", "assistant-send");
    sendBtn.type = "submit";
    form.append(input, sendBtn);

    // Where Cloudflare's human check may appear (it is invisible unless it needs a tap)
    const check = el("div", "assistant-check");

    panel.append(head, log, check, form);
    root.append(panel, fab);
    document.body.append(root);

    /* ---------- Helpers ---------- */

    const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    const toBottom = () => { log.scrollTop = log.scrollHeight; };

    function setBusy(on) {
        busy = on;
        log.setAttribute("aria-busy", String(on));
        sendBtn.replaceChildren(icon(on ? "fa-solid fa-stop" : "fa-solid fa-paper-plane"));
        sendBtn.title = on ? "Stop" : "Send";
        sendBtn.setAttribute("aria-label", on ? "Stop the answer" : "Send");
    }

    function userBubble(text) {
        const bubble = el("div", "msg user");
        const body = el("div", "msg-body", text);
        body.dir = "auto";
        bubble.append(body);
        log.append(bubble);
        return bubble;
    }

    // An assistant bubble: optional thinking block + answer
    function botBubble() {
        const bubble = el("div", "msg bot");
        const body = el("div", "msg-body prose");
        body.dir = "auto";
        bubble.append(body);
        log.append(bubble);

        const ui = { bubble, body, think: null, thinkBody: null, thinkSummary: null };
        ui.waiting = () => {
            const dots = el("span", "dots");
            dots.append(el("i"), el("i"), el("i"));
            body.replaceChildren(dots);
        };
        ui.showThink = (text, open, seconds) => {
            if (!ui.think) {
                ui.think = el("details", "think");
                ui.think.open = true;
                ui.thinkSummary = el("summary");
                ui.thinkBody = el("div", "think-body");
                ui.thinkBody.dir = "auto";
                ui.think.append(ui.thinkSummary, ui.thinkBody);
                bubble.insertBefore(ui.think, body);
            }
            ui.thinkBody.textContent = text;
            ui.thinkSummary.replaceChildren(
                icon("fa-solid fa-brain"),
                document.createTextNode(open ? "Thinking…" : `Thought for ${Math.max(1, Math.round(seconds))}s`)
            );
        };
        ui.closeThink = () => { if (ui.think) ui.think.open = false; };
        return ui;
    }

    function welcome() {
        const ui = botBubble();
        renderMarkdown(ui.body, "Hi! I know this whole site: **projects**, **blog posts**, **services**, **tools** and how to contact Mhamad. Ask me anything, in English or Arabic.");
        const chips = el("div", "assistant-chips");
        SUGGESTIONS.forEach((text) => {
            const chip = el("button", "chip", text);
            chip.type = "button";
            chip.addEventListener("click", () => ask(text));
            chips.append(chip);
        });
        log.append(chips);
        return chips;
    }

    async function restore() {
        if (restored) return;
        restored = true;
        await loadRenderLibs();
        log.replaceChildren();
        if (!messages.length) {
            welcome();
            return;
        }
        messages.forEach((m) => {
            if (m.role === "user") userBubble(m.content);
            else renderMarkdown(botBubble().body, m.content);
        });
        toBottom();
    }

    function persist() {
        messages = messages.slice(-MAX_STORED);
        store(STORE, JSON.stringify(messages));
    }

    /* ---------- Asking ---------- */

    async function ask(text) {
        text = text.trim();
        if (!text || busy) return;

        const chips = log.querySelector && log.querySelector(".assistant-chips");
        if (chips) chips.remove();

        messages.push({ role: "user", content: text });
        userBubble(text);
        const ui = botBubble();
        ui.waiting();
        toBottom();
        setBusy(true);
        controller = new AbortController();

        let content = "";
        let reasoning = "";
        const started = Date.now();
        let thinkSeconds = 0;
        let raf = 0;
        let answer = "";

        const paint = () => {
            raf = 0;
            const parsed = extractThink(content);
            const thinking = reasoning || parsed.thinking;
            answer = parsed.answer;
            const stick = nearBottom();

            if (thinking) {
                if (answer && !thinkSeconds) thinkSeconds = (Date.now() - started) / 1000;
                ui.showThink(thinking, !answer, thinkSeconds);
                if (answer) ui.closeThink();
            }
            if (answer) renderMarkdown(ui.body, answer);
            else if (thinking) ui.body.replaceChildren();
            if (stick) toBottom();
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

        try {
            await loadRenderLibs();
            let kb = { chunks: [], sitemap: "" };
            try { kb = await getKnowledge(); } catch { /* answer from the page map only */ }

            const recent = messages.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");
            const hits = rank(expandQuery(recent), kb.chunks, 6);
            const context = hits.map((h) => `[${h.title}] (${h.url})\n${h.text}`).join("\n\n");

            const turnstile = SITE_KEY ? await getTurnstileToken(SITE_KEY, check) : undefined;

            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    messages: messages.slice(-MAX_SENT),
                    context,
                    sitemap: kb.sitemap,
                    turnstile,
                    page: location.pathname.split("/").pop() || "index.html"
                })
            });

            if (!res.ok) {
                let reason = "";
                try { reason = (await res.json()).error; } catch { /* no details */ }
                throw new Error(reason || `The assistant answered with error ${res.status}.`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            const handle = (events) => {
                for (const data of events) {
                    const delta = readDelta(data);
                    if (delta.error) throw new Error(delta.error);
                    if (delta.reasoning) reasoning += delta.reasoning;
                    if (delta.content) content += delta.content;
                }
            };

            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parsed = parseSSE(buffer);
                buffer = parsed.rest;
                handle(parsed.events);
                schedule();
            }
            buffer += decoder.decode();
            if (buffer.trim()) handle(parseSSE(buffer + "\n").events);

            paint();
            if (!answer && !reasoning) throw new Error("The model didn’t send an answer. Please try again.");
            messages.push({ role: "assistant", content: answer || "(no answer)" });
        } catch (err) {
            if (raf) cancelAnimationFrame(raf);
            paint();
            if (err && err.name === "AbortError") {
                if (answer) messages.push({ role: "assistant", content: answer });
                else ui.bubble.remove();
            } else {
                console.warn("Assistant error:", err);
                ui.bubble.classList.add("is-error");
                ui.body.replaceChildren(icon("fa-solid fa-circle-exclamation"), document.createTextNode(" " + (err.message || "Something went wrong.")));
                messages.pop();            // forget the unanswered question
                input.value = text;        // and give it back so one tap retries
            }
        } finally {
            setBusy(false);
            controller = null;
            persist();
        }
    }

    /* ---------- Events ---------- */

    function setOpen(open) {
        panel.hidden = !open;
        fab.setAttribute("aria-expanded", String(open));
        fab.setAttribute("aria-label", open ? "Close the site assistant" : "Open the site assistant");
        store(OPEN, open ? "1" : "");
        if (open) {
            restore().then(() => { toBottom(); });
            getKnowledge().catch(() => {});   // start indexing now, so the first answer is fast
            input.focus();
        }
    }

    fab.addEventListener("click", () => setOpen(panel.hidden));
    closeBtn.addEventListener("click", () => { setOpen(false); fab.focus(); });
    panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { setOpen(false); fab.focus(); }
    });

    resetBtn.addEventListener("click", () => {
        if (controller) controller.abort();
        messages = [];
        persist();
        restored = false;
        restore();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (busy) {
            if (controller) controller.abort();
            return;
        }
        const text = input.value;
        input.value = "";
        input.style.height = "";
        ask(text);
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
    });

    input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });

    let wasOpen = false;
    try { wasOpen = Boolean(sessionStorage.getItem(OPEN)); } catch { /* ignore */ }
    if (wasOpen) setOpen(true);
}

if (ENDPOINT) init();
