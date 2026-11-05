// ==========================================================
// Small DOM helpers shared by the tools.
// ==========================================================

export const $ = (selector, root = document) => root.querySelector(selector);

export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback for pages without clipboard access
        const area = document.createElement("textarea");
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

// Shows a check mark on an icon button for a moment
export function flashIcon(button) {
    const icon = button.querySelector("i");
    if (!icon || button.dataset.busy) return;
    const old = icon.className;
    button.dataset.busy = "1";
    icon.className = "fa-solid fa-check";
    setTimeout(() => {
        icon.className = old;
        delete button.dataset.busy;
    }, 1500);
}

// type: "ok" (check), "error" (warning) or "hint" (info). No text clears the message.
export function setMsg(el, text = "", type = "ok") {
    el.className = "form-msg" + (type === "error" ? " is-error" : "");
    if (!text) {
        el.replaceChildren();
        return;
    }
    const icon = document.createElement("i");
    icon.className = "fa-solid " + { ok: "fa-circle-check", error: "fa-circle-exclamation", hint: "fa-circle-info" }[type];
    el.replaceChildren(icon, document.createTextNode(text));
}

export function download(filename, data, type = "text/plain") {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
