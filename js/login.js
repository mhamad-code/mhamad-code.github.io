// ==========================================================
// Login page: card flip, password toggle, Firebase sign in/up.
// ==========================================================
import {
    auth, providers, isConfigured, onAuthStateChanged,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
    signInWithPopup, sendPasswordResetEmail,
    setPersistence, browserLocalPersistence, browserSessionPersistence
} from "./firebase.js";

const HOME = "index.html";
const card = document.getElementById("authCard");
const loginPanel = card.querySelector(".login-panel");
const signupPanel = card.querySelector(".signup-panel");
const loginMsg = document.getElementById("loginMsg");
const signupMsg = document.getElementById("signupMsg");

let busy = false; // stops the "already signed in" redirect from interrupting a sign-up

/* ---------- UI helpers ---------- */

// Only the visible side of the card can be focused
signupPanel.inert = true;

function flipCard() {
    card.classList.toggle("flipped");
    const showingSignup = card.classList.contains("flipped");
    loginPanel.inert = showingSignup;
    signupPanel.inert = !showingSignup;
}

document.querySelectorAll("[data-flip]").forEach((btn) => btn.addEventListener("click", flipCard));

document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.toggle);
        const icon = btn.querySelector("i");
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        icon.classList.toggle("fa-eye", !show);
        icon.classList.toggle("fa-eye-slash", show);
    });
});

function showMsg(el, text, type = "info") {
    el.className = "auth-msg" + (type === "error" ? " is-error" : "");
    const icon = document.createElement("i");
    icon.className = "fa-solid " + (type === "error" ? "fa-circle-exclamation" : "fa-circle-check");
    el.replaceChildren(icon, document.createTextNode(text));
}

const ERRORS = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups and try again.",
    "auth/account-exists-with-different-credential": "This email is already registered with another sign-in method.",
    "auth/unauthorized-domain": "This domain isn’t authorized in Firebase. Add it under Authentication > Settings > Authorized domains.",
    "auth/operation-not-allowed": "This sign-in method isn’t enabled in Firebase yet.",
    "auth/network-request-failed": "Network error. Check your connection."
};

const friendly = (err) => ERRORS[err.code] || "Something went wrong. Please try again.";

// Runs an auth action with loading state, error handling and redirect
async function run(msgEl, button, action) {
    if (!isConfigured) {
        showMsg(msgEl, "Firebase isn’t set up yet. Add your config in js/config.js.", "error");
        return;
    }
    busy = true;
    const oldText = button?.textContent;
    if (button) button.disabled = true;
    try {
        await action();
        if (button) button.textContent = "✓ SUCCESS";
        setTimeout(() => location.replace(HOME), 800);
    } catch (err) {
        busy = false;
        if (button) {
            button.disabled = false;
            button.textContent = oldText;
        }
        showMsg(msgEl, friendly(err), "error");
    }
}

/* ---------- Email + password ---------- */

document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const remember = document.getElementById("rememberMe").checked;

    run(loginMsg, e.submitter, async () => {
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmailAndPassword(auth, email, password);
    });
});

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password !== confirm) {
        showMsg(signupMsg, "Passwords don’t match.", "error");
        return;
    }

    run(signupMsg, e.submitter, async () => {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
    });
});

/* ---------- Google and GitHub ---------- */

document.querySelectorAll("[data-provider]").forEach((btn) => {
    btn.addEventListener("click", () => {
        const msgEl = btn.closest(".form-panel").querySelector(".auth-msg");
        run(msgEl, null, () => signInWithPopup(auth, providers[btn.dataset.provider]));
    });
});

/* ---------- Forgot password ---------- */

document.getElementById("forgotBtn").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    if (!isConfigured) {
        showMsg(loginMsg, "Firebase isn’t set up yet. Add your config in js/config.js.", "error");
        return;
    }
    if (!email) {
        showMsg(loginMsg, "Type your email above first, then tap Forgot Password.", "error");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showMsg(loginMsg, "Reset link sent. Check your inbox.");
    } catch (err) {
        showMsg(loginMsg, friendly(err), "error");
    }
});

/* ---------- Already signed in ---------- */

if (isConfigured) {
    onAuthStateChanged(auth, (user) => {
        if (user && !busy) location.replace(HOME);
    });
}
