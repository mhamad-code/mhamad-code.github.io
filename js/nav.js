// ==========================================================
// Navbar: shows "Login" or the signed-in user with a logout button.
// ==========================================================
import { auth, isConfigured, onAuthStateChanged, signOut } from "./firebase.js";

const slot = document.getElementById("authSlot");

function renderUser(user) {
    const label = user.displayName || user.email || "Account";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    if (user.photoURL) {
        const img = document.createElement("img");
        img.src = user.photoURL;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        avatar.append(img);
    } else {
        avatar.textContent = label.charAt(0).toUpperCase();
    }

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = label;

    const chip = document.createElement("span");
    chip.className = "user-chip";
    chip.append(avatar, name);

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "switch-circle icon-btn";
    logout.setAttribute("aria-label", "Log out");
    logout.title = "Log out";
    logout.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>';
    logout.addEventListener("click", () => signOut(auth));

    slot.replaceChildren(chip, logout);
}

function renderGuest() {
    const link = document.createElement("a");
    link.href = "login.html";
    link.className = "main-btn btn-inline btn-small";
    link.textContent = "Login";
    slot.replaceChildren(link);
}

if (slot && isConfigured) {
    onAuthStateChanged(auth, (user) => (user ? renderUser(user) : renderGuest()));
}
