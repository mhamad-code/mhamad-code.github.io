// 3D loader: the letters of the name jump up and down in a wave.
// Returns a DOM element so any file can show it while it loads.
export function createLoader(small = false, word = "Mohammed") {
    const box = document.createElement("div");
    box.className = "loader3d" + (small ? " small" : "");
    box.setAttribute("role", "status");
    box.setAttribute("aria-label", "Loading");

    [...word].forEach((char, i) => {
        const letter = document.createElement("span");
        letter.textContent = char;
        letter.style.setProperty("--i", i);
        letter.setAttribute("aria-hidden", "true");
        box.append(letter);
    });
    return box;
}
