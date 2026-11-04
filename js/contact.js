// Contact form: sends the message to your inbox through FormSubmit
const ENDPOINT = "https://formsubmit.co/ajax/mhamra148@gmail.com";

const form = document.getElementById("contactForm");
const msg = document.getElementById("contactMsg");

function showMsg(text, isError = false) {
    msg.className = "form-msg" + (isError ? " is-error" : "");
    const icon = document.createElement("i");
    icon.className = "fa-solid " + (isError ? "fa-circle-exclamation" : "fa-circle-check");
    msg.replaceChildren(icon, document.createTextNode(text));
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if (data.get("_honey")) return; // bot filled the hidden field

    const button = form.querySelector("button[type=submit]");
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Sending…";
    msg.textContent = "";

    try {
        const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                name: data.get("name"),
                email: data.get("email"),
                message: data.get("message"),
                _subject: `New message from ${data.get("name")} (portfolio)`,
                _template: "table"
            })
        });
        const result = await res.json();
        if (!res.ok || String(result.success) !== "true") throw new Error(result.message || "Request failed");

        button.textContent = "✓ SENT";
        showMsg("Thanks! Your message was sent. I’ll reply by email.");
        form.reset();
        setTimeout(() => { button.textContent = oldText; button.disabled = false; }, 2500);
    } catch (err) {
        console.error(err);
        showMsg("Couldn’t send your message. Try again, or write to me from the links in the footer.", true);
        button.textContent = oldText;
        button.disabled = false;
    }
});
