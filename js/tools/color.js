// ==========================================================
// Color converter: HEX, RGB and HSL stay in sync.
// ==========================================================
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, parseRgb, parseHsl, contrastRatio } from "./lib.js";
import { $, copyText, flashIcon, setMsg } from "./shared.js";

export function initColor() {
    const root = $("#tool-color");
    const pick = $("#colorPick");
    const hex = $("#colorHex");
    const rgb = $("#colorRgb");
    const hsl = $("#colorHsl");
    const msg = $("#colorMsg");
    const info = $("#colorInfo");

    // Updates every field except the one being typed in
    function show(color, except) {
        const h = rgbToHex(color);
        const s = rgbToHsl(color);
        pick.value = h;
        if (except !== hex) hex.value = h;
        if (except !== rgb) rgb.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
        if (except !== hsl) hsl.value = `hsl(${s.h}, ${s.s}%, ${s.l}%)`;

        const white = contrastRatio(h, "#ffffff").toFixed(1);
        const black = contrastRatio(h, "#000000").toFixed(1);
        info.textContent = `Contrast: ${white}:1 with white text, ${black}:1 with black text.`;
        setMsg(msg);
    }

    pick.addEventListener("input", () => show(hexToRgb(pick.value)));

    hex.addEventListener("input", () => {
        const color = hexToRgb(hex.value);
        if (color) show(color, hex);
        else setMsg(msg, "Enter a HEX color like #0072ff.", "error");
    });

    rgb.addEventListener("input", () => {
        const color = parseRgb(rgb.value);
        if (color) show(color, rgb);
        else setMsg(msg, "Enter RGB like rgb(0, 114, 255). Each number is 0 to 255.", "error");
    });

    hsl.addEventListener("input", () => {
        const parts = parseHsl(hsl.value);
        if (parts) show(hslToRgb(parts), hsl);
        else setMsg(msg, "Enter HSL like hsl(213, 100%, 50%).", "error");
    });

    root.querySelectorAll("[data-copy]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const field = document.getElementById(btn.dataset.copy);
            if (field.value && (await copyText(field.value))) flashIcon(btn);
        });
    });

    show(hexToRgb(pick.value));
}
