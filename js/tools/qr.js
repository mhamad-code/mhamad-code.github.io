// ==========================================================
// QR code tool: draws on a canvas, downloads PNG or SVG.
// Needs the "qrcode-generator" script (loaded in tools.html).
// ==========================================================
import { utf8Binary, contrastRatio } from "./lib.js";
import { $, download, setMsg } from "./shared.js";

export function initQr() {
    const text = $("#qrText");
    const size = $("#qrSize");
    const sizeOut = $("#qrSizeOut");
    const fg = $("#qrFg");
    const bg = $("#qrBg");
    const stage = $(".qr-stage");
    const canvas = $("#qrCanvas");
    const msg = $("#qrMsg");
    const pngBtn = $("#qrPng");
    const svgBtn = $("#qrSvg");

    const QUIET = 4; // blank border around the code, in modules
    let model = null;

    function clear(message, type) {
        model = null;
        stage.hidden = true;
        pngBtn.disabled = svgBtn.disabled = true;
        setMsg(msg, message, type);
    }

    function draw() {
        const count = model.getModuleCount();
        const total = count + QUIET * 2;
        const px = Math.max(1, Math.floor(size.value / total));
        canvas.width = canvas.height = px * total;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bg.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = fg.value;
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (model.isDark(r, c)) ctx.fillRect((c + QUIET) * px, (r + QUIET) * px, px, px);
            }
        }

        stage.hidden = false;
        pngBtn.disabled = svgBtn.disabled = false;
        const low = contrastRatio(fg.value, bg.value) < 3;
        setMsg(msg, low ? "Low contrast: this code may be hard to scan." : "", "error");
    }

    function render() {
        sizeOut.textContent = size.value;
        if (!text.value.trim()) return clear("Type a link or some text to make a code.", "hint");
        if (typeof qrcode !== "function") return clear("The QR library didn’t load. Check your connection and refresh.", "error");

        try {
            const qr = qrcode(0, "M");
            qr.addData(utf8Binary(text.value));
            qr.make();
            model = qr;
        } catch {
            return clear("This text is too long for a QR code. Shorten it and try again.", "error");
        }
        draw();
    }

    pngBtn.addEventListener("click", () => {
        canvas.toBlob((blob) => blob && download("qrcode.png", blob));
    });

    svgBtn.addEventListener("click", () => {
        if (!model) return;
        const count = model.getModuleCount();
        const total = count + QUIET * 2;
        let path = "";
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (model.isDark(r, c)) path += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
            }
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.value}" height="${size.value}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`
            + `<rect width="${total}" height="${total}" fill="${bg.value}"/><path d="${path}" fill="${fg.value}"/></svg>`;
        download("qrcode.svg", svg, "image/svg+xml");
    });

    [text, size, fg, bg].forEach((el) => el.addEventListener("input", render));

    text.value = new URL("./", location.href).href; // starts with a code for this site
    render();
}
