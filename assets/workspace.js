(function () {
  const KEY = "vk-nvk-project-workspace";
  const stages = ["Исходные данные", "Расчёты", "Увязка", "Выпуск", "Замечания", "Завершён"];
  const taskLabels = ["Исходные данные", "Расчёты", "Увязка", "Выдача"];
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* приватный режим */ } }
  function dateLabel(value) {
    if (!value) return "Без срока";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deadline = new Date(value + "T00:00:00");
    const days = Math.round((deadline - today) / 86400000);
    if (days === 0) return "Сегодня";
    if (days === 1) return "Завтра";
    if (days < 0) return "Просрочен на " + Math.abs(days) + " дн.";
    return deadline.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) + " · через " + days + " дн.";
  }
  function late(item) { return item.deadline && item.stage !== "Завершён" && item.deadline < new Date().toISOString().slice(0, 10); }
  function upcoming(item) {
    if (!item.deadline || item.stage === "Завершён") return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today); limit.setDate(limit.getDate() + 7);
    const deadline = new Date(item.deadline + "T00:00:00");
    return deadline >= today && deadline <= limit;
  }
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("[data-workspace-form]");
    if (!form) return;
    const list = document.querySelector("[data-workspace-list]");
    const empty = document.querySelector("[data-workspace-empty]");
    const summary = document.querySelector("[data-workspace-summary]");
    const filter = document.querySelector("[data-workspace-filter]");
    const search = document.querySelector("[data-workspace-search]");
    const status = document.querySelector("[data-workspace-status]");
    const importFile = document.querySelector("[data-workspace-file]");
    const formTitle = document.querySelector("[data-workspace-form-title]");
    const submit = document.querySelector("[data-workspace-submit]");
    const cancel = document.querySelector("[data-workspace-cancel]");
    let items = read();
    let editingId = null;
    function resetForm() {
      editingId = null;
      form.reset();
      formTitle.textContent = "Новый проект";
      submit.textContent = "Добавить проект";
      cancel.hidden = true;
    }
    function startEdit(item) {
      editingId = item.id;
      form.elements.name.value = item.name;
      form.elements.kind.value = item.kind;
      form.elements.stage.value = item.stage;
      form.elements.deadline.value = item.deadline;
      form.elements.client.value = item.client;
      form.elements.next.value = item.next;
      formTitle.textContent = "Изменить проект";
      submit.textContent = "Сохранить изменения";
      cancel.hidden = false;
      form.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      form.elements.name.focus();
    }
    function render() {
      const mode = filter.value;
      const query = search.value.trim().toLowerCase();
      const shown = items.filter(function (item) {
        const matches = !query || [item.name, item.client, item.next, item.kind, item.stage].join(" ").toLowerCase().includes(query);
        return matches && (mode === "all" || (mode === "active" && item.stage !== "Завершён") || (mode === "upcoming" && upcoming(item)) || (mode === "done" && item.stage === "Завершён") || (mode === "late" && late(item)));
      }).sort(function (a, b) {
        const aDone = a.stage === "Завершён";
        const bDone = b.stage === "Завершён";
        if (aDone !== bDone) return aDone ? 1 : -1;
        if (!a.deadline && !b.deadline) return b.id - a.id;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
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
        const edit = document.createElement("button"); edit.type = "button"; edit.className = "workspace-action"; edit.textContent = "Изменить";
        edit.addEventListener("click", function () { startEdit(item); });
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "workspace-remove"; remove.textContent = "×"; remove.title = "Удалить проект"; remove.setAttribute("aria-label", "Удалить проект " + item.name);
        remove.addEventListener("click", function () {
          if (!window.confirm("Удалить проект «" + item.name + "» из этого браузера?")) return;
          items = items.filter(function (entry) { return entry.id !== item.id; });
          if (editingId === item.id) resetForm();
          save(items); status.textContent = "Проект удалён"; render();
        });
        controls.append(stage, edit, remove); top.append(title, controls); article.appendChild(top);
        const details = document.createElement("div"); details.className = "workspace-item__details";
        const due = document.createElement("span"); due.textContent = "Срок: " + dateLabel(item.deadline);
        const next = document.createElement("span"); next.textContent = item.next || "Следующий шаг не указан";
        details.append(due, next); article.appendChild(details); list.appendChild(article);
        const tasks = Array.isArray(item.tasks) ? item.tasks : [];
        const checklist = document.createElement("div"); checklist.className = "workspace-checklist";
        const completed = tasks.filter(Boolean).length;
        const caption = document.createElement("span"); caption.textContent = completed + " / " + taskLabels.length + " шагов"; checklist.appendChild(caption);
        taskLabels.forEach(function (label, index) {
          const labelEl = document.createElement("label");
          const input = document.createElement("input"); input.type = "checkbox"; input.checked = Boolean(tasks[index]);
          input.addEventListener("change", function () { item.tasks = taskLabels.map(function (_, taskIndex) { return taskIndex === index ? input.checked : Boolean(tasks[taskIndex]); }); save(items); render(); });
          labelEl.append(input, document.createTextNode(label)); checklist.appendChild(labelEl);
        });
        article.appendChild(checklist);
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
      const existing = items.find(function (item) { return item.id === editingId; });
      const project = { id: editingId || Date.now(), name: data.get("name").trim(), kind: data.get("kind"), stage: data.get("stage"), deadline: data.get("deadline"), client: data.get("client").trim(), next: data.get("next").trim(), tasks: existing && Array.isArray(existing.tasks) ? existing.tasks : [] };
      if (editingId) items = items.map(function (item) { return item.id === editingId ? project : item; });
      else items.unshift(project);
      save(items); status.textContent = editingId ? "Изменения сохранены" : "Проект добавлен"; resetForm(); render();
    });
    cancel.addEventListener("click", function () { resetForm(); status.textContent = "Изменения отменены"; });
    filter.addEventListener("change", render);
    search.addEventListener("input", render);
    document.querySelector("[data-workspace-clear]").addEventListener("click", function () { if (items.length && window.confirm("Удалить все проекты из этого браузера?")) { items = []; save(items); render(); } });
    document.querySelector("[data-workspace-export]").addEventListener("click", function () {
      const escape = function (value) { return '"' + String(value || "").replace(/"/g, '""') + '"'; };
      const rows = [["Объект", "Раздел", "Стадия", "Дедлайн", "Заказчик", "Следующий шаг"]].concat(items.map(function (item) { return [item.name, item.kind, item.stage, item.deadline, item.client, item.next]; }));
      const blob = new Blob(["\ufeff" + rows.map(function (row) { return row.map(escape).join(";"); }).join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "projects-vk-nvk.csv"; link.click(); URL.revokeObjectURL(url);
    });
    function download(text, name, type) {
      const blob = new Blob([text], { type: type });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
    }
    document.querySelector("[data-workspace-backup]").addEventListener("click", function () {
      download(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), projects: items }, null, 2), "projects-vk-nvk-backup.json", "application/json");
      status.textContent = "Резервная копия создана";
    });
    document.querySelector("[data-workspace-import]").addEventListener("click", function () { importFile.click(); });
    importFile.addEventListener("change", function () {
      const file = importFile.files && importFile.files[0];
      if (!file) return;
      if (items.length && !window.confirm("Текущий список будет заменён данными из резервной копии. Продолжить?")) { importFile.value = ""; return; }
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const data = JSON.parse(String(reader.result));
          const projects = Array.isArray(data.projects) ? data.projects : null;
          if (!projects || projects.some(function (item) { return !item || typeof item.name !== "string" || !stages.includes(item.stage); })) throw new Error("invalid");
          items = projects.map(function (item) { return { id: item.id || Date.now() + Math.random(), name: item.name, kind: item.kind || "ВК", stage: item.stage, deadline: item.deadline || "", client: item.client || "", next: item.next || "", tasks: Array.isArray(item.tasks) ? item.tasks : [] }; });
          save(items); resetForm(); render(); status.textContent = "Резервная копия восстановлена";
        } catch (e) { status.textContent = "Не удалось прочитать резервную копию"; }
        importFile.value = "";
      };
      reader.readAsText(file, "UTF-8");
    });
    render();
  });
})();
