// ==========================================================
// Pure helpers for the tools (no DOM, so they are easy to test).
// ==========================================================

/* ---------- Colors ---------- */

export function hexToRgb(value) {
    let h = String(value).trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(h)) h = [...h].map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
    };
}

export const rgbToHex = ({ r, g, b }) =>
    "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

export function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (d) {
        s = d / (1 - Math.abs(2 * l - 1));
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = Math.round(h * 60);
    }
    return { h: (h + 360) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
}

// Accepts "rgb(0, 114, 255)", "0,114,255" or "0 114 255"
export function parseRgb(text) {
    const nums = String(text).match(/\d+(\.\d+)?/g);
    if (!nums || nums.length !== 3) return null;
    const [r, g, b] = nums.map((n) => Math.round(Number(n)));
    return [r, g, b].some((v) => v > 255) ? null : { r, g, b };
}

// Accepts "hsl(213, 100%, 50%)", "213,100,50" or "213 100 50"
export function parseHsl(text) {
    const nums = String(text).match(/\d+(\.\d+)?/g);
    if (!nums || nums.length !== 3) return null;
    const [h, s, l] = nums.map((n) => Math.round(Number(n)));
    return h > 360 || s > 100 || l > 100 ? null : { h: h % 360, s, l };
}

function luminance({ r, g, b }) {
    const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// WCAG contrast ratio between two HEX colors (1 to 21)
export function contrastRatio(hexA, hexB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    if (!a || !b) return 1;
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/* ---------- Passwords ---------- */

const SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{}:;,.?"
};
const LOOKALIKES = /[Il1O0o]/g;

function pools(o) {
    return ["lower", "upper", "digits", "symbols"]
        .filter((key) => o[key])
        .map((key) => (o.noLookalikes ? SETS[key].replace(LOOKALIKES, "") : SETS[key]));
}

// Random integer in [0, max) with no modulo bias
export function randomInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    let x;
    do {
        crypto.getRandomValues(buf);
        x = buf[0];
    } while (x >= limit);
    return x % max;
}

export function generatePassword(o) {
    const sets = pools(o);
    if (!sets.length) return "";
    const length = Math.max(sets.length, o.length);
    const all = sets.join("");

    // One character from every chosen type, the rest from all of them, then shuffle
    const chars = sets.map((set) => set[randomInt(set.length)]);
    while (chars.length < length) chars.push(all[randomInt(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

export function passwordStrength(o) {
    const size = pools(o).join("").length;
    if (!size) return { bits: 0, label: "", percent: 0 };
    const bits = Math.round(o.length * Math.log2(size));
    const label = bits < 40 ? "Weak" : bits < 60 ? "Okay" : bits < 80 ? "Strong" : "Very strong";
    return { bits, label, percent: Math.min(100, bits) };
}

/* ---------- JSON ---------- */

// Finds where a JSON text breaks. Returns null if it is valid, otherwise
// { line, column, reason }. Browsers no longer report the position, so we scan it ourselves.
export function locateJsonError(text) {
    let i = 0;
    const fail = (reason) => { throw { index: i, reason }; };
    const end = () => i >= text.length;
    const ws = () => { while (!end() && " \t\n\r".includes(text[i])) i++; };

    function value() {
        ws();
        const c = text[i];
        if (c === "{") return object();
        if (c === "[") return array();
        if (c === '"') return string();
        if (c === "-" || (c >= "0" && c <= "9")) return number();
        for (const word of ["true", "false", "null"]) {
            if (text.startsWith(word, i)) { i += word.length; return; }
        }
        fail(end() ? "Unexpected end of the text" : `Unexpected character “${c}”`);
    }

    function string() {
        i++; // opening quote
        while (!end()) {
            const c = text[i];
            if (c === '"') { i++; return; }
            if (c === "\\") {
                const n = text[i + 1];
                if (n === "u") {
                    if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) fail("Invalid \\u escape");
                    i += 6;
                    continue;
                }
                if (n === undefined || !'"\\/bfnrt'.includes(n)) fail("Invalid escape after the backslash");
                i += 2;
                continue;
            }
            if (c < " ") fail("Line break or control character inside a string");
            i++;
        }
        fail("The string is missing its closing quote");
    }

    function number() {
        const re = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
        re.lastIndex = i;
        const m = re.exec(text);
        if (!m) fail("Invalid number");
        i += m[0].length;
    }

    function object() {
        i++; ws();
        if (text[i] === "}") { i++; return; }
        for (;;) {
            ws();
            if (text[i] !== '"') fail(end() ? "Unexpected end of the text" : "Expected a property name in double quotes");
            string(); ws();
            if (text[i] !== ":") fail("Expected “:” after the property name");
            i++;
            value(); ws();
            if (text[i] === ",") { i++; continue; }
            if (text[i] === "}") { i++; return; }
            fail(end() ? "Unexpected end of the text" : "Expected “,” or “}”");
        }
    }

    function array() {
        i++; ws();
        if (text[i] === "]") { i++; return; }
        for (;;) {
            value(); ws();
            if (text[i] === ",") { i++; continue; }
            if (text[i] === "]") { i++; return; }
            fail(end() ? "Unexpected end of the text" : "Expected “,” or “]”");
        }
    }

    try {
        value(); ws();
        if (!end()) fail("Unexpected data after the end of the JSON");
        return null;
    } catch (e) {
        if (e && typeof e.index === "number") {
            const before = text.slice(0, e.index).split("\n");
            return { line: before.length, column: before[before.length - 1].length + 1, reason: e.reason };
        }
        return null; // too deeply nested to scan; the caller falls back to the browser message
    }
}

/* ---------- QR ---------- */

// The QR library reads one character per byte, so give it the UTF-8 bytes
// (this keeps Arabic text and emoji working).
export function utf8Binary(text) {
    let out = "";
    for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte);
    return out;
}
