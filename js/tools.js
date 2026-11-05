// ==========================================================
// Tools page: tabs (keyboard friendly, remembered in the URL hash)
// and start-up of every tool. To add a tool: add a tab, a panel,
// a file in js/tools/ and one line in each list below.
// ==========================================================
import { initQr } from "./tools/qr.js";
import { initPassword } from "./tools/password.js";
import { initJson } from "./tools/json.js";
import { initColor } from "./tools/color.js";

const IDS = ["qr", "password", "json", "color"];
const tabs = Object.fromEntries(IDS.map((id) => [id, document.getElementById(`tab-${id}`)]));
const panels = Object.fromEntries(IDS.map((id) => [id, document.getElementById(`tool-${id}`)]));

function show(id, focus = false) {
    if (!IDS.includes(id)) id = IDS[0];
    IDS.forEach((name) => {
        const on = name === id;
        tabs[name].setAttribute("aria-selected", String(on));
        tabs[name].tabIndex = on ? 0 : -1;
        panels[name].hidden = !on;
    });
    if (focus) tabs[id].focus();
}

IDS.forEach((id, index) => {
    tabs[id].addEventListener("click", () => {
        show(id);
        history.replaceState(null, "", "#" + id);
    });

    tabs[id].addEventListener("keydown", (e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = IDS[(index + step + IDS.length) % IDS.length];
        show(next, true);
        history.replaceState(null, "", "#" + next);
    });
});

window.addEventListener("hashchange", () => show(location.hash.slice(1)));

initQr();
initPassword();
initJson();
initColor();
show(location.hash.slice(1));
