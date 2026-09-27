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

    document.querySelectorAll("[data-print-page]").forEach(function (button) {
      button.addEventListener("click", function () { window.print(); });
    });

    // --- Мобильное меню ---
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if (toggle && nav) {
      function closeNav() {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
      toggle.addEventListener("click", function () {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          closeNav();
        }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
          closeNav();
          toggle.focus();
        }
      });
      document.addEventListener("click", function (event) {
        const header = document.querySelector(".header");
        if (nav.classList.contains("is-open") && header && !header.contains(event.target)) closeNav();
      });
      window.addEventListener("resize", function () {
        if (window.innerWidth > 860) closeNav();
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
      const status = document.querySelector('[data-filter-status="' + input.getAttribute("data-filter") + '"]');
      input.addEventListener("input", function () {
        const q = input.value.trim().toLowerCase();
        let visible = 0;
        items.forEach(function (it) {
          const matches = q === "" || it.textContent.toLowerCase().indexOf(q) !== -1;
          it.hidden = !matches;
          if (matches) visible += 1;
        });
        if (status) status.hidden = q === "" || visible !== 0;
      });
    });

    // --- Бриф для нового запроса ---
    const briefForm = document.querySelector("[data-brief-form]");
    if (briefForm) {
      const status = briefForm.querySelector("[data-brief-status]");
      function validateBrief() {
        if (briefForm.checkValidity()) return true;
        briefForm.reportValidity();
        return false;
      }
      function briefText() {
        const data = new FormData(briefForm);
        const object = data.get("object").trim() || "не указан";
        const task = data.get("task").trim() || "нужно обсудить";
        const deadline = data.get("deadline").trim() || "не указан";
        const contact = data.get("contact").trim() || "не указан";
        return "Здравствуйте, Айдар!\n\nНужна работа: " + data.get("service") +
          "\nСтадия: " + data.get("stage") +
          "\nОбъект: " + object +
          "\nЗадача: " + task +
          "\nЖелаемый срок: " + deadline +
          "\nКонтакт: " + contact;
      }
      briefForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validateBrief()) return;
        const url = "https://t.me/isaev312?text=" + encodeURIComponent(briefText());
        window.open(url, "_blank", "noopener");
      });
      const copyButton = briefForm.querySelector("[data-brief-copy]");
      if (copyButton) copyButton.addEventListener("click", function () {
        if (!validateBrief()) return;
        const text = briefText();
        const copied = navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(text) : Promise.reject();
        copied.then(function () {
          status.textContent = "Текст скопирован";
        }).catch(function () {
          status.textContent = "Скопируйте текст через Telegram";
        });
      });
      const emailButton = briefForm.querySelector("[data-brief-email]");
      if (emailButton) emailButton.addEventListener("click", function () {
        if (!validateBrief()) return;
        window.location.href = "mailto:isaeev312@gmail.com?subject=" + encodeURIComponent("Запрос по проекту ВК/НВК") +
          "&body=" + encodeURIComponent(briefText());
      });
      briefForm.addEventListener("reset", function () {
        window.setTimeout(function () { status.textContent = "Форма очищена"; }, 0);
      });
    }

    // --- Интерактивные чек-листы обучения ---
    document.querySelectorAll("[data-checklist]").forEach(function (list) {
      const name = list.getAttribute("data-checklist");
      const key = "checklist-" + name;
      const inputs = Array.from(list.querySelectorAll('input[type="checkbox"]'));
      const progress = document.querySelector('[data-check-progress="' + name + '"]');
      function updateProgress() {
        if (!progress) return;
        const checkedCount = inputs.filter(function (input) { return input.checked; }).length;
        progress.textContent = checkedCount + " из " + inputs.length + " пунктов выполнено";
      }
      let savedChecks = [];
      try { savedChecks = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { savedChecks = []; }
      inputs.forEach(function (input, index) {
        input.checked = savedChecks.indexOf(index) !== -1;
        input.addEventListener("change", function () {
          const checked = inputs.reduce(function (result, item, itemIndex) {
            if (item.checked) result.push(itemIndex);
            return result;
          }, []);
          try { localStorage.setItem(key, JSON.stringify(checked)); } catch (e) { /* приватный режим */ }
          updateProgress();
        });
      });
      updateProgress();
      const reset = document.querySelector('[data-checklist-reset="' + name + '"]');
      if (reset) reset.addEventListener("click", function () {
        inputs.forEach(function (input) { input.checked = false; });
        try { localStorage.removeItem(key); } catch (e) { /* приватный режим */ }
        updateProgress();
      });
    });

    // --- Возврат к началу длинной страницы ---
    const topButton = document.createElement("button");
    topButton.className = "back-to-top";
    topButton.type = "button";
    topButton.textContent = "↑";
    topButton.hidden = true;
    topButton.setAttribute("aria-label", "Наверх");
    topButton.title = "Наверх";
    document.body.appendChild(topButton);
    function updateTopButton() { topButton.hidden = window.scrollY < 600; }
    window.addEventListener("scroll", updateTopButton, { passive: true });
    topButton.addEventListener("click", function () {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
    updateTopButton();
  });
})();
