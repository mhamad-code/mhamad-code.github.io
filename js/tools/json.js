// ==========================================================
// JSON formatter: format, minify, validate, copy, download.
// ==========================================================
import { locateJsonError } from "./lib.js";
import { $, copyText, download, flashIcon, setMsg } from "./shared.js";

export function initJson() {
    const input = $("#jsonIn");
    const msg = $("#jsonMsg");

    // Returns { value } when the text is valid JSON, otherwise shows the problem and returns null
    function check() {
        const text = input.value;
        if (!text.trim()) {
            setMsg(msg, "Paste some JSON first.", "hint");
            return null;
        }
        try {
            return { value: JSON.parse(text) };
        } catch (err) {
            const spot = locateJsonError(text);
            const text2 = spot
                ? `Invalid JSON at line ${spot.line}, column ${spot.column}: ${spot.reason}.`
                : `Invalid JSON. ${err.message}`;
            setMsg(msg, text2, "error");
            return null;
        }
    }

    $("#jsonFormat").addEventListener("click", () => {
        const result = check();
        if (!result) return;
        input.value = JSON.stringify(result.value, null, 2);
        setMsg(msg, "Valid JSON. Formatted with 2 spaces.");
    });

    $("#jsonMinify").addEventListener("click", () => {
        const result = check();
        if (!result) return;
        input.value = JSON.stringify(result.value);
        setMsg(msg, "Valid JSON. Minified to one line.");
    });

    $("#jsonCopy").addEventListener("click", async (e) => {
        if (!input.value) return;
        if (await copyText(input.value)) flashIcon(e.currentTarget);
    });

    $("#jsonDownload").addEventListener("click", () => {
        if (input.value.trim()) download("data.json", input.value, "application/json");
    });

    $("#jsonClear").addEventListener("click", () => {
        input.value = "";
        setMsg(msg);
        input.focus();
    });

    // Check while typing, after a short pause
    let timer;
    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (!input.value.trim()) return setMsg(msg);
            if (check()) setMsg(msg, `Valid JSON. ${input.value.length} characters.`);
        }, 400);
    });
}
