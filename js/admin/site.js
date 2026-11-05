// Site tab: names, home page text, about, links, sections, maintenance and extra CSS.
import { DEFAULTS } from "../defaults.js";
import { getPath, safeUrl, socialUrls } from "../config-utils.js";
import { field, toggle, listEditor, saveBar, heading } from "./form.js";

const SECTION_NAMES = {
    about: "About", skills: "Skills", services: "Services", projects: "Projects",
    reviews: "Reviews", faq: "FAQ", contact: "Contact"
};

export function sitePanel(box, ctx) {
    const value = (path) => {
        const saved = getPath(ctx.config, path);
        return saved === undefined || saved === null ? getPath(DEFAULTS, path) : saved;
    };

    const fields = {};
    const add = (path, label, icon, opts = {}) => {
        fields[path] = field({ label, value: value(path) || "", icon, ...opts });
        return fields[path].root;
    };

    const about = listEditor({
        items: value("about.paragraphs").map((text) => ({ text })),
        schema: [{ key: "text", label: "Paragraph", icon: "fa-align-left", textarea: true }],
        newItem: { text: "" },
        addLabel: "Add paragraph",
        title: (_, i) => `Paragraph ${i + 1}`
    });

    const sectionSwitches = {};
    const sectionGrid = document.createElement("div");
    sectionGrid.className = "toggle-grid";
    Object.entries(SECTION_NAMES).forEach(([id, name]) => {
        sectionSwitches[id] = toggle(name, value(`sections.${id}`) !== false);
        sectionGrid.append(sectionSwitches[id].root);
    });

    const maintenance = toggle("Maintenance mode", value("maintenance.enabled") === true,
        "Visitors see only the message below. You can still browse when signed in.");

    const get = (path) => fields[path].input.value.trim();

    box.append(
        heading("Identity", "Leave a field empty to use the text written in the page."),
        add("site.name", "Site name", "fa-signature"),
        add("site.tagline", "Footer tagline", "fa-quote-left"),
        add("site.footer", "Copyright text (after the year)", "fa-copyright"),
        add("site.avatar", "Round photo (link or assets/...)", "fa-image"),

        heading("Home page"),
        add("hero.title", "Main title", "fa-heading"),
        add("hero.text", "Intro text", "fa-align-left", { textarea: true, short: true }),
        add("hero.image", "Big photo (link or assets/...)", "fa-image"),

        heading("About"),
        about.root,

        heading("Social links", "Usernames only. WhatsApp: number with country code."),
        add("social.github", "GitHub username", "fa-brands fa-github"),
        add("social.telegram", "Telegram username", "fa-brands fa-telegram"),
        add("social.instagram", "Instagram username", "fa-brands fa-instagram"),
        add("social.whatsapp", "WhatsApp number", "fa-brands fa-whatsapp"),
        add("social.email", "Email", "fa-envelope"),

        heading("Sections", "Turn a section off to hide it, and its menu links, on the home page."),
        sectionGrid,

        heading("Maintenance"),
        maintenance.root,
        add("maintenance.message", "Message for visitors", "fa-comment", { textarea: true, short: true }),

        heading("Extra CSS", "For advanced changes. It is added to every page."),
        add("customCss", "CSS", "fa-code", { textarea: true, tall: true, code: true }),

        saveBar(async () => {
            for (const path of ["site.avatar", "hero.image"]) {
                if (get(path) && !safeUrl(get(path))) return "Photos must be a https:// link or a file inside assets/.";
            }
            const social = {
                github: get("social.github"), telegram: get("social.telegram"), instagram: get("social.instagram"),
                whatsapp: get("social.whatsapp"), email: get("social.email")
            };
            const valid = socialUrls(social);
            for (const key of Object.keys(social)) {
                if (social[key] && !valid[key]) return `The ${key} value doesn’t look right.`;
            }

            await ctx.save({
                site: { name: get("site.name"), tagline: get("site.tagline"), footer: get("site.footer"), avatar: get("site.avatar") },
                hero: { title: get("hero.title"), text: get("hero.text"), image: get("hero.image") },
                about: { paragraphs: about.getItems().map((p) => p.text.trim()).filter(Boolean) },
                social,
                sections: Object.fromEntries(Object.entries(sectionSwitches).map(([id, sw]) => [id, sw.get()])),
                maintenance: { enabled: maintenance.get(), message: get("maintenance.message") },
                customCss: fields.customCss.input.value
            });
        })
    );
}
