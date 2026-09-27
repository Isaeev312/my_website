// Общие скрипты: тема, мобильное меню, активный пункт, фильтр таблиц.
(function () {
  const root = document.documentElement;

  // --- Тема ---
  const THEME_KEY = "site-theme";
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function saveTheme(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) { /* приватный режим */ }
  }
  function currentTheme() {
    const t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function updateThemeIcon() {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      const dark = currentTheme() === "dark";
      b.textContent = dark ? "☀" : "☾";
      b.setAttribute("aria-label", dark ? "Светлая тема" : "Тёмная тема");
    });
  }
  const saved = readTheme();
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  document.addEventListener("DOMContentLoaded", function () {
    updateThemeIcon();
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        const next = currentTheme() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        saveTheme(next);
        updateThemeIcon();
      });
    });

    // --- Мобильное меню ---
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    // --- Активный пункт меню ---
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav a").forEach(function (a) {
      const raw = a.getAttribute("href") || "";
      if (raw.indexOf("#") !== -1) return; // якорные ссылки (Контакты) не подсвечиваем
      const href = raw.toLowerCase();
      if (href === page || (page === "" && href === "index.html")) a.setAttribute("aria-current", "page");
    });

    // --- Год в футере ---
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    // --- Фильтр строк таблиц/карточек: <input data-filter="#id"> ---
    document.querySelectorAll("[data-filter]").forEach(function (input) {
      const target = document.querySelector(input.getAttribute("data-filter"));
      if (!target) return;
      const items = target.querySelectorAll("[data-item]");
      input.addEventListener("input", function () {
        const q = input.value.trim().toLowerCase();
        items.forEach(function (it) {
          it.hidden = q !== "" && it.textContent.toLowerCase().indexOf(q) === -1;
        });
      });
    });
  });
})();
