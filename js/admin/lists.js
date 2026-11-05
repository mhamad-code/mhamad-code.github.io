// Skills, Services, Reviews and FAQ tabs.
import { DEFAULTS } from "../defaults.js";
import { getPath, isIconClass } from "../config-utils.js";
import { el, listEditor, saveBar, heading } from "./form.js";

const saved = (ctx, path) => {
    const v = getPath(ctx.config, path);
    return Array.isArray(v) && v.length ? v : getPath(DEFAULTS, path);
};

const ICON_HINT = "Icons use Font Awesome classes, like “fa-brands fa-github” or “fa-solid fa-star”. Find more at fontawesome.com/icons (free ones).";

const clean = (items, requiredKey) => items
    .map((item) => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])))
    .filter((item) => item[requiredKey]);

function badIcon(items) {
    return items.find((item) => item.icon && !isIconClass(item.icon));
}

export function skillsPanel(box, ctx) {
    const schema = [
        { key: "label", label: "Name", icon: "fa-tag" },
        { key: "icon", label: "Icon class", icon: "fa-icons" }
    ];
    const make = (path) => listEditor({
        items: saved(ctx, path), schema, newItem: { icon: "fa-solid fa-code", label: "" },
        addLabel: "Add skill", title: (item, i) => item.label || `Skill ${i + 1}`
    });
    const row1 = make("skills.row1");
    const row2 = make("skills.row2");

    box.append(
        heading("Top row", ICON_HINT), row1.root,
        heading("Bottom row", "Add at least 6 skills per row so the scrolling looks smooth."), row2.root,
        saveBar(async () => {
            const a = clean(row1.getItems(), "label");
            const b = clean(row2.getItems(), "label");
            const wrong = badIcon(a) || badIcon(b);
            if (wrong) return `“${wrong.icon}” is not a valid icon class. Example: fa-brands fa-github`;
            await ctx.save({ skills: { row1: a, row2: b } });
        })
    );
}

function simpleList(key, { title, hint, schema, newItem, addLabel, required, itemTitle }) {
    return (box, ctx) => {
        const editor = listEditor({ items: saved(ctx, key), schema, newItem, addLabel, title: itemTitle });
        box.append(
            heading(title, hint), editor.root,
            saveBar(async () => {
                const items = clean(editor.getItems(), required);
                const wrong = badIcon(items);
                if (wrong) return `“${wrong.icon}” is not a valid icon class. Example: fa-solid fa-star`;
                await ctx.save({ [key]: items });
            })
        );
    };
}

export const servicesPanel = simpleList("services", {
    title: "Services", hint: ICON_HINT, required: "title", addLabel: "Add service",
    schema: [
        { key: "title", label: "Title", icon: "fa-heading" },
        { key: "icon", label: "Icon class", icon: "fa-icons" },
        { key: "text", label: "Description", icon: "fa-align-left", textarea: true }
    ],
    newItem: { icon: "fa-solid fa-star", title: "", text: "" },
    itemTitle: (item, i) => item.title || `Service ${i + 1}`
});

export const reviewsPanel = simpleList("reviews", {
    title: "Client reviews",
    hint: "Use real reviews, with the client’s permission for their name and photo. Leave the photo empty to show an initial.",
    required: "text", addLabel: "Add review",
    schema: [
        { key: "name", label: "Client name", icon: "fa-user" },
        { key: "role", label: "Project type", icon: "fa-briefcase" },
        { key: "rating", label: "Stars (0 to 5)", icon: "fa-star", type: "number" },
        { key: "photo", label: "Photo link (optional)", icon: "fa-image" },
        { key: "text", label: "Review", icon: "fa-comment", textarea: true }
    ],
    newItem: { name: "", role: "", rating: 5, photo: "", text: "" },
    itemTitle: (item, i) => item.name || `Review ${i + 1}`
});

export const faqPanel = simpleList("faq", {
    title: "Frequently asked questions", hint: "", required: "q", addLabel: "Add question",
    schema: [
        { key: "q", label: "Question", icon: "fa-circle-question" },
        { key: "a", label: "Answer", icon: "fa-align-left", textarea: true }
    ],
    newItem: { q: "", a: "" },
    itemTitle: (item, i) => item.q || `Question ${i + 1}`
});
