// Blog tab: write, edit, publish and delete posts (stored in Firestore).
import { getAllPosts, savePost, deletePost } from "../db.js";
import { slugify, isSlug, safeUrl, dayKey } from "../config-utils.js";
import { createLoader } from "../loader.js";
import { el, field, toggle, button, heading, saveBar, setMsg, explainError } from "./form.js";

const DEFAULT_IMAGE = "assets/blog/welcome.svg";

export async function blogPanel(box, ctx) {
    async function showList() {
        box.replaceChildren(createLoader(true));
        let posts;
        try {
            posts = await getAllPosts();
        } catch (err) {
            console.error(err);
            const msg = el("p", "form-msg");
            setMsg(msg, explainError(err), "error");
            box.replaceChildren(msg);
            return;
        }

        const items = posts.map((post) => {
            const card = el("div", "item-card");
            const head = el("div", "item-head");
            head.append(el("strong", "", post.title || post.slug));
            head.append(button("Edit", "fa-pen", () => showEditor(post)));
            card.append(head, el("p", "meter-label", `${post.date || ""} · ${post.published ? "Published" : "Draft"} · ${post.slug}`));
            return card;
        });

        box.replaceChildren(
            heading("Posts", "Posts written here appear on the blog next to the ones in the posts folder."),
            button("New post", "fa-plus", () => showEditor(null)),
            el("div", "list-items"),
            el("p", "meter-label", posts.length ? "" : "No posts written here yet.")
        );
        box.querySelector(".list-items").append(...items);
    }

    function showEditor(post) {
        const isNew = !post;
        const data = post || { slug: "", title: "", author: "Mhamad", date: dayKey(), description: "", image: "", markdown: "", published: false };

        const title = field({ label: "Title", value: data.title, icon: "fa-heading" });
        const slug = field({ label: "Address (a-z, 0-9 and dashes)", value: data.slug, icon: "fa-link" });
        const author = field({ label: "Author", value: data.author, icon: "fa-user" });
        const date = field({ label: "Date (YYYY-MM-DD)", value: data.date, icon: "fa-calendar" });
        const description = field({ label: "Short description", value: data.description, icon: "fa-align-left", textarea: true, short: true });
        const image = field({ label: `Cover image (link or assets/..., default ${DEFAULT_IMAGE})`, value: data.image, icon: "fa-image" });
        const body = field({ label: "Post text (Markdown)", value: data.markdown, icon: "fa-code", textarea: true, tall: true, code: true });
        const published = toggle("Published", data.published, "Off keeps it as a draft nobody else can see.");

        if (!isNew) slug.input.readOnly = true;
        let slugTouched = !isNew;
        slug.input.addEventListener("input", () => { slugTouched = true; });
        title.input.addEventListener("input", () => {
            if (!slugTouched) slug.input.value = slugify(title.input.value);
        });

        const preview = el("div", "post-body prose");
        preview.hidden = true;
        const previewBtn = button("Preview", "fa-eye", () => {
            if (!preview.hidden) { preview.hidden = true; return; }
            if (window.marked && window.DOMPurify) {
                preview.innerHTML = window.DOMPurify.sanitize(window.marked.parse(body.input.value));
            } else {
                preview.textContent = "The preview tools didn’t load. Check your connection and reload.";
            }
            preview.hidden = false;
        });

        const actions = el("div", "tool-actions");
        actions.append(button("Back to posts", "fa-arrow-left", showList), previewBtn);
        if (!isNew) {
            actions.append(button("Delete", "fa-trash", async () => {
                if (!confirm(`Delete “${data.title}” for good?`)) return;
                try {
                    await deletePost(data.slug);
                    showList();
                } catch (err) {
                    console.error(err);
                    alert(explainError(err));
                }
            }));
        }

        box.replaceChildren(
            heading(isNew ? "New post" : "Edit post"),
            title.root, slug.root, author.root, date.root, description.root, image.root, body.root, published.root,
            actions, preview,
            saveBar(async () => {
                const post = {
                    slug: slug.input.value.trim(),
                    title: title.input.value.trim(),
                    author: author.input.value.trim() || "Mhamad",
                    date: date.input.value.trim(),
                    description: description.input.value.trim(),
                    image: image.input.value.trim() || DEFAULT_IMAGE,
                    markdown: body.input.value,
                    published: published.get()
                };
                if (!post.title) return "Give the post a title.";
                if (!isSlug(post.slug)) return "The address can only use a-z, 0-9 and single dashes (for example my-first-post).";
                if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) return "Write the date like 2026-11-05.";
                if (!safeUrl(post.image)) return "The cover image must be a https:// link or a file inside assets/.";
                if (!post.markdown.trim()) return "The post text is empty.";
                await savePost(post);
                slug.input.readOnly = true;
            })
        );
    }

    showList();
}
