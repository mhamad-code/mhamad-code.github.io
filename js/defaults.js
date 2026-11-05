// ==========================================================
// What the site shows before you change anything in the admin panel.
// Keep this in sync with index.html: the admin forms start from these values.
// ==========================================================
export const DEFAULTS = {
    site: {
        name: "Mhamad",
        tagline: "Developer building websites and apps.",
        footer: "Mhamad. Built by hand and hosted on GitHub Pages.",
        avatar: "assets/avatar.jpg"
    },
    hero: {
        title: "Hi, I’m Mhamad",
        text: "I build websites and apps. The projects below are pulled live from my GitHub account.",
        image: "assets/hero.jpg"
    },
    about: {
        paragraphs: [
            "I’m Mhamad, a developer who enjoys turning ideas into clean, fast websites and apps. I care about simple design, readable code and the small details that make something feel good to use.",
            "Everything on this site is built by hand, and the projects below come straight from my GitHub account."
        ]
    },
    social: {
        github: "mhamad-code",
        telegram: "MohameedHamra",
        instagram: "mohameed.hamra",
        whatsapp: "963951348968",
        email: "mhamra148@gmail.com"
    },
    skills: {
        row1: [
            { icon: "fa-brands fa-html5", label: "HTML5" },
            { icon: "fa-brands fa-css3-alt", label: "CSS3" },
            { icon: "fa-brands fa-js", label: "JavaScript" },
            { icon: "fa-brands fa-react", label: "React" },
            { icon: "fa-brands fa-node-js", label: "Node.js" },
            { icon: "fa-brands fa-firebase", label: "Firebase" },
            { icon: "fa-brands fa-git-alt", label: "Git" },
            { icon: "fa-brands fa-github", label: "GitHub" },
            { icon: "fa-brands fa-python", label: "Python" }
        ],
        row2: [
            { icon: "fa-brands fa-figma", label: "Figma" },
            { icon: "fa-brands fa-bootstrap", label: "Bootstrap" },
            { icon: "fa-brands fa-sass", label: "Sass" },
            { icon: "fa-brands fa-npm", label: "npm" },
            { icon: "fa-brands fa-linux", label: "Linux" },
            { icon: "fa-solid fa-terminal", label: "Terminal" },
            { icon: "fa-solid fa-mobile-screen", label: "Responsive design" },
            { icon: "fa-solid fa-plug", label: "REST APIs" },
            { icon: "fa-solid fa-database", label: "Databases" }
        ]
    },
    services: [
        { icon: "fa-solid fa-laptop-code", title: "Website development", text: "Fast, clean websites built from scratch, from portfolios to landing pages." },
        { icon: "fa-solid fa-mobile-screen", title: "Responsive UI design", text: "Interfaces that look and feel right on phones, tablets and desktops." },
        { icon: "fa-solid fa-lock", title: "Login and backend setup", text: "Sign-in with email, Google and GitHub, connected through Firebase." }
    ],
    reviews: [
        { name: "Client name", role: "Project type", rating: 5, photo: "https://randomuser.me/api/portraits/men/32.jpg", text: "Replace this text with a real review from one of your clients." },
        { name: "Client name", role: "Project type", rating: 5, photo: "https://randomuser.me/api/portraits/women/44.jpg", text: "Replace this text with a real review from one of your clients." },
        { name: "Client name", role: "Project type", rating: 5, photo: "https://randomuser.me/api/portraits/men/75.jpg", text: "Replace this text with a real review from one of your clients." }
    ],
    faq: [
        { q: "What services do you offer?", a: "I build websites from scratch, design responsive interfaces, and set up login with Firebase (email, Google and GitHub)." },
        { q: "How do I start a project with you?", a: "Send me a message on WhatsApp, Telegram or email with your idea. I’ll reply with questions and a plan." },
        { q: "How long does a project take?", a: "It depends on the size and the features you need. I’ll give you an estimate once I know the details." },
        { q: "Will my website work on phones?", a: "Yes. Every page I build is responsive and tested on small and large screens." },
        { q: "Can you add login to my website?", a: "Yes. I use Firebase to add sign-in with email and password, Google and GitHub." }
    ],
    projects: { homeCount: 7, hidden: [], pinned: [], overrides: [] },
    sections: { about: true, skills: true, services: true, projects: true, reviews: true, faq: true, contact: true },
    maintenance: { enabled: false, message: "The site is being updated. Please come back soon." },
    customCss: ""
};
