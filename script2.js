document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("terminal-input");
    const output = document.querySelector(".output");
    const terminal = document.querySelector(".terminal");
  
    const commands = {
      help: `
    Available commands:
      about        - About Garvit Haswani
      projects     - View my projects
      socials      - My social accounts
      themes       - Switch themes
      set-theme    - Set custom theme colors
      gui          - Open my portfolio website
      clear        - Clear the terminal
      `,
      about: `
    Hi, my name is Garvit Haswani.
    I'm a Student living in Kanpur, Uttar Pradesh.
    I am passionate about writing codes and developing web applications.
      `,
      socials: `
    Connect with me:
      GitHub: https://github.com/garvit
      LinkedIn: https://linkedin.com/in/garvit
      `,
      projects: `
    My projects:
      1. Portfolio Website - A showcase of my work
      2. Task Manager App - A web app to manage tasks efficiently
      `,
      themes: `
    Available themes:
      light    - Light mode
      dark     - Dark mode (default)
      blue     - Blue theme
      set-theme - Set custom theme colors (background and text)
    Use: themes <theme-name>
      `,
      gui: `
    Redirecting to my website...
      `,
      clear: "",
    };
  
    // Load persisted theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) document.body.className = savedTheme;
  
    // Typing effect for the terminal output
    function typeEffect(text, callback) {
      let index = 0;
      const interval = setInterval(() => {
        output.innerHTML += text[index];
        index++;
        if (index === text.length) {
          clearInterval(interval);
          if (callback) callback();
        }
      }, 20);
    }
  
    // Handle user input
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const value = input.value.trim();
        input.value = ""; // Clear the input field
  
        // Append user input to the terminal
        output.innerHTML += `\nvisitor@terminal.garvit.dev:~$ ${value}\n`;
  
        // Handle "gui" command
        if (value === "gui") {
          typeEffect(commands.gui, () => {
            window.location.href = "https://your-website.com"; // Replace with your website URL
          });
        }
  
        // Handle "themes" command
        else if (value.startsWith("themes")) {
          const args = value.split(" ");
          if (args.length === 1) {
            typeEffect(commands.themes);
          } else if (args.length === 2) {
            const theme = args[1];
            if (["light", "dark", "blue"].includes(theme)) {
              document.body.className = `theme-${theme}`;
              localStorage.setItem("theme", `theme-${theme}`);
              output.innerHTML += `Theme switched to ${theme}.`;
            } else {
              output.innerHTML += `Invalid theme.`;
            }
          } else {
            output.innerHTML += `Invalid syntax. Use: themes <theme-name>`;
          }
        }
  
        // Handle "set-theme" for custom colors
        else if (value.startsWith("set-theme")) {
          const args = value.split(" ");
          if (args.length === 3) {
            const [_, bgColor, textColor] = args;
            document.body.className = "custom-theme";
            document.body.style.setProperty("--custom-bg-color", bgColor);
            document.body.style.setProperty("--custom-text-color", textColor);
            localStorage.setItem("theme", "custom-theme");
            localStorage.setItem("custom-bg-color", bgColor);
            localStorage.setItem("custom-text-color", textColor);
            output.innerHTML += `Custom theme set with background: ${bgColor}, text: ${textColor}.`;
          } else {
            output.innerHTML += `Invalid syntax. Use: set-theme <bg-color> <text-color>`;
          }
        }
  
        // Handle "clear" command
        else if (value === "clear") {
          output.innerHTML = "";
        }
  
        // Handle predefined commands
        else if (commands[value]) {
          typeEffect(commands[value]);
        }
  
        // Handle "socials" and "projects"
        else if (value === "socials" || value === "projects") {
          typeEffect(commands[value]);
        }
  
        // Handle invalid commands
        else {
          output.innerHTML += `Command not found.`;
          terminal.classList.add("shake");
          setTimeout(() => terminal.classList.remove("shake"), 300);
        }
  
        // Scroll to the bottom of the output
        output.scrollTop = output.scrollHeight;
      }
    });
  
    // Load custom theme colors on page load
    if (savedTheme === "custom-theme") {
      document.body.style.setProperty(
        "--custom-bg-color",
        localStorage.getItem("custom-bg-color")
      );
      document.body.style.setProperty(
        "--custom-text-color",
        localStorage.getItem("custom-text-color")
      );
    }
  });
  