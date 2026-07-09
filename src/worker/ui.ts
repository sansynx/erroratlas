import type { Env } from "./types";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return char;
    }
  });
}

function themeBootScript(): string {
  return `<script>
(() => {
  const key = "erroratlas-theme";
  const root = document.documentElement;
  let stored = null;
  try { stored = localStorage.getItem(key); } catch (_error) {}
  const initial = stored || "light";
  root.dataset.theme = initial;
  function apply(theme) {
    root.dataset.theme = theme;
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
      toggle.dataset.mode = theme;
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("themeToggle");
    const nav = document.querySelector(".nav");
    const menu = document.getElementById("navMenu");
    function closeMenu() {
      if (!nav || !menu) return;
      nav.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
    }
    apply(root.dataset.theme || initial);
    if (toggle) {
      toggle.addEventListener("click", () => {
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        try { localStorage.setItem(key, next); } catch (_error) {}
        apply(next);
      });
    }
    if (nav && menu) {
      menu.addEventListener("click", () => {
        const next = !nav.classList.contains("open");
        nav.classList.toggle("open", next);
        menu.setAttribute("aria-expanded", String(next));
      });
      nav.addEventListener("click", (event) => {
        if (!(event.target instanceof HTMLElement)) return;
        const control = event.target.closest(".nav-links a, .nav-links button");
        if (control && control.id !== "themeToggle") closeMenu();
      });
      window.addEventListener("scroll", closeMenu, { passive: true });
      document.addEventListener("click", (event) => {
        if (event.target instanceof Node && !nav.contains(event.target)) closeMenu();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
      });
    }
  });
})();
</script>`;
}

