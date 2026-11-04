// Blog list page: cards + search
import { el, getPosts, formatDate, stateBlock } from "./blog-data.js";

const grid = document.getElementById("postsGrid");
const search = document.getElementById("search");
const countEl = document.getElementById("resultCount");

function metaItem(iconClass, text) {
    const span = el("span");
    span.append(el("i", iconClass), document.createTextNode(text));
    return span;
}

function postCard(post) {
    const url = `post.html?slug=${encodeURIComponent(post.slug)}`;
    const card = el("article", "project-card post-card");

    const cover = el("a", "post-cover");
    cover.href = url;
    cover.setAttribute("aria-hidden", "true");
    cover.tabIndex = -1;
    const img = el("img");
    img.src = post.image;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove()); // keeps the gradient if the image is missing
    cover.append(img);

    const meta = el("div", "card-meta");
    meta.append(metaItem("fa-solid fa-user", post.author), metaItem("fa-regular fa-calendar", formatDate(post.date)));

    const title = el("h3");
    const titleLink = el("a", "", post.title);
    titleLink.href = url;
    title.append(titleLink);

    const desc = el("p", "card-desc", post.description);

    const actions = el("div", "card-actions");
    const read = el("a", "main-btn btn-inline btn-small", "Read post");
    read.href = url;
    actions.append(read);

    card.append(cover, meta, title, desc, actions);
    return card;
}

function render(posts, query = "") {
    const q = query.trim().toLowerCase();
    const list = q
        ? posts.filter((p) => `${p.title} ${p.description} ${p.author}`.toLowerCase().includes(q))
        : posts;

    countEl.textContent = q ? `${list.length} of ${posts.length} posts` : `${posts.length} posts`;

    if (!list.length) {
        const text = q ? `No posts match “${query.trim()}”.` : "No posts yet.";
        grid.replaceChildren(stateBlock("fa-solid fa-feather", text));
        return;
    }
    grid.replaceChildren(...list.map(postCard));
}

async function init() {
    grid.replaceChildren(stateBlock("fa-solid fa-spinner fa-spin", "Loading posts…"));
    try {
        const posts = await getPosts();
        render(posts);
        search.addEventListener("input", () => render(posts, search.value));
    } catch (err) {
        console.error(err);
        grid.replaceChildren(stateBlock("fa-solid fa-circle-exclamation", "Couldn’t load the posts. Refresh the page and try again."));
    }
}

init();
