// Mobile menu, skills marquee, footer year
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");

function setMenu(open) {
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open);
    toggle.querySelector("i").className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
}

toggle.addEventListener("click", () => setMenu(!links.classList.contains("open")));
links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

// Duplicate each marquee row once so the loop has no gap
document.querySelectorAll(".marquee-track").forEach((track) => {
    [...track.children].forEach((item) => {
        const copy = item.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        track.append(copy);
    });
});

document.getElementById("year").textContent = new Date().getFullYear();
