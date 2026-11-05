// ==========================================================
// Password generator (uses the browser's secure random numbers).
// ==========================================================
import { generatePassword, passwordStrength } from "./lib.js";
import { $, copyText, flashIcon, setMsg } from "./shared.js";

export function initPassword() {
    const out = $("#pwOut");
    const len = $("#pwLen");
    const lenOut = $("#pwLenOut");
    const bar = $("#pwBar");
    const label = $("#pwLabel");
    const msg = $("#pwMsg");
    const boxes = {
        upper: $("#pwUpper"),
        lower: $("#pwLower"),
        digits: $("#pwDigits"),
        symbols: $("#pwSymbols"),
        noLookalikes: $("#pwClean")
    };

    const options = () => ({
        length: Number(len.value),
        upper: boxes.upper.checked,
        lower: boxes.lower.checked,
        digits: boxes.digits.checked,
        symbols: boxes.symbols.checked,
        noLookalikes: boxes.noLookalikes.checked
    });

    function make() {
        lenOut.textContent = len.value;
        const o = options();

        if (!(o.upper || o.lower || o.digits || o.symbols)) {
            out.value = "";
            bar.style.width = "0";
            label.textContent = "";
            setMsg(msg, "Pick at least one type of character.", "error");
            return;
        }

        setMsg(msg);
        out.value = generatePassword(o);
        const strength = passwordStrength(o);
        bar.style.width = strength.percent + "%";
        label.textContent = `${strength.label} · about ${strength.bits} bits`;
    }

    len.addEventListener("input", make);
    Object.values(boxes).forEach((box) => box.addEventListener("change", make));
    $("#pwNew").addEventListener("click", make);

    $("#pwCopy").addEventListener("click", async (e) => {
        if (!out.value) return;
        if (await copyText(out.value)) {
            flashIcon(e.currentTarget);
            setMsg(msg);
        } else {
            setMsg(msg, "Couldn’t copy. Select the password and copy it by hand.", "error");
        }
    });

    make();
}
