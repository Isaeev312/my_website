(function () {
  const KEY = "vk-nvk-project-workspace";
  const stages = ["Исходные данные", "Расчёты", "Увязка", "Выпуск", "Замечания", "Завершён"];
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* приватный режим */ } }
  function dateLabel(value) { return value ? new Date(value + "T00:00:00").toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "Без срока"; }
  function late(item) { return item.deadline && item.stage !== "Завершён" && item.deadline < new Date().toISOString().slice(0, 10); }
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("[data-workspace-form]");
    if (!form) return;
    const list = document.querySelector("[data-workspace-list]");
    const empty = document.querySelector("[data-workspace-empty]");
    const summary = document.querySelector("[data-workspace-summary]");
    const filter = document.querySelector("[data-workspace-filter]");
    const status = document.querySelector("[data-workspace-status]");
    let items = read();
    function render() {
      const mode = filter.value;
      const shown = items.filter(function (item) {
        return mode === "all" || (mode === "active" && item.stage !== "Завершён") || (mode === "done" && item.stage === "Завершён") || (mode === "late" && late(item));
      });
      list.textContent = "";
      shown.forEach(function (item) {
        const article = document.createElement("article");
        article.className = "card workspace-item" + (late(item) ? " workspace-item--late" : "");
        const top = document.createElement("div"); top.className = "workspace-item__top";
        const title = document.createElement("div");
        const h3 = document.createElement("h3"); h3.textContent = item.name; title.appendChild(h3);
        const meta = document.createElement("p"); meta.className = "muted"; meta.textContent = [item.kind, item.client].filter(Boolean).join(" · "); title.appendChild(meta);
        const controls = document.createElement("div"); controls.className = "workspace-item__controls";
        const stage = document.createElement("select"); stage.setAttribute("aria-label", "Стадия проекта " + item.name);
        stages.forEach(function (value) { const option = document.createElement("option"); option.value = value; option.textContent = value; option.selected = value === item.stage; stage.appendChild(option); });
        stage.addEventListener("change", function () { item.stage = stage.value; save(items); render(); });
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "workspace-remove"; remove.textContent = "×"; remove.title = "Удалить проект"; remove.setAttribute("aria-label", "Удалить проект " + item.name);
        remove.addEventListener("click", function () { items = items.filter(function (entry) { return entry.id !== item.id; }); save(items); render(); });
        controls.append(stage, remove); top.append(title, controls); article.appendChild(top);
        const details = document.createElement("div"); details.className = "workspace-item__details";
        const due = document.createElement("span"); due.textContent = (late(item) ? "Просрочен: " : "Срок: ") + dateLabel(item.deadline);
        const next = document.createElement("span"); next.textContent = item.next || "Следующий шаг не указан";
        details.append(due, next); article.appendChild(details); list.appendChild(article);
      });
      empty.hidden = shown.length !== 0;
      const active = items.filter(function (item) { return item.stage !== "Завершён"; }).length;
      const lateCount = items.filter(late).length;
      summary.innerHTML = '<div><b>' + active + '</b><span>в работе</span></div><div><b>' + lateCount + '</b><span>просрочено</span></div><div><b>' + items.filter(function (item) { return item.stage === "Завершён"; }).length + '</b><span>завершено</span></div>';
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = new FormData(form);
      items.unshift({ id: Date.now(), name: data.get("name").trim(), kind: data.get("kind"), stage: data.get("stage"), deadline: data.get("deadline"), client: data.get("client").trim(), next: data.get("next").trim() });
      save(items); form.reset(); status.textContent = "Проект добавлен"; render();
    });
    filter.addEventListener("change", render);
    document.querySelector("[data-workspace-clear]").addEventListener("click", function () { if (items.length && window.confirm("Удалить все проекты из этого браузера?")) { items = []; save(items); render(); } });
    document.querySelector("[data-workspace-export]").addEventListener("click", function () {
      const escape = function (value) { return '"' + String(value || "").replace(/"/g, '""') + '"'; };
      const rows = [["Объект", "Раздел", "Стадия", "Дедлайн", "Заказчик", "Следующий шаг"]].concat(items.map(function (item) { return [item.name, item.kind, item.stage, item.deadline, item.client, item.next]; }));
      const blob = new Blob(["\ufeff" + rows.map(function (row) { return row.map(escape).join(";"); }).join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "projects-vk-nvk.csv"; link.click(); URL.revokeObjectURL(url);
    });
    render();
  });
})();
