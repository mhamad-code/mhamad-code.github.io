// ==========================================================
// Form building blocks for the admin panel. They reuse the site's own
// components (input-group, switch, buttons), so both themes just work.
// ==========================================================

export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

// "fa-pen" becomes "fa-solid fa-pen"; "fa-brands fa-github" is kept as is
export function iconEl(classes, extra = "") {
    const i = document.createElement("i");
    i.className = (classes.includes(" ") ? classes : `fa-solid ${classes}`) + (extra ? " " + extra : "");
    i.setAttribute("aria-hidden", "true");
    return i;
}

export function setMsg(box, message = "", type = "ok") {
    box.className = "form-msg" + (type === "error" ? " is-error" : "");
    if (!message) {
        box.replaceChildren();
        return;
    }
    const symbol = { ok: "fa-circle-check", error: "fa-circle-exclamation", hint: "fa-circle-info" }[type];
    box.replaceChildren(iconEl(symbol), document.createTextNode(message));
}

export function explainError(err) {
    const code = err && err.code;
    if (code === "permission-denied") {
        return "Firestore refused the request. Sign in with Google using the admin email (the email must be verified) and publish the rules.";
    }
    if (code === "failed-precondition" || code === "not-found" || code === "unavailable") {
        return `Firestore isn’t reachable (${code}). Create the database in Firebase Console (Build > Firestore Database) and check your connection.`;
    }
    return `Something went wrong${code ? ` (${code})` : ""}. Try again.`;
}

let counter = 0;

// Floating-label field. Returns { root, input }
export function field({ label, value = "", icon = "fa-pen", type = "text", textarea = false, short = false, tall = false, code = false }) {
    const group = el("div", "input-group" + (textarea ? " textarea" : "") + (short ? " short" : "")
        + (tall ? " tall" : "") + (code ? " tool-code" : ""));
    group.dataset.icon = icon;
    group.append(el("div", "electric-glow"), el("div", "electric-border"));

    const input = document.createElement(textarea ? "textarea" : "input");
    input.id = `field-${++counter}`;
    if (!textarea) input.type = type;
    input.placeholder = " ";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = value;

    const caption = el("label", "", label);
    caption.htmlFor = input.id;

    group.append(input, caption, iconEl(icon, "field-icon"));
    return { root: group, input };
}

// On / off switch with a title. Returns { root, get, set }
export function toggle(label, checked = false, hint = "") {
    const row = el("div", "toggle-row");
    const words = el("div");
    words.append(el("strong", "", label));
    if (hint) words.append(el("small", "", hint));

    const btn = el("button", "switch");
    btn.type = "button";
    btn.setAttribute("role", "switch");
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-checked", String(Boolean(checked)));
    btn.addEventListener("click", () => btn.setAttribute("aria-checked", String(btn.getAttribute("aria-checked") !== "true")));

    row.append(words, btn);
    return {
        root: row,
        get: () => btn.getAttribute("aria-checked") === "true",
        set: (v) => btn.setAttribute("aria-checked", String(Boolean(v)))
    };
}

export function button(label, icon, onClick, extra = "") {
    const b = el("button", ("main-btn btn-inline btn-small " + extra).trim());
    b.type = "button";
    if (icon) b.append(iconEl(icon));
    b.append(document.createTextNode(label));
    b.addEventListener("click", onClick);
    return b;
}

export function iconBtn(icon, label, onClick) {
    const b = el("button", "switch-circle icon-btn");
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.append(iconEl(icon));
    b.addEventListener("click", onClick);
    return b;
}

export function heading(title, hint = "") {
    const box = el("div", "admin-heading");
    box.append(el("h3", "", title));
    if (hint) box.append(el("p", "", hint));
    return box;
}

// Save button + message. onSave may return a string to show a validation error.
export function saveBar(onSave, label = "Save changes") {
    const wrap = el("div", "save-bar");
    const msg = el("p", "form-msg");
    msg.setAttribute("aria-live", "polite");
    const btn = button(label, "fa-floppy-disk", async () => {
        btn.disabled = true;
        setMsg(msg);
        try {
            const problem = await onSave();
            if (typeof problem === "string") setMsg(msg, problem, "error");
            else setMsg(msg, "Saved. Visitors see it within a minute.");
        } catch (err) {
            console.error(err);
            setMsg(msg, explainError(err), "error");
        } finally {
            btn.disabled = false;
        }
    });
    wrap.append(btn, msg);
    return wrap;
}

// Editable list of cards: add, remove, move up and down.
// schema: [{ key, label, icon, textarea?, type? }]
export function listEditor({ items, schema, newItem, addLabel = "Add item", title }) {
    const data = items.map((item) => ({ ...item }));
    const root = el("div", "list-editor");
    const listBox = el("div", "list-items");

    function move(i, step) {
        const j = i + step;
        if (j < 0 || j >= data.length) return;
        [data[i], data[j]] = [data[j], data[i]];
        render();
    }

    function render() {
        listBox.replaceChildren(...data.map((item, i) => {
            const card = el("div", "item-card");
            const head = el("div", "item-head");
            head.append(el("strong", "", title ? title(item, i) : `Item ${i + 1}`));
            const tools = el("div", "item-tools");
            tools.append(
                iconBtn("fa-arrow-up", "Move up", () => move(i, -1)),
                iconBtn("fa-arrow-down", "Move down", () => move(i, 1)),
                iconBtn("fa-trash", "Remove", () => { data.splice(i, 1); render(); })
            );
            head.append(tools);
            card.append(head);

            schema.forEach((spec) => {
                const f = field({
                    label: spec.label,
                    value: item[spec.key] === undefined ? "" : String(item[spec.key]),
                    icon: spec.icon,
                    type: spec.type || "text",
                    textarea: Boolean(spec.textarea),
                    short: Boolean(spec.textarea)
                });
                f.input.addEventListener("input", () => {
                    item[spec.key] = spec.type === "number" ? Number(f.input.value) : f.input.value;
                });
                card.append(f.root);
            });
            return card;
        }));
    }

    root.append(listBox, button(addLabel, "fa-plus", () => { data.push({ ...newItem }); render(); }));
    render();
    return { root, getItems: () => data.map((item) => ({ ...item })) };
}
