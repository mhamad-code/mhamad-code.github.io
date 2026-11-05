// ==========================================================
// Theme switcher. This is the only file that knows about themes.
//  - applies the saved theme before the page paints (no flash)
//  - adds the field icons the glass theme needs to every input
//  - powers every [data-theme-toggle] switch
// The look of each theme lives in css/style.css (no copies of the pages).
// ==========================================================
(function () {
    const KEY = "site-theme";
    const THEMES = ["neumorphic", "glass"];
    const root = document.documentElement;

    const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
    const write = (value) => { try { localStorage.setItem(KEY, value); } catch { /* storage blocked */ } };

    function apply(theme, save) {
        if (!THEMES.includes(theme)) theme = THEMES[0];
        root.dataset.theme = theme;
        if (save) write(theme);
        document.querySelectorAll("[data-theme-toggle]").forEach((el) =>
            el.setAttribute("aria-checked", String(theme === "glass")));
    }

    // Icons the glass theme shows inside the fields
    const ICONS = { password: "fa-lock", email: "fa-envelope", search: "fa-magnifying-glass", textarea: "fa-comment" };

    function addFieldIcons() {
        document.querySelectorAll(".input-group").forEach((group) => {
            if (group.querySelector(".field-icon")) return;
            const field = group.querySelector("input, textarea");
            if (!field) return;
            const key = field.tagName === "TEXTAREA" ? "textarea" : field.type;
            const icon = document.createElement("i");
            icon.className = `fa-solid ${group.dataset.icon || ICONS[key] || "fa-user"} field-icon`;
            icon.setAttribute("aria-hidden", "true");
            group.append(icon);
        });
    }

    apply(read(), false);

    document.addEventListener("click", (e) => {
        if (e.target.closest("[data-theme-toggle]")) {
            apply(root.dataset.theme === "glass" ? "neumorphic" : "glass", true);
        }
    });

    // Keep other open tabs in sync
    window.addEventListener("storage", (e) => { if (e.key === KEY) apply(e.newValue, false); });

    document.addEventListener("DOMContentLoaded", () => {
        addFieldIcons();
        apply(root.dataset.theme, false);
    });
})();