function sharedCss(): string {
  return `<style>
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap");

:root {
  color-scheme: light;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-16: 64px;
  --spacing-24: 96px;
  --background-100: #ffffff;
  --background-200: #fafafa;
  --background-300: #f2f2f2;
  --gray-100: #f2f2f2;
  --gray-200: #ebebeb;
  --gray-300: #e6e6e6;
  --gray-400: #eaeaea;
  --gray-500: #c9c9c9;
  --gray-600: #a8a8a8;
  --gray-700: #8f8f8f;
  --gray-800: #7d7d7d;
  --gray-900: #4d4d4d;
  --gray-1000: #171717;
  --gray-alpha-100: #0000000d;
  --gray-alpha-200: #00000015;
  --gray-alpha-300: #0000001a;
  --gray-alpha-400: #00000014;
  --gray-alpha-500: #00000036;
  --blue-100: #f0f7ff;
  --blue-200: #e9f4ff;
  --blue-300: #dfefff;
  --blue-400: #cae7ff;
  --blue-500: #94ccff;
  --blue-600: #48aeff;
  --blue-700: #006bff;
  --blue-800: #0059ec;
  --blue-900: #005ff2;
  --blue-1000: #002359;
  --red-100: #ffeeef;
  --red-200: #ffe8ea;
  --red-300: #ffe3e4;
  --red-400: #ffd7d6;
  --red-500: #ffb1b3;
  --red-600: #ff676d;
  --red-700: #fc0035;
  --red-800: #ea001d;
  --red-900: #d8001b;
  --red-1000: #47000c;
  --amber-100: #fff6de;
  --amber-200: #fff4cf;
  --amber-300: #fff1c1;
  --amber-400: #ffdc73;
  --amber-500: #ffc543;
  --amber-600: #ffa600;
  --amber-700: #ffae00;
  --amber-800: #ff9300;
  --amber-900: #aa4d00;
  --amber-1000: #561900;
  --green-100: #ecfdec;
  --green-200: #e5fce7;
  --green-300: #d3fad1;
  --green-400: #b9f5bc;
  --green-500: #82eb8d;
  --green-600: #4ce15e;
  --green-700: #28a948;
  --green-800: #279141;
  --green-900: #107d32;
  --green-1000: #003a00;
  --teal-100: #defffb;
  --teal-200: #ddfef6;
  --teal-300: #ccf9f1;
  --teal-400: #b1f7ec;
  --teal-500: #52f0db;
  --teal-600: #00e3c4;
  --teal-700: #00ac96;
  --teal-800: #00927f;
  --teal-900: #007f70;
  --teal-1000: #003f34;
  --purple-100: #faf0ff;
  --purple-200: #f9f0ff;
  --purple-300: #f6e8ff;
  --purple-400: #f2d9ff;
  --purple-500: #dfa7ff;
  --purple-600: #c979ff;
  --purple-700: #a000f8;
  --purple-800: #8500d1;
  --purple-900: #7d00cc;
  --purple-1000: #2f004e;
  --pink-100: #ffe8f6;
  --pink-200: #ffe8f3;
  --pink-300: #ffdfeb;
  --pink-400: #ffd3e1;
  --pink-500: #fdb3cc;
  --pink-600: #f97ea7;
  --pink-700: #f22782;
  --pink-800: #e4106e;
  --pink-900: #c41562;
  --pink-1000: #460523;
  --font-sans: "Geist Sans", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --easing-soft: cubic-bezier(0.175, 0.885, 0.32, 1.1);
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --page-width: 1200px;
  --container-gap: 32px;
  --bg: var(--background-100);
  --surface: var(--background-100);
  --surface-2: var(--background-200);
  --fg: var(--gray-1000);
  --body: var(--gray-900);
  --muted: var(--gray-700);
  --line: var(--gray-300);
  --line-strong: var(--gray-400);
  --accent: var(--blue-700);
  --good: var(--green-700);
  --warn: var(--amber-700);
  --bad: var(--red-700);
  --shadow: 0 2px 2px rgba(0, 0, 0, 0.04);
  --shadow-popover: 0 1px 1px rgba(0, 0, 0, 0.02), 0 4px 8px -4px rgba(0, 0, 0, 0.04), 0 16px 24px -8px rgba(0, 0, 0, 0.06);
  --shadow-modal: 0 1px 1px rgba(0, 0, 0, 0.02), 0 8px 16px -4px rgba(0, 0, 0, 0.04), 0 24px 32px -8px rgba(0, 0, 0, 0.06);
}

html[data-theme="dark"] {
  color-scheme: dark;
  --background-100: #0f0f0f;
  --background-200: #171717;
  --background-300: #262626;
  --gray-100: #2a2a2a;
  --gray-200: #333333;
  --gray-300: #3f3f3f;
  --gray-400: #555555;
  --gray-500: #6f6f6f;
  --gray-600: #8d8d8d;
  --gray-700: #a5a5a5;
  --gray-800: #c0c0c0;
  --gray-900: #dadada;
  --gray-1000: #f2f2f2;
  --gray-alpha-100: #ffffff0d;
  --gray-alpha-200: #ffffff15;
  --gray-alpha-300: #ffffff1a;
  --gray-alpha-400: #ffffff14;
  --gray-alpha-500: #ffffff36;
  --blue-100: #0f1f40;
  --blue-200: #11305f;
  --blue-300: #0f3e75;
  --blue-400: #114e8f;
  --blue-500: #1d6cc1;
  --blue-600: #2f8ef5;
  --blue-700: #4f9cff;
  --blue-800: #7db8ff;
  --blue-900: #8fc4ff;
  --blue-1000: #dbeaff;
  --red-100: #3a0f17;
  --red-200: #56101d;
  --red-300: #6f1022;
  --red-400: #8d1528;
  --red-500: #a21a2f;
  --red-600: #bd2441;
  --red-700: #ff5c5c;
  --red-800: #ff7c8d;
  --red-900: #ff9aa8;
  --red-1000: #ffd3da;
  --amber-100: #3a310a;
  --amber-200: #4b3d0f;
  --amber-300: #624915;
  --amber-400: #7d5f1c;
  --amber-500: #9f7e25;
  --amber-600: #c29d2f;
  --amber-700: #ffbb43;
  --amber-800: #ffd37e;
  --amber-900: #ffe4a8;
  --amber-1000: #fff7df;
  --green-100: #0c2e0f;
  --green-200: #0f3d15;
  --green-300: #13521e;
  --green-400: #186626;
  --green-500: #208231;
  --green-600: #2ca341;
  --green-700: #4dce74;
  --green-800: #6de18a;
  --green-900: #a7efae;
  --green-1000: #dffce5;
  --teal-100: #0b2e2c;
  --teal-200: #0d3f3b;
  --teal-300: #10524e;
  --teal-400: #166760;
  --teal-500: #1f7f79;
  --teal-600: #29a29c;
  --teal-700: #1ed3b3;
  --teal-800: #33e0d5;
  --teal-900: #5debe4;
  --teal-1000: #c8f6f2;
  --purple-100: #2a1240;
  --purple-200: #33174f;
  --purple-300: #411d60;
  --purple-400: #5a277f;
  --purple-500: #7a32a9;
  --purple-600: #9f4ccc;
  --purple-700: #bf5cff;
  --purple-800: #d083ff;
  --purple-900: #e8b4ff;
  --purple-1000: #f8edff;
  --pink-100: #3d1025;
  --pink-200: #571333;
  --pink-300: #7a1e4b;
  --pink-400: #a02d63;
  --pink-500: #c63f7d;
  --pink-600: #e75b95;
  --pink-700: #ff6cab;
  --pink-800: #ff96c6;
  --pink-900: #ffc4e2;
  --pink-1000: #ffe8f5;
  --bg: var(--background-100);
  --surface: #131313;
  --surface-2: var(--background-200);
  --fg: var(--gray-1000);
  --body: var(--gray-900);
  --muted: var(--gray-700);
  --line: var(--gray-300);
  --line-strong: var(--gray-400);
  --accent: var(--blue-700);
  --good: var(--green-700);
  --warn: var(--amber-700);
  --bad: var(--red-700);
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

* { box-sizing: border-box; }
html {
  min-width: 320px;
  scroll-behavior: smooth;
}
body {
  margin: 0;
  overflow-x: hidden;
  min-height: 100%;
  background-color: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  animation: pageIn 420ms ease-out both;
  transition: background-color 180ms ease, color 180ms ease;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
button, input, textarea, select { font: inherit; }
pre, code, kbd, samp { font-family: var(--font-mono); }
[hidden] { display: none !important; }
button { cursor: pointer; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.content-shell {
  width: min(var(--page-width), calc(100vw - 40px));
  margin-left: auto;
  margin-right: auto;
}
.shell {
  width: min(var(--page-width), calc(100vw - 40px));
  margin: 0 auto;
}
.shell.narrow { width: min(1060px, calc(100vw - 48px)); }
.nav {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 0;
  position: relative;
  transition: border-radius 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.brand {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.nav-links { display: flex; align-items: center; gap: 10px; color: var(--body); }
.nav-links a,
.nav-links button { display: inline-flex; align-items: center; justify-content: center; }
.nav-actions {
  display: contents;
}
.nav-menu {
    display: none;
    min-height: 38px;
    min-width: 44px;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    padding: 0;
    background: transparent;
    color: var(--fg);
    line-height: 1;
    transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
  }
.button, .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    min-width: 0;
    height: 40px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 0 12px;
    background: transparent;
    color: var(--fg);
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
    text-wrap: nowrap;
    transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }
.theme-toggle {
  width: 40px;
  min-width: 40px;
  padding: 0;
  border-radius: var(--radius-full);
  background: var(--surface);
  overflow: hidden;
}
.theme-toggle-icon {
  position: relative;
  display: block;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: currentColor;
  transform: rotate(-18deg);
  transition: background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.theme-toggle-icon::after {
  content: "";
  position: absolute;
  inset: -1px -4px 1px 5px;
  border-radius: inherit;
  background: var(--surface);
  transition: opacity 180ms ease, transform 180ms ease, background-color 180ms ease;
}
html[data-theme="dark"] .theme-toggle-icon {
  width: 14px;
  height: 14px;
  background: currentColor;
  box-shadow:
    0 -7px 0 -5px currentColor,
    0 7px 0 -5px currentColor,
    7px 0 0 -5px currentColor,
    -7px 0 0 -5px currentColor,
    5px 5px 0 -5px currentColor,
    -5px 5px 0 -5px currentColor,
    5px -5px 0 -5px currentColor,
    -5px -5px 0 -5px currentColor;
  transform: rotate(0deg);
}
html[data-theme="dark"] .theme-toggle-icon::after {
  opacity: 0;
  transform: scale(0.4);
}
.nav-menu-lines {
  position: relative;
  display: block;
  width: 18px;
  height: 14px;
}
.nav-menu-line {
  display: block;
  position: absolute;
  left: 1px;
  width: 15px;
  height: 1px;
  border-radius: 999px;
  background: currentColor;
  transform-origin: center;
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), width 180ms ease;
}
.nav-menu-line:nth-child(1) { top: 1px; }
.nav-menu-line:nth-child(2) { top: 6.5px; }
.nav-menu-line:nth-child(3) { top: 12px; }
.button:hover {
  background: var(--background-200);
  transform: translateY(-1px);
}
.button:active {
  background: var(--background-300);
  transform: translateY(0);
}
.theme-toggle:hover {
  background: var(--background-200);
  transform: translateY(-1px);
}
.theme-toggle:active {
  transform: translateY(0);
}
.nav-menu:hover,
.nav-menu:active {
  background: transparent;
  transform: none;
}
.button.primary {
  background: var(--gray-1000);
  color: var(--background-100);
  border-color: var(--gray-1000);
  font-weight: 500;
}
.button.primary:hover {
  background: var(--gray-900);
  border-color: var(--gray-900);
}
.button.secondary {
  background: var(--surface);
  color: var(--fg);
  border-color: var(--gray-alpha-500);
}
.button.secondary:hover {
  background: var(--background-200);
}
.button.tertiary {
  background: transparent;
  color: var(--fg);
}
.button.subtle { border-color: var(--line); color: var(--body); }
.button:disabled { opacity: 0.58; cursor: not-allowed; }
.button:focus-visible,
input:focus-visible,
pre:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--blue-700);
}
.code, code {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: 13px;
}
code { padding: 1px 5px; }
.code {
  display: block;
  padding: 14px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.45;
  color: var(--fg);
  box-shadow: var(--shadow);
}
.panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
  animation: surfaceIn 360ms ease-out both;
  transition: background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.section-label {
  display: inline-flex;
  margin-bottom: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  color: var(--body);
  background: var(--background-200);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.muted { color: var(--muted); }
.good { color: var(--good); }
.warn { color: var(--warn); }
.bad { color: var(--bad); }
.notice {
  border: 1px solid var(--line);
  background: var(--surface-2);
  padding: 12px 14px;
  margin: 0 0 16px;
  border-left: 3px solid var(--blue-700);
}
.notice.error { border-color: color-mix(in srgb, var(--bad) 45%, var(--line)); }
.notice.success { border-color: color-mix(in srgb, var(--good) 45%, var(--line)); }
.notice strong { color: var(--fg); }
.loader-card {
  min-height: 240px;
  display: grid;
  place-items: center;
  text-align: center;
}
.dots {
  display: inline-flex;
  gap: 7px;
  margin-bottom: 14px;
}
.dots span {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: var(--blue-700);
  animation: dotPulse 880ms ease-in-out infinite;
}
.dots span:nth-child(2) { animation-delay: 120ms; }
.dots span:nth-child(3) { animation-delay: 240ms; }
@keyframes dotPulse {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.34; }
  40% { transform: translateY(-7px); opacity: 1; }
}
@keyframes pageIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes surfaceIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.copy-wrap { position: relative; }
.copy-wrap .code { padding-right: 74px; }
.copy-button {
  position: absolute;
  top: 10px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 26px;
  height: 26px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0 8px;
  background: var(--surface);
  color: var(--fg);
  font-size: 12px;
  line-height: 1;
  box-shadow: none;
}
.copy-button::before {
  content: "";
  width: 8px;
  height: 10px;
  border: 1px solid currentColor;
  box-shadow: 3px -3px 0 -1px var(--surface), 3px -3px 0 0 currentColor;
}
h1, h2, h3, h4, h5 {
  margin: 0;
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.15;
  color: var(--fg);
}
h1 { font-size: 48px; }
h2 { font-size: 32px; }
h3 { font-size: 20px; }
p { margin: 0; color: var(--body); }
ul, ol { margin: 0; padding-left: 20px; color: var(--body); }

@media (max-width: 760px) {
  .shell, .shell.narrow, .content-shell { width: min(100% - 28px, var(--page-width)); }
  .nav {
    position: sticky;
    top: 10px;
    z-index: 30;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 56px;
    margin-top: 12px;
    padding: 7px;
    gap: 8px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--bg);
    backdrop-filter: blur(8px);
    box-shadow: 0 18px 60px var(--shadow);
    overflow: visible;
  }
  .nav.open {
    border-radius: var(--radius-md);
  }
  .brand {
    min-width: 0;
    padding-left: 8px;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nav-menu {
    display: inline-flex;
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
    align-items: center;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
  }
  .nav.open .nav-menu-line:nth-child(1) {
    transform: translateY(5.5px) rotate(45deg);
  }
  .nav.open .nav-menu-line:nth-child(2) {
    opacity: 0;
    transform: translateX(2px) scaleX(0.1);
  }
  .nav.open .nav-menu-line:nth-child(3) {
    transform: translateY(-5.5px) rotate(-45deg);
  }
  .nav-links {
    grid-column: 1 / -1;
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    font-size: 12px;
    max-height: 0;
    margin: 0;
    padding: 0;
    border-top: 1px solid transparent;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
    transform: translateY(-4px);
    transition: max-height 240ms ease, opacity 180ms ease, transform 220ms ease, margin 220ms ease, padding 220ms ease, border-color 180ms ease;
  }
  .nav-actions {
    display: flex;
    justify-self: end;
    align-items: center;
    gap: 4px;
  }
  .nav-actions .theme-toggle {
    display: inline-flex;
    width: 38px;
    min-width: 38px;
    height: 38px;
    min-height: 38px;
    border: 0;
    background: transparent;
  }
  .nav.open .nav-links {
    max-height: 260px;
    margin: 6px 0 0;
    padding: 8px 0 0;
    border-top-color: var(--line);
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
  .nav-links .button,
  .nav-links > a:not(.button) {
    width: 100%;
    min-height: 40px;
    padding: 7px 12px;
    text-align: center;
    white-space: nowrap;
  }
  .nav-links .theme-toggle {
    width: 40px;
    min-width: 40px;
    padding: 0;
    align-self: center;
  }
  .nav-links > a:not(.button) {
    display: inline-flex;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
@media (max-width: 760px) {
  .nav {
    isolation: isolate;
  }
  .nav.open {
    overflow: hidden;
    border-radius: 22px;
    background: var(--surface);
    border-color: var(--line-strong);
    box-shadow: 0 20px 70px rgba(0, 0, 0, 0.18);
    backdrop-filter: none;
  }
  .nav.open::before,
  .nav.open::after {
    display: none !important;
    content: none !important;
  }
  .nav-menu {
    box-shadow: none;
  }
  .nav.open .nav-menu {
    background: var(--surface-2);
  }
  .nav.open .nav-links {
    max-height: 320px;
    margin: 10px 0 0;
    padding: 12px 0 0;
    gap: 0;
    border-top: 1px solid var(--line);
  }
  .nav.open .nav-links .button,
  .nav.open .nav-links > a:not(.button) {
    width: 100%;
    height: 46px;
    min-height: 46px;
    justify-content: flex-start;
    padding: 0 4px;
    border: 0;
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--fg);
    box-shadow: none;
    transform: none;
    font-size: 13px;
    font-weight: 500;
  }
  .nav.open .nav-links .button.primary,
  .nav.open .nav-links .button.secondary {
    background: transparent;
    color: var(--fg);
    border-color: var(--line);
  }
  .nav.open .nav-links .button:hover,
  .nav.open .nav-links > a:not(.button):hover {
    background: var(--surface-2);
    padding-left: 12px;
    transform: none;
  }
  .nav.open .nav-links > *:last-child {
    border-bottom: 0;
  }
}

.nav {
  min-height: 64px;
  margin-top: 18px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, transparent), color-mix(in srgb, var(--surface-2) 78%, transparent));
  box-shadow: 0 14px 48px rgba(0, 0, 0, 0.08);
}
.brand {
  gap: 9px;
  padding-left: 4px;
}
.brand::before {
  display: none;
  content: none;
}
.nav-links {
  gap: 6px;
}
.nav-links > a:not(.button),
.nav-links .button,
.nav-links .theme-toggle,
.nav-actions .theme-toggle {
  height: 38px;
  min-height: 38px;
  border-radius: 12px;
}
.nav-links > a:not(.button) {
  padding: 0 12px;
  color: var(--body);
}
.nav-links > a:not(.button):hover {
  color: var(--fg);
  background: var(--surface-2);
}
.theme-toggle {
  border-color: transparent;
  background: var(--surface-2);
}
.secret-strip {
  display: grid;
  gap: 14px;
  margin: 18px 0 20px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-2);
}
.secret-strip.is-ready {
  border-color: color-mix(in srgb, var(--good) 45%, var(--line));
  background: color-mix(in srgb, var(--green-100) 48%, var(--surface));
}
.secret-strip strong {
  display: block;
  margin-bottom: 4px;
  color: var(--fg);
}
.secret-strip span {
  color: var(--muted);
}
.secret-copy-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.secret-token {
  display: block;
  min-width: 0;
  padding: 10px 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--fg) !important;
  font-family: var(--font-mono);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.secret-copy-row .button {
  height: 40px;
  min-height: 40px;
  border-radius: 10px;
}
@media (max-width: 760px) {
  .nav {
    margin-top: 12px;
    padding: 10px 0;
    border-color: transparent;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .nav.open {
    padding: 10px 0 0;
    border-radius: 0;
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }
  .nav.open .nav-links {
    margin-top: 14px;
    padding: 12px 0 0;
    border-top: 1px solid var(--line);
    background: transparent;
  }
  .nav.open .nav-links .button,
  .nav.open .nav-links > a:not(.button) {
    justify-content: flex-start;
    height: 44px;
    min-height: 44px;
    padding: 0 10px;
    border-radius: 12px;
    border: 0;
    border-bottom: 0;
    background: transparent;
  }
  .secret-copy-row {
    grid-template-columns: 1fr;
  }
  .secret-copy-row .button {
    width: 100%;
  }
}
.nav-menu {
  background: transparent;
}
@media (max-width: 760px) {
  .brand {
    padding-left: 0;
    font-size: 14px;
    height: 40px;
    align-items: center;
  }
  .nav-menu {
    justify-self: end;
    width: 38px;
    min-width: 38px;
    height: 38px;
    background: transparent;
  }
  .nav.open .nav-links {
    gap: 8px;
  }
  .nav.open .nav-menu {
    background: transparent;
  }
  .nav.open .nav-links .button,
  .nav.open .nav-links > a:not(.button) {
    align-items: center;
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
    font-size: 14px;
    line-height: 1;
    text-align: center;
  }
  .landing-page .hero,
  .setup-page .hero {
    justify-items: center;
    text-align: center;
  }
  .landing-page .hero {
    padding-top: 64px;
  }
}
</style>`;
}
export function renderLandingUi(env: Env): string {
  const appName = escapeHtml(env.APP_NAME || "ErrorAtlas");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${appName}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${themeBootScript()}
${sharedCss()}
<style>
  .landing-main {
    padding: 0 0 64px;
  }
  .hero {
    position: relative;
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 14px;
    padding: clamp(56px, 11vw, 104px) 0 clamp(44px, 8vw, 72px);
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--body);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    height: 24px;
  }
  .hero-copy {
    max-width: 720px;
    margin: 16px auto 0;
    color: var(--muted);
    font-size: 18px;
    line-height: 1.65;
  }
  .hero .cta-row {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
  }
  .hero h1 {
    max-width: 980px;
    margin: 0;
    text-wrap: balance;
    font-size: clamp(36px, 6vw, 60px);
    line-height: 1.08;
    letter-spacing: -0.038em;
  }
  .hero .button.primary {
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
  }
  .hero .button {
    min-width: 192px;
    justify-content: center;
  }
  .product-strip {
    padding-bottom: 56px;
  }
  .flow-panel {
    margin-top: 26px;
    display: grid;
    grid-template-columns: minmax(280px, 0.95fr) minmax(0, 1.05fr);
    gap: 16px;
    padding: clamp(20px, 3vw, 32px);
    align-items: stretch;
  }
  .flow-copy {
    display: grid;
    align-content: start;
    gap: 12px;
  }
  .flow-copy h2 {
    max-width: 520px;
    font-size: clamp(30px, 4vw, 40px);
    line-height: 1.14;
  }
  .flow-copy p {
    max-width: 470px;
    color: var(--body);
  }
  .flow-steps {
    display: grid;
    gap: 10px;
  }
  .flow-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 14px;
    align-items: start;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 16px;
    background: var(--surface);
  }
  .flow-number {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    background: var(--background-200);
    border: 1px solid var(--line);
    color: var(--body);
    font-weight: 600;
  }
  .flow-card h3 {
    margin: 0 0 6px;
    font-size: 19px;
  }
  .flow-card p {
    margin: 0;
    color: var(--body);
    line-height: 1.45;
  }
  .footer {
    border-top: 1px solid var(--line);
    padding: 22px 0 30px;
    color: var(--muted);
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  @media (max-width: 980px) {
    .hero, .flow-panel {
      grid-template-columns: 1fr;
    }
    .hero, .product-strip {
      padding-left: 0;
      padding-right: 0;
    }
    .flow-copy h2 {
      font-size: 30px;
      max-width: none;
    }
  }
  @media (max-width: 640px) {
    .landing-main {
      padding-bottom: 40px;
    }
    .hero {
      padding: 40px 0 34px;
      gap: 20px;
    }
    .hero h1 {
      font-size: clamp(34px, 10vw, 46px);
      line-height: 1.12;
      letter-spacing: -0.032em;
    }
    .hero-copy {
      font-size: 16px;
      margin-top: 14px;
      line-height: 1.6;
    }
  .hero .cta-row {
    width: 100%;
    grid-template-columns: 1fr;
    max-width: 380px;
    margin-left: auto;
    margin-right: auto;
  }
  .hero .button {
    width: 100%;
    min-width: 0;
    justify-content: center;
  }
    .footer {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
    }
  }
</style>
</head>
<body class="landing-page">
<div class="shell narrow">
  <nav class="nav">
    <a href="/" class="brand">ErrorAtlas</a>
    <div class="nav-actions">
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch theme" title="Switch theme"><span class="theme-toggle-icon" aria-hidden="true"></span></button>
      <button class="nav-menu" id="navMenu" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="Open navigation"><span class="nav-menu-lines" aria-hidden="true"><span class="nav-menu-line"></span><span class="nav-menu-line"></span><span class="nav-menu-line"></span></span></button>
    </div>
    <div class="nav-links" id="navLinks">
      <a href="/setup">Setup</a>
      <a class="button primary" href="/dashboard">Dashboard</a>
    </div>
  </nav>

  <main>
    <section class="hero">
      <div>
        <span class="eyebrow">Error memory for coding agents</span>
      <h1>Your agent remembers the bugs you beat.</h1>
      <p class="hero-copy">ErrorAtlas turns past failures into reusable resolutions your local agents can search before they burn another context window.</p>
        <div class="cta-row">
          <a class="button primary" href="/dashboard">Enter console</a>
          <a class="button" href="/setup">Connect an agent</a>
        </div>
      </div>
    </section>

    <section class="product-strip">
      <div class="panel flow-panel">
        <div class="flow-copy">
          <span class="section-label">How it works</span>
        <h2>Reusable memory your agent can actually use.</h2>
            <p>ErrorAtlas sits between your local agent and your stored fixes. The agent searches before guessing, captures what failed, and only promotes fixes after validation.</p>
        </div>
        <div class="flow-steps">
          <article class="flow-card">
            <div class="flow-number">1</div>
            <div><h3>Search before spending context</h3><p>Your agent asks ErrorAtlas for similar errors before trying another random fix.</p></div>
          </article>
          <article class="flow-card">
            <div class="flow-number">2</div>
            <div><h3>Capture the useful signal</h3><p>Error, command, package manager, and failed attempts become structured memory.</p></div>
          </article>
          <article class="flow-card">
            <div class="flow-number">3</div>
          <div><h3>Capture once, reuse forever</h3><p>Working fixes become searchable playbooks after they are validated.</p></div>
          </article>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <span>ErrorAtlas 2026</span>
  </footer>
</div>
</body>
</html>`;
}
export function renderSetupGuideUi(env: Env, requestOrigin?: string): string {
  const appName = escapeHtml(env.APP_NAME || "ErrorAtlas");
  const origin = escapeHtml(requestOrigin || env.APP_ORIGIN || "https://erroratlas.your-workers-subdomain.workers.dev");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${appName} Setup</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${themeBootScript()}
${sharedCss()}
<style>
  .hero {
    padding: 52px 0 24px;
  }
  .eyebrow {
    color: var(--muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 {
    max-width: 860px;
    margin: 6px 0;
    font-size: clamp(34px, 4vw, 52px);
    line-height: 1.08;
    letter-spacing: -0.04em;
  }
  .intro {
    max-width: 800px;
    margin: 0;
    color: var(--muted);
  }
  .section {
    padding: 14px 0 64px;
  }
  .steps {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }
  .step {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 18px;
    background: var(--surface);
  }
  .step h2 {
    margin: 0;
    font-size: 18px;
  }
  .step p {
    margin: 0 0 14px;
    color: var(--body);
    max-width: 700px;
  }
  .step .code {
    margin-top: 10px;
  }
  .copy-wrap { position: relative; }
  .copy-wrap .code { padding-right: 60px; }
  .copy-button {
    position: absolute;
    top: 12px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    min-width: 34px;
    height: 30px;
    min-height: 30px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 0;
    background: var(--surface);
    color: var(--fg);
    font-size: 0;
    transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
  }
  .copy-button:hover {
    background: var(--background-200);
    transform: translateY(-1px);
  }
  .copy-button:active {
    transform: translateY(0);
  }
  .copy-button::before {
    content: "";
    width: 10px;
    height: 12px;
    border: 1px solid currentColor;
    box-shadow: 3px -3px 0 -1px var(--surface), 3px -3px 0 0 currentColor;
  }
  .copy-button[data-state="copied"]::before {
    width: 12px;
    height: 7px;
    border-top: 0;
    border-right: 0;
    box-shadow: none;
    transform: rotate(-45deg);
  }
  .step-number {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-weight: 600;
  }
  @media (max-width: 760px) {
    .setup-page .nav-links {
      border-top: 1px solid var(--line);
    }
    .hero {
      padding: 40px 0 18px;
    }
    .step {
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 16px;
    }
    .copy-wrap .code {
      padding: 46px 14px 14px;
    }
    .copy-button {
      top: 10px;
      right: 10px;
    }
    .step-number {
      width: 24px;
      height: 24px;
    }
  }
</style>
</head>
<body class="setup-page">
<div class="shell narrow">
  <nav class="nav">
    <a href="/" class="brand">ErrorAtlas</a>
      <div class="nav-actions">
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch theme" title="Switch theme"><span class="theme-toggle-icon" aria-hidden="true"></span></button>
        <button class="nav-menu" id="navMenu" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="Open navigation"><span class="nav-menu-lines" aria-hidden="true"><span class="nav-menu-line"></span><span class="nav-menu-line"></span><span class="nav-menu-line"></span></span></button>
      </div>
    <div class="nav-links" id="navLinks">
      <a href="/dashboard">Dashboard</a>
      <a class="button primary" href="/">Home</a>
    </div>
  </nav>

  <main>
    <section class="hero">
      <span class="eyebrow">Setup</span>
      <h1>Connect ErrorAtlas to your coding agent.</h1>
      <p class="intro">Generate one hosted MCP secret, run Supermemory locally, then point your coding agent at the ErrorAtlas MCP server. No repo clone, database setup, or Worker deploy needed.</p>
    </section>

    <section class="section">
      <div class="section-label">Developer setup</div>
      <div class="steps">
        <article class="step">
          <span class="step-number">1</span>
          <div>
            <h2>Generate your MCP secret</h2>
            <p>Open the hosted dashboard, sign in, click <strong>Generate secret</strong>, then copy it immediately. Existing raw secrets cannot be recovered later.</p>
            <pre class="code">${origin}/dashboard</pre>
          </div>
        </article>
        <article class="step">
          <span class="step-number">2</span>
          <div>
            <h2>Install package</h2>
            <p>Install ErrorAtlas in the project where your coding agent works.</p>
            <pre class="code">npm install -D @sansynx/erroratlas
npx erroratlas init</pre>
          </div>
        </article>
        <article class="step">
          <span class="step-number">3</span>
          <div>
            <h2>Run local memory</h2>
            <p>Supermemory stores private debugging context on the developer machine. It needs one model-provider key such as <code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>, <code>GEMINI_API_KEY</code>, or <code>GROQ_API_KEY</code>.</p>
            <pre class="code">OPENAI_API_KEY=your_model_provider_key
npx supermemory local --port 6767

# if installed globally
supermemory local --port 6767</pre>
            <p>Keep this terminal running while your coding agent works. Local memories are stored in the project's <code>.supermemory</code> folder.</p>
            <p>Windows note: if the npm wrapper says the server binary was not found, open bash or WSL in the project and run <code>PORT=6767 ~/.supermemory/bin/supermemory-server</code> after exporting your model-provider key.</p>
          </div>
        </article>
        <article class="step">
          <span class="step-number">4</span>
          <div>
            <h2>Add MCP server</h2>
            <p>Paste this into your agent client's MCP config. Replace <code>ERRORATLAS_API_KEY</code> with the secret copied from the dashboard.</p>
            <pre class="code">{
  "mcpServers": {
    "erroratlas": {
      "command": "npx",
      "args": ["-y", "--package", "@sansynx/erroratlas", "erroratlas", "mcp"],
      "env": {
        "ERRORATLAS_API_URL": "${origin}",
        "ERRORATLAS_API_KEY": "ea_live_from_dashboard",
        "SUPERMEMORY_URL": "http://localhost:6767"
      }
    }
  }
}</pre>
          </div>
        </article>
        <article class="step">
          <span class="step-number">5</span>
          <div>
            <h2>Confirm the environment</h2>
            <p>Your MCP server must receive these values. If Supermemory prints a local API key, add <code>SUPERMEMORY_API_KEY</code>; local unauthenticated requests may work without it.</p>
            <pre class="code">ERRORATLAS_API_URL=${origin}
ERRORATLAS_API_KEY=ea_live_from_dashboard
SUPERMEMORY_URL=http://localhost:6767
SUPERMEMORY_API_KEY=optional_local_supermemory_key</pre>
          </div>
        </article>
        <article class="step">
          <span class="step-number">6</span>
          <div>
            <h2>Verify with your agent</h2>
            <p>Ask the agent to search before fixing, capture meaningful failures, and publish a playbook only after the fix is verified.</p>
            <pre class="code">- Before changing code, search ErrorAtlas.
- If the error is useful, call capture_error_signal.
- If the fix works, call publish_resolution with root cause, fix, and verification.</pre>
          </div>
        </article>
      </div>
    </section>

  </main>
</div>
<script>
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("pre.code").forEach(function (pre) {
    if (pre.parentElement && pre.parentElement.classList.contains("copy-wrap")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "copy-wrap";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-button";
    button.innerHTML = '<span class="sr-only">Copy snippet</span>';
    button.title = "Copy snippet";
    button.setAttribute("aria-label", "Copy snippet");
    button.addEventListener("click", async function () {
      const value = pre.textContent || "";
      try {
        await navigator.clipboard.writeText(value);
        button.dataset.state = "copied";
        button.title = "Copied";
        button.setAttribute("aria-label", "Copied");
        setTimeout(function () {
          button.dataset.state = "";
          button.title = "Copy snippet";
          button.setAttribute("aria-label", "Copy snippet");
        }, 1400);
      } catch (_error) {
        button.title = "Select the snippet";
        button.setAttribute("aria-label", "Select the snippet");
        setTimeout(function () {
          button.title = "Copy snippet";
          button.setAttribute("aria-label", "Copy snippet");
        }, 1400);
      }
    });
    wrapper.appendChild(button);
  });
});
</script>
</body>
</html>`;
}
export function renderDashboardUi(env: Env): string {
  const appName = escapeHtml(env.APP_NAME || "ErrorAtlas");
  return String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${appName} Dashboard</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${themeBootScript()}
${sharedCss()}
<style>
  .dashboard-page .shell {
    min-height: 100vh;
  }
  .app-frame {
    display: block;
    margin: 10px 0 28px;
    background: transparent;
  }
  .main { min-width: 0; }
  .topbar {
    min-height: 90px;
    padding: 22px 0;
    border-bottom: 1px solid var(--line);
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto;
    align-items: center;
    gap: 16px;
  }
  .topbar-main { min-width: 0; }
  .topbar h1 {
    margin: 0;
    font-size: 27px;
    line-height: 1.16;
  }
  .topbar p {
    margin: 6px 0 0;
    color: var(--muted);
  }
  .auth-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }
  .content {
    padding: 22px 0 24px;
  }
  .view-space { min-width: 0; }
  .panel {
    padding: 20px;
    border: 1px solid var(--line);
  }
  .panel h3 {
    margin: 0 0 10px;
    font-size: 18px;
    font-weight: 600;
  }
  .panel p { color: var(--body); }
  .auth-open-card {
    min-height: 164px;
    display: grid;
    align-content: center;
    justify-items: start;
    gap: 10px;
  }
  .auth-modal {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 20px;
    background: color-mix(in srgb, var(--gray-1000) 15%, transparent);
    backdrop-filter: blur(8px);
  }
  .auth-modal[hidden] { display: none; }
  .auth-dialog {
    width: min(460px, 100%);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 24px;
    background: var(--surface);
    box-shadow: var(--shadow-modal);
  }
  .auth-dialog-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }
  .auth-dialog h3 { margin: 0 0 6px; font-size: 24px; }
  .auth-dialog p { margin: 0; color: var(--muted); }
  .icon-button {
    width: 34px;
    height: 34px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--fg);
  }
  .auth-methods { display: grid; gap: 10px; }
  .auth-methods input {
    width: 100%;
    border-radius: var(--radius-sm);
    min-height: 40px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    padding: 0 12px;
    color: var(--fg);
  }
  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--muted);
    font-size: 12px;
    margin: 4px 0;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: "";
    height: 1px;
    flex: 1;
    background: var(--line);
  }
  .empty {
    padding: 14px 0;
    color: var(--muted);
  }
  .agent-note {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 13px;
  }
  .env-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    border-top: 1px solid var(--line);
    padding: 13px 0;
    background: transparent;
  }
  .env-row:last-child { border-bottom: 1px solid var(--line); }
  .env-name {
    color: var(--muted);
    font-size: 12px;
    margin-bottom: 5px;
    letter-spacing: 0.01em;
  }
  .env-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg);
    font-size: 13px;
    font-family: var(--font-mono);
  }
  .env-value.is-secret {
    letter-spacing: 0.03em;
  }
  .tiny-copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 0 10px;
    background: var(--surface);
    color: var(--fg);
    font-size: 12px;
    line-height: 1;
    box-shadow: none;
  }
  .key-console {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(340px, 0.86fr);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--surface) 92%, var(--background-200));
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .key-pane {
    min-width: 0;
    padding: clamp(20px, 3vw, 30px);
  }
  .key-pane + .key-pane {
    border-left: 1px solid var(--line);
  }
  .key-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    margin-bottom: 24px;
  }
  .key-kicker {
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .key-title {
    margin: 0;
    font-size: clamp(24px, 3vw, 34px);
    line-height: 1.05;
  }
  .key-desc {
    max-width: 560px;
    margin-top: 10px;
    color: var(--body);
  }
  .key-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .key-note {
    margin-top: 12px;
    color: var(--muted);
    font-size: 13px;
  }
  .key-status {
    border-top: 1px solid var(--line);
    margin-top: 22px;
    padding-top: 10px;
  }
  .status-line {
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }
  .status-label {
    color: var(--muted);
    font-size: 12px;
  }
  .status-value {
    min-width: 0;
    color: var(--fg);
    font-weight: 500;
  }
  .secret-strip {
    display: grid;
    gap: 12px;
    margin: 18px 0 22px;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-2);
  }
  .secret-strip.is-ready {
    border-color: color-mix(in srgb, var(--good) 42%, var(--line));
    background: color-mix(in srgb, var(--green-700) 7%, var(--surface));
  }
  .secret-strip strong {
    display: block;
    margin-bottom: 4px;
  }
  .secret-strip span {
    display: block;
    color: var(--muted);
    font-size: 13px;
  }
  .secret-copy-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
  }
  .secret-token {
    display: flex;
    align-items: center;
    min-height: 40px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 0 12px;
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--fg);
  }
  .env-table {
    display: grid;
    border-top: 1px solid var(--line);
  }
  .loader-card {
    min-height: 250px;
    display: grid;
    place-items: center;
    text-align: center;
  }
  .dots {
    display: inline-flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .dots span {
    width: 8px;
    aspect-ratio: 1;
    border-radius: 99px;
    background: var(--blue-700);
    animation: pulse 1s ease-in-out infinite;
  }
  .dots span:nth-child(2) { animation-delay: 0.15s; }
  .dots span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes pulse {
    0%, 100% { transform: scale(0.8); opacity: 0.45; }
    50% { transform: scale(1); opacity: 1; }
  }
  @media (max-width: 980px) {
    .app-frame,
    .key-console { grid-template-columns: 1fr; }
    .key-pane + .key-pane {
      border-left: 0;
      border-top: 1px solid var(--line);
    }
    .topbar { grid-template-columns: 1fr; align-items: start; }
  }
  @media (max-width: 640px) {
    .dashboard-page .shell.narrow { width: min(100% - 18px, 1200px); }
    .dashboard-page .shell { width: min(100% - 28px, 1200px); }
    .topbar { padding: 16px 0; gap: 12px; }
    .content { padding: 16px 0 20px; }
    .panel { padding: 16px; }
    .key-pane { padding: 18px; }
    .key-head,
    .secret-copy-row {
      grid-template-columns: 1fr;
    }
    .key-actions .button,
    .secret-strip .button { width: 100%; }
    .status-line { grid-template-columns: 1fr; gap: 4px; }
    .env-row { grid-template-columns: 1fr; }
    .tiny-copy { width: 100%; }
    .auth-actions .button { width: 100%; }
    input { min-width: 0; width: 100%; }
  }
</style>
</head>
<body class="dashboard-page">
<div class="shell">
  <nav class="nav">
    <a href="/" class="brand">ErrorAtlas</a>
      <div class="nav-actions">
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch theme" title="Switch theme"><span class="theme-toggle-icon" aria-hidden="true"></span></button>
        <button class="nav-menu" id="navMenu" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="Open navigation"><span class="nav-menu-lines" aria-hidden="true"><span class="nav-menu-line"></span><span class="nav-menu-line"></span><span class="nav-menu-line"></span></span></button>
      </div>
    <div class="nav-links" id="navLinks">
      <a href="/setup">Setup</a>
      <a class="button primary" href="/">Home</a>
    </div>
  </nav>

  <section class="app-frame" aria-label="ErrorAtlas MCP key console">
    <main class="main">
      <header class="topbar">
        <div class="topbar-main">
          <h1 id="viewTitle">Dashboard</h1>
          <p id="sessionStatus">Checking workspace session</p>
        </div>
        <div class="auth-actions" id="topActions"></div>
      </header>
      <div class="content">
        <div id="message"></div>
        <div id="appContent" class="view-space">
          <div class="panel loader-card">
            <div>
              <div class="dots"><span></span><span></span><span></span></div>
              <h2>Warming up ErrorAtlas</h2>
              <p class="muted">Preparing dashboard and workspace state.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </section>
</div>

<script>
(function () {
  const sessionKey = "erroratlas.session";
  const state = {
    config: null,
    session: null,
    data: null,
    generatedKey: null,
    message: "",
    messageType: ""
  };

  const content = document.getElementById("appContent");
  const message = document.getElementById("message");
  const status = document.getElementById("sessionStatus");
  const title = document.getElementById("viewTitle");
  const actions = document.getElementById("topActions");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) {
      if (char === "&") return "&amp;";
      if (char === "<") return "&lt;";
      if (char === ">") return "&gt;";
      if (char === '"') return "&quot;";
      if (char === "'") return "&#039;";
      return char;
    });
  }

  function setMessage(text, type) {
    state.message = text || "";
    state.messageType = type || "error";
    renderMessage();
  }

  function renderMessage() {
    message.innerHTML = state.message ? '<div class="notice ' + esc(state.messageType) + '">' + esc(state.message) + "</div>" : "";
  }

  function supabaseBase() {
    const url = state.config && state.config.supabaseUrl ? state.config.supabaseUrl : "";
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  function authHeaders(token) {
    return {
      apikey: state.config.supabaseAnonKey,
      Authorization: "Bearer " + (token || state.config.supabaseAnonKey),
      "Content-Type": "application/json"
    };
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(sessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function saveSession(session) {
    try {
      if (session && session.access_token) localStorage.setItem(sessionKey, JSON.stringify(session));
      else localStorage.removeItem(sessionKey);
    } catch (_error) {}
  }

  function sessionFromHash() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const token = hash.get("access_token");
    if (!token) return null;

    const expiresIn = Number(hash.get("expires_in") || "3600");
    const session = {
      access_token: token,
      refresh_token: hash.get("refresh_token") || "",
      expires_at: Math.floor(Date.now() / 1000) + expiresIn
    };

    history.replaceState(null, "", location.pathname);
    saveSession(session);
    return session;
  }

  async function loadConfig() {
    const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Worker config endpoint failed.");
    state.config = await response.json();
  }

  async function loadUser() {
    const response = await fetch(supabaseBase() + "/auth/v1/user", { headers: authHeaders(state.session.access_token) });
    if (!response.ok) throw new Error("Your saved session expired. Sign in again.");
    await response.json();
    saveSession(state.session);
  }

  async function loadDashboard() {
    state.data = await api("/api/dashboard");
  }

  async function api(path, options) {
    const init = options || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, init.headers || {});
    if (state.session && state.session.access_token) headers.Authorization = "Bearer " + state.session.access_token;

    const response = await fetch(path, Object.assign({}, init, { headers: headers }));
    const text = await response.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch (_error) { parsed = { message: text }; }
    if (!response.ok) throw new Error((parsed && (parsed.message || parsed.error)) || "Request failed.");
    return parsed;
  }

  function renderTopActions() {
    if (!state.config || !state.config.supabaseUrl || !state.config.supabaseAnonKey) {
      actions.innerHTML = '<a class="button primary" href="/setup">Setup guide</a>';
      return;
    }
    if (!state.session) {
      actions.innerHTML = '<button class="button primary" id="openAuthTop" type="button">Sign in</button>';
      return;
    }
    actions.innerHTML = '<button class="button" id="logout" type="button">Sign out</button>';
  }

  function render() {
    if (!state.config || !state.config.supabaseUrl || !state.config.supabaseAnonKey) {
      renderSetupMissing();
      return;
    }

    if (!state.session) {
      renderAuth();
      return;
    }

    if (!state.data) {
      title.textContent = "Loading";
      status.textContent = "Fetching MCP workspace";
      content.innerHTML = '<div class="panel loader-card"><div><div class="dots"><span></span><span></span><span></span></div><h3>Loading data</h3><p class="muted">Loading key inventory.</p></div></div>';
      return;
    }

    renderDashboard();
    renderMessage();
  }

  function renderTopBar() {
    renderTopActions();
    renderMessage();
  }

  function schemaWarning() {
    if (!state.data || !state.data.setupWarning) return "";
    return '<div class="notice error"><strong>Workspace setup required.</strong><br>' + esc(state.data.setupWarning) + "</div>";
  }

  function maskSecret(value) {
    if (!value) return "secret hidden";
    if (String(value).startsWith("ea_live_")) return "ea_live_[hidden]";
    return "secret_[hidden]";
  }

  function envRow(name, value, copyable, sensitive) {
    const visibleValue = sensitive ? maskSecret(value) : value;
    const title = sensitive ? "" : ' title="' + esc(value) + '"';
    const valueClass = sensitive ? "env-value is-secret" : "env-value";
    const copyButton = copyable
      ? sensitive
        ? '<button class="tiny-copy" type="button" data-copy-secret="api-key">Copy</button>'
        : '<button class="tiny-copy" type="button" data-copy-value="' + esc(value) + '">Copy</button>'
      : "";
    return '<div class="env-row' + (sensitive ? ' secret-row' : '') + '"><div><div class="env-name">' + esc(name) + '</div><div class="' + valueClass + '"' + title + '>' + esc(visibleValue) + '</div></div>' + copyButton + '</div>';
  }

  function renderGeneratedEnv(hasKey) {
    return envRow("ERRORATLAS_API_URL", location.origin, false, false)
      + (state.generatedKey && state.generatedKey.key
        ? '<div class="env-row secret-row"><div><div class="env-name">ERRORATLAS_API_KEY</div><div class="env-value is-secret">copied_from_secret_button</div></div></div>'
        : '<div class="env-row secret-row"><div><div class="env-name">ERRORATLAS_API_KEY</div><div class="env-value is-secret">' + (hasKey ? 'rotate_to_copy_new_secret' : 'generate_secret_first') + '</div></div></div>')
      + envRow("SUPERMEMORY_URL", "http://localhost:6767", false, false);
  }

  function renderAgentKeys(keys) {
    if (!keys || !keys.length) {
      return '<div class="key-status"><div class="status-line"><div class="status-label">Status</div><div class="status-value">No key generated</div></div><div class="status-line"><div class="status-label">Secret</div><div class="status-value">Ready after generation</div></div></div>';
    }
    const key = keys[0];
    const created = key.created_at ? new Date(key.created_at).toLocaleDateString() : "unknown date";
    return '<div class="key-status"><div class="status-line"><div class="status-label">Status</div><div class="status-value">Active</div></div><div class="status-line"><div class="status-label">Created</div><div class="status-value">' + esc(created) + '</div></div><div class="status-line"><div class="status-label">Secret</div><div class="status-value">Hidden after creation</div></div></div>';
  }

  function renderSecretStrip(hasKey) {
    if (state.generatedKey && state.generatedKey.key) {
      return '<div class="secret-strip is-ready"><div><strong>Secret generated</strong><span>Copy it now. The raw key is held only in this browser session.</span></div><div class="secret-copy-row"><span class="secret-token">ea_live_[hidden]</span><button class="button primary" type="button" data-copy-secret="api-key">Copy secret</button></div></div>';
    }

    if (hasKey) {
      return '<div class="secret-strip"><div><strong>Secret already exists</strong><span>Existing raw keys are not recoverable. Rotate the secret to generate a new one-time copy.</span></div></div>';
    }

    return '<div class="secret-strip"><div><strong>No secret yet</strong><span>Generate your first MCP secret. The copy button appears immediately after generation.</span></div></div>';
  }

  function renderDashboard() {
    title.textContent = "MCP access";
    status.textContent = "One workspace secret";
    const hasKey = !!(state.data.agentKeys && state.data.agentKeys.length);
    const actionLabel = hasKey ? "Rotate secret" : "Generate secret";
    const note = state.generatedKey
      ? "Secret is ready for clipboard copy."
      : hasKey
        ? "You already have one active key. Rotate only when you need a new secret."
        : "First-time setup starts here. Generate one secret, then paste it into your MCP config.";

    content.innerHTML = schemaWarning() +
      '<div class="key-console">' +
      '<section class="key-pane"><div class="key-head"><div><div class="key-kicker">Workspace key</div><h2 class="key-title">Connect one agent secret.</h2><p class="key-desc">ErrorAtlas keeps one active MCP secret per workspace. Generating a new secret revokes the old one immediately.</p></div></div>' +
      '<div class="key-actions"><button class="button primary" id="createKey" type="button">' + actionLabel + '</button></div>' +
      '<p id="newKey" class="key-note">' + esc(note) + '</p>' +
      '<div id="agentKeyList">' + renderAgentKeys(state.data.agentKeys) + '</div></section>' +
      '<section class="key-pane"><div class="key-kicker">MCP environment</div><h2 class="key-title">Paste into your agent.</h2><p class="key-desc">The API key stays masked in the UI. Copy is only available right after generation or rotation.</p>' +
      renderSecretStrip(hasKey) +
      '<div id="mcpEnv" class="env-table">' + renderGeneratedEnv(hasKey) + '</div></section>' +
      '</div>';
  }

  function renderAuth() {
    title.textContent = "Sign in";
    status.textContent = "Protected console";
    content.innerHTML = '<div class="panel auth-open-card"><span class="muted">Sign in to mint MCP keys</span><h3>Console access</h3><p>Use GitHub or a one-time email link. Your workspace is prepared automatically.</p></div><div class="auth-modal" id="authModal" hidden><div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle"><div class="auth-dialog-head"><div><h3 id="authTitle">Enter ErrorAtlas</h3><p>Choose how you want to sign in.</p></div><button class="icon-button" id="closeAuthModal" type="button" aria-label="Close sign in dialog">x</button></div><div class="auth-methods"><button class="button primary" id="githubSignIn" type="button">Continue with GitHub</button><div class="auth-divider">or</div><input id="authEmail" type="email" placeholder="you@example.com" aria-label="Email address"><button class="button" id="sendEmail" type="button">Send magic link</button></div></div></div>';
  }

  function renderSetupMissing() {
    title.textContent = "Setup";
    status.textContent = "Worker setup required";
    const missing = state.config && state.config.missing && state.config.missing.length ? "Workspace configuration is incomplete." : "Workspace configuration is unavailable.";
    content.innerHTML = '<div class="panel"><h3>Workspace is not ready</h3><p>The dashboard is online, but workspace config is not complete.</p><div class="notice error">' + esc(missing) + '</div><a class="button primary" href="/setup">Open setup guide</a></div>';
  }

  async function signInWithGitHub() {
    if (!state.config || !state.config.supabaseUrl) return setMessage("Sign-in is not configured yet.");
    const redirectTo = location.origin + "/dashboard";
    location.assign(supabaseBase() + "/auth/v1/authorize?provider=github&redirect_to=" + encodeURIComponent(redirectTo));
  }

  async function sendMagicLink(email) {
    if (!email) return setMessage("Enter an email address first.");
    const redirectTo = location.origin + "/dashboard";
    const response = await fetch(supabaseBase() + "/auth/v1/otp?redirect_to=" + encodeURIComponent(redirectTo), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email: email, create_user: true })
    });
    if (!response.ok) throw new Error(await response.text());
    closeAuthModal();
    setMessage("Magic link sent. Check your inbox for " + email + ".", "success");
  }

  function openAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    modal.hidden = false;
    const input = document.getElementById("authEmail");
    if (input && input.focus) input.focus();
  }

  function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.hidden = true;
  }

  async function createKey(button) {
    button.disabled = true;
    button.textContent = "Working";
    try {
      const result = await api("/api/agent-keys", { method: "POST", body: JSON.stringify({}) });
      const key = result && result.key ? result.key : "";
      if (!key) throw new Error("API did not return the raw key.");
      state.generatedKey = { key };
      state.message = "";
      await loadDashboard();
      render();
      renderTopBar();
    } catch (error) {
      setMessage("Agent key creation failed: " + (error instanceof Error ? error.message : "Unknown error."));
    } finally {
      button.disabled = false;
      button.textContent = state.data && state.data.agentKeys && state.data.agentKeys.length ? "Rotate secret" : "Generate secret";
    }
  }

  async function rotateKey(id, button) {
    if (!confirm("Rotate this key? The old secret stops working immediately.")) return;
    button.disabled = true;
    button.textContent = "Rotating";
    try {
      const result = await api("/api/agent-keys/" + encodeURIComponent(id) + "/rotate", { method: "POST" });
      if (!result || !result.key) throw new Error("API did not return the new raw key.");
      state.generatedKey = { key: result.key };
      state.message = "";
      await loadDashboard();
      render();
      renderTopBar();
    } catch (error) {
      setMessage("Key rotation failed: " + (error instanceof Error ? error.message : "Unknown error."));
    } finally {
      button.disabled = false;
      button.textContent = "Rotate secret";
    }
  }

  document.addEventListener("click", async function (event) {
    let target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const control = target.closest("button, a");
    if (control instanceof HTMLElement) target = control;

    if (target.id === "openAuthTop") {
      openAuthModal();
      return;
    }

    if (target.id === "closeAuthModal" || target.id === "authModal") {
      closeAuthModal();
      return;
    }

    if (target.id === "githubSignIn") {
      await signInWithGitHub();
      return;
    }

    if (target.id === "sendEmail") {
      const input = document.getElementById("authEmail");
      const email = input && input.value ? input.value.trim() : "";
      try { await sendMagicLink(email); } catch (error) { setMessage("Email sign-in failed: " + (error instanceof Error ? error.message : "Unknown error.")); }
      return;
    }

    if (target.id === "logout") {
      saveSession(null);
      state.session = null;
      state.data = null;
      setMessage("Signed out.", "success");
      render();
      renderTopBar();
      return;
    }

    const copySecret = target.getAttribute("data-copy-secret");
    if (copySecret === "api-key") {
      const secret = state.generatedKey && state.generatedKey.key ? state.generatedKey.key : "";
      if (!secret) {
        setMessage("Generate or rotate a secret first. Existing raw secrets cannot be recovered.");
        return;
      }
      const idleLabel = target.textContent || "Copy secret";
      try {
        await navigator.clipboard.writeText(secret);
        target.textContent = "Copied";
        setTimeout(function () { target.textContent = idleLabel; }, 1400);
      } catch (_error) {
        target.textContent = "Select";
        setTimeout(function () { target.textContent = idleLabel; }, 1400);
      }
      return;
    }

    const copyValue = target.getAttribute("data-copy-value");
    if (copyValue) {
      const idleLabel = target.textContent || "Copy value";
      try {
        await navigator.clipboard.writeText(copyValue);
        target.textContent = "Copied";
        setTimeout(function () { target.textContent = idleLabel; }, 1400);
      } catch (_error) {
        target.textContent = "Select";
        setTimeout(function () { target.textContent = idleLabel; }, 1400);
      }
      return;
    }

    if (target.id === "createKey") {
      await createKey(target);
      renderTopBar();
      return;
    }

    const rotateId = target.getAttribute("data-rotate-key");
    if (rotateId) {
      await rotateKey(rotateId, target);
      renderTopBar();
      return;
    }
  });

  document.addEventListener("keydown", async function (event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (event.key === "Escape") closeAuthModal();
    if (event.key === "Enter" && target.id === "authEmail") {
      const input = document.getElementById("authEmail");
      const email = input && input.value ? input.value.trim() : "";
      try { await sendMagicLink(email); } catch (error) { setMessage("Email sign-in failed: " + (error instanceof Error ? error.message : "Unknown error.")); }
    }
  });

  async function boot() {
    try {
      await loadConfig();
    } catch (error) {
      state.config = { missing: ["PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_ANON_KEY"] };
      setMessage(error instanceof Error ? error.message : "Unable to load config.");
      render();
      renderTopBar();
      return;
    }

    state.session = sessionFromHash() || readSession();
    if (!state.config.supabaseUrl || !state.config.supabaseAnonKey || !state.session) {
      renderTopBar();
      render();
      return;
    }

    try {
      await loadUser();
      await loadDashboard();
      renderTopBar();
      render();
    } catch (error) {
      state.data = { agentKeys: [], setupWarning: "Your workspace is still being prepared. Refresh once; if it continues, sign out and sign in again." };
      setMessage(error instanceof Error ? error.message : "Workspace could not finish loading.");
      renderTopBar();
      render();
    }
  }

  renderTopBar();
  render();
  boot();
})();
</script>
</body>
</html>`;
}

export function renderLlmsTxt(origin: string): string {
  return `# ErrorAtlas

