// ==========================================================
// Firebase setup, shared by every page that needs auth.
// ==========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./config.js";

// Re-export the auth functions so other files import everything from here
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// False until the placeholder values in config.js are replaced
export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).startsWith("YOUR_"));

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

export const providers = {
    google: new GoogleAuthProvider(),
    github: new GithubAuthProvider()
};
