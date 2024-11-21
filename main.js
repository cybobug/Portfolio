document.addEventListener("DOMContentLoaded", () => {
    const menuIcon = document.getElementById("menu-icon");
    const navbar = document.querySelector(".navbar");
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const body = document.body;

    // Menu Toggle
    menuIcon.addEventListener("click", () => {
        navbar.classList.toggle("active");
        menuIcon.classList.toggle("active");
    });

    // Theme Toggle with System Preference Check
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (savedTheme === null && systemDark)) {
        body.classList.add("dark-mode");
        themeIcon.classList.replace("ri-sun-line", "ri-moon-line");
    }

    themeToggle.addEventListener("click", () => {
        body.classList.toggle("dark-mode");
        const isDarkMode = body.classList.contains("dark-mode");

        if (isDarkMode) {
            themeIcon.classList.replace("ri-sun-line", "ri-moon-line");
            localStorage.setItem("theme", "dark");
        } else {
            themeIcon.classList.replace("ri-moon-line", "ri-sun-line");
            localStorage.setItem("theme", "light");
        }
    });

    // Listen for OS-level theme change (optional)
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
        const isSystemDark = event.matches;
        if (isSystemDark) {
            body.classList.add("dark-mode");
            themeIcon.classList.replace("ri-sun-line", "ri-moon-line");
        } else {
            body.classList.remove("dark-mode");
            themeIcon.classList.replace("ri-moon-line", "ri-sun-line");
        }
        localStorage.removeItem("theme"); // Reset to system preference
    });
});
