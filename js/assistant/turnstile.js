// ==========================================================
// Human check (Cloudflare Turnstile). Every question gets a fresh,
// single-use token that the assistant service verifies.
// The widget stays invisible unless Cloudflare needs the visitor to tap it.
// ==========================================================

let widgetId = null;
let waiting = null;
let apiLoading = null;

const TIMEOUT_MS = 30000;

function loadApi() {
    if (window.turnstile) return Promise.resolve();
    if (!apiLoading) {
        apiLoading = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => { apiLoading = null; reject(new Error("Couldn’t load the human check. Check your connection.")); };
            document.head.append(script);
        });
    }
    return apiLoading;
}

function settle(error, token) {
    if (!waiting) return;
    const current = waiting;
    waiting = null;
    clearTimeout(current.timer);
    if (error) current.reject(error);
    else current.resolve(token);
}

// Resolves with a fresh token. `container` is where a challenge can appear if one is needed.
export async function getTurnstileToken(siteKey, container) {
    await loadApi();
    if (waiting) throw new Error("The human check is already running.");

    return new Promise((resolve, reject) => {
        waiting = {
            resolve,
            reject,
            timer: setTimeout(() => settle(new Error("The human check took too long. Please try again.")), TIMEOUT_MS)
        };
        try {
            if (widgetId === null) {
                widgetId = window.turnstile.render(container, {
                    sitekey: siteKey,
                    appearance: "interaction-only",
                    execution: "execute",
                    callback: (token) => settle(null, token),
                    "error-callback": () => { settle(new Error("The human check failed. Reload the page and try again.")); return true; },
                    "timeout-callback": () => settle(new Error("The human check timed out. Please try again."))
                });
            } else {
                window.turnstile.reset(widgetId);
            }
            window.turnstile.execute(container);
        } catch (err) {
            settle(err);
        }
    });
}