ErrorAtlas is a debugging memory layer for coding agents. Agents use the MCP server, not the dashboard UI.

## Product Boundary

- Humans use ${origin}/dashboard only to sign in and generate or rotate one MCP secret.
- Agents use the local \`erroratlas\` MCP server.
- Supermemory local stores private project memory on the developer machine.
- ErrorAtlas remote stores sanitized searchable incidents, playbooks, audit events, hashed keys, and encrypted payload snapshots.
- Developers do not clone the ErrorAtlas repo, create Supabase projects, deploy Workers, or manage service-owner infrastructure.

## Public Endpoints

- ${origin}/setup
- ${origin}/api/search
- ${origin}/api/playbooks
- ${origin}/llms.txt

## Beginner Setup

1. Open the dashboard and generate one MCP secret:

    ${origin}/dashboard

2. Install ErrorAtlas in the project:

    npm install -D @sansynx/erroratlas
    npx erroratlas init

3. Run Supermemory local before starting the agent. Supermemory requires one model-provider key such as OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY:

    OPENAI_API_KEY=your_model_provider_key
    npx supermemory local --port 6767

Windows/WSL note: if the npm wrapper installs the binary under bash home but cannot find it from Windows, start it from bash inside the project:

    export OPENAI_API_KEY=your_model_provider_key
    PORT=6767 ~/.supermemory/bin/supermemory-server

4. Configure the agent MCP server:

    {
      "mcpServers": {
        "erroratlas": {
          "command": "npx",
          "args": ["-y", "--package", "@sansynx/erroratlas", "erroratlas", "mcp"],
          "env": {
            "ERRORATLAS_API_URL": "${origin}",
            "ERRORATLAS_API_KEY": "ea_live_from_dashboard",
            "SUPERMEMORY_URL": "http://localhost:6767"
          }
        }
      }
    }

5. If Supermemory prints a local API key, also pass:

    SUPERMEMORY_API_KEY=optional_local_supermemory_key

## MCP Tools

- erroratlas.search_error
- erroratlas.capture_error_signal
- erroratlas.record_incident
- erroratlas.publish_resolution
- erroratlas.get_playbook

## Agent Protocol

- Before fixing a non-trivial error, call \`search_error\` with exact error text, stack summary, command, exit code, language, framework, package manager, and dependency versions when available.
- If the failure is useful debugging signal, call \`capture_error_signal\`.
- After a verified fix, call \`publish_resolution\` with root cause, failed attempts, final fix, verification, risk, and confidence.
- Do not send secrets, customer data, private URLs, full source files, or unnecessary absolute local paths.
- Respect repository instructions first. ErrorAtlas does not override AGENTS.md, CLAUDE.md, Cursor rules, Windsurf rules, or project policy.

## Tested Local Endpoints

- MCP writes local memory to Supermemory with \`POST /v3/documents\`.
- MCP searches local memory with \`POST /v3/search\`.
- MCP calls ErrorAtlas remote search with \`POST /api/search\`.
- MCP records remote incidents with \`POST /api/incidents\`.
- MCP publishes remote playbooks with \`POST /api/resolutions\`.

## Storage

Local Supermemory data is stored in the developer project's \`.supermemory\` directory. Keep that directory out of git.
`;
}





