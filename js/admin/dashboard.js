// Visitors tab: counters, a 14-day chart and the most visited pages.
import { getStats } from "../db.js";
import { summarizeStats, pageLabel } from "../config-utils.js";
import { createLoader } from "../loader.js";
import { el, heading, setMsg, explainError } from "./form.js";

function statCard(big, label, small) {
    const card = el("div", "item-card stat");
    card.append(el("strong", "stat-num", String(big)), el("span", "", label), el("small", "", small));
    return card;
}

export async function dashboard(box) {
    box.replaceChildren(createLoader(true));

    let data;
    try {
        data = await getStats(30);
    } catch (err) {
        console.error(err);
        const msg = el("p", "form-msg");
        setMsg(msg, explainError(err), "error");
        box.replaceChildren(msg);
        return;
    }

    const s = summarizeStats(data.rows);
    const grid = el("div", "stat-grid");
    grid.append(
        statCard(s.today.unique, "Visitors today", `${s.today.visits} page views`),
        statCard(s.last7.unique, "Last 7 days", `${s.last7.visits} page views`),
        statCard(s.last30.unique, "Last 30 days", `${s.last30.visits} page views`),
        statCard(data.total.newVisitors || 0, "New visitors, all time", `${data.total.visits || 0} page views`)
    );

    const max = Math.max(1, ...s.chart.map((c) => c.visits));
    const bars = el("div", "bars");
    s.chart.forEach((c) => {
        const bar = el("div", "bar");
        bar.title = `${c.day}: ${c.visits} page views`;
        const fill = el("i");
        fill.style.height = c.visits ? `${Math.max(4, Math.round((c.visits / max) * 120))}px` : "3px";
        bar.append(fill, el("span", "", String(Number(c.day.slice(8)))));
        bars.append(bar);
    });

    const top = el("ul", "top-list");
    if (s.topPages.length) {
        s.topPages.forEach((p) => {
            const li = el("li");
            li.append(el("span", "", pageLabel(p.name)), el("b", "", String(p.count)));
            top.append(li);
        });
    } else {
        top.append(el("li", "", "No visits recorded yet."));
    }

    const note = el("p", "meter-label",
        "A visitor is counted once per day on each device. Your own visits and visits from localhost are not counted.");

    box.replaceChildren(
        heading("Visitors", "Counted from the day you published the Firestore rules."),
        grid,
        heading("Page views, last 14 days"),
        bars,
        heading("Most visited pages (30 days)"),
        top,
        note
    );
}
