Adding login to a static website sounds hard, but Firebase makes it a short job. Here is how I did it for this portfolio.

## 1. Create the project

Open the Firebase console, create a project, then add a **Web app** and copy its config.

## 2. Initialize Firebase

~~~js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
~~~

## 3. Sign in with Google

~~~js
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

await signInWithPopup(auth, new GoogleAuthProvider());
~~~

## 4. Authorize your domain

In **Authentication > Settings > Authorized domains**, add your GitHub Pages domain, for example `mhamad-code.github.io`.

> Without this step the pop-up fails with an `unauthorized-domain` error.

## Run it locally

~~~bash
python3 -m http.server 8000
~~~
