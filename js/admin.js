// ==========================================================
// Admin panel: only the admin email can open it (and Firestore
// rules enforce the same on the server). One tab per area.
// ==========================================================
import { auth, isConfigured, onAuthStateChanged } from "./firebase.js";
import { ADMIN_EMAIL } from "./config.js";
import { getConfig, saveConfig } from "./db.js";
import { deepMerge } from "./config-utils.js";
import { createLoader } from "./loader.js";
import { el, iconEl } from "./admin/form.js";
import { dashboard } from "./admin/dashboard.js";
import { sitePanel } from "./admin/site.js";
import { skillsPanel, servicesPanel, reviewsPanel, faqPanel } from "./admin/lists.js";
import { projectsPanel } from "./admin/projects.js";
import { blogPanel } from "./admin/blog.js";

const app = document.getElementById("adminApp");

const TABS = [
    { id: "dashboard", label: "Visitors", icon: "fa-chart-simple", render: dashboard },
    { id: "site", label: "Site", icon: "fa-sliders", render: sitePanel },
    { id: "skills", label: "Skills", icon: "fa-bolt", render: skillsPanel },
    { id: "services", label: "Services", icon: "fa-briefcase", render: servicesPanel },
    { id: "reviews", label: "Reviews", icon: "fa-star", render: reviewsPanel },
    { id: "faq", label: "FAQ", icon: "fa-circle-question", render: faqPanel },
    { id: "projects", label: "Projects", icon: "fa-folder-open", render: projectsPanel },
    { id: "blog", label: "Blog", icon: "fa-pen-nib", render: blogPanel }
];

function gate(iconClass, message, linkText, linkHref) {
    const card = el("div", "settings-card");
    const state = el("div", "grid-state");
    state.append(iconEl(iconClass), document.createTextNode(message));
    if (linkText) {
        state.append(document.createElement("br"));
        const a = el("a", "", linkText);
        a.href = linkHref;
        state.append(a);
    }
    card.append(state);
    app.replaceChildren(card);
}

async function start() {
    app.replaceChildren(createLoader());

    let config = {};
    try {
        config = await getConfig();
    } catch (err) {
        console.warn(err);
    }

    const ctx = {
        config,
        async save(patch) {
            await saveConfig(patch);
            ctx.config = deepMerge(ctx.config, patch);
        }
    };

    const tabBar = el("div", "tool-tabs");
    tabBar.setAttribute("role", "tablist");
    const panels = {};
    const buttons = {};
    const rendered = new Set();

    function show(id, focus = false) {
        if (!TABS.some((t) => t.id === id)) id = TABS[0].id;
        TABS.forEach((t) => {
            const on = t.id === id;
            buttons[t.id].setAttribute("aria-selected", String(on));
            buttons[t.id].tabIndex = on ? 0 : -1;
            panels[t.id].hidden = !on;
        });
        if (!rendered.has(id)) {
            rendered.add(id);
            TABS.find((t) => t.id === id).render(panels[id], ctx);
        }
        if (focus) buttons[id].focus();
    }

    TABS.forEach((tab, index) => {
        const b = el("button", "skill tab");
        b.type = "button";
        b.id = `tab-${tab.id}`;
        b.setAttribute("role", "tab");
        b.setAttribute("aria-controls", `panel-${tab.id}`);
        b.append(iconEl(tab.icon), document.createTextNode(tab.label));
        b.addEventListener("click", () => { show(tab.id); history.replaceState(null, "", "#" + tab.id); });
        b.addEventListener("keydown", (e) => {
            const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const next = TABS[(index + step + TABS.length) % TABS.length].id;
            show(next, true);
            history.replaceState(null, "", "#" + next);
        });
        buttons[tab.id] = b;
        tabBar.append(b);

        const panel = el("div", "settings-card tool-panel admin-panel");
        panel.id = `panel-${tab.id}`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", b.id);
        panel.hidden = true;
        panels[tab.id] = panel;
    });

    app.replaceChildren(tabBar, ...Object.values(panels));
    window.addEventListener("hashchange", () => show(location.hash.slice(1)));
    show(location.hash.slice(1));
}

if (!isConfigured) {
    gate("fa-solid fa-circle-exclamation", "Firebase isn’t set up yet. Add your config in js/config.js.");
} else {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            gate("fa-solid fa-lock", "Sign in with the admin account to open the panel.", "Go to login", "login.html");
        } else if (user.email !== ADMIN_EMAIL) {
            gate("fa-solid fa-ban", `This account (${user.email || "no email"}) is not the admin.`, "Use another account", "login.html");
        } else {
            start();
        }
    });
}
