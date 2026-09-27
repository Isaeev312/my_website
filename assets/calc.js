// Инженерные калькуляторы ВК/НВК. Все расчёты — в СИ внутри, ввод/вывод в привычных единицах.
(function () {
  const G = 9.81;

  function num(id) {
    const el = document.getElementById(id);
    if (!el) return NaN;
    return parseFloat(String(el.value).replace(",", "."));
  }
  function set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function setStatus(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
  }
  function fmt(x, digits) {
    if (!isFinite(x)) return "—";
    return x.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  }
  function positive() {
    for (let i = 0; i < arguments.length; i++) if (!(arguments[i] > 0)) return false;
    return true;
  }

  // Кинематическая вязкость воды, м²/с (формула Пуазейля), t — °C
  function waterViscosity(t) {
    return 1.78e-6 / (1 + 0.0337 * t + 0.000221 * t * t);
  }

  // Коэффициент гидравлического трения: ламинарный режим — 64/Re, иначе Коулбрук–Уайт (итерации)
  function frictionFactor(re, relRough) {
    if (re < 2300) return 64 / re;
    // Начальное приближение — Свами–Джейн
    let lambda = 0.25 / Math.pow(Math.log10(relRough / 3.7 + 5.74 / Math.pow(re, 0.9)), 2);
    for (let i = 0; i < 30; i++) {
      const rhs = -2 * Math.log10(relRough / 3.7 + 2.51 / (re * Math.sqrt(lambda)));
      const next = 1 / (rhs * rhs);
      if (Math.abs(next - lambda) < 1e-10) { lambda = next; break; }
      lambda = next;
    }
    return lambda;
  }

  // ===== 1. Перевод расходов =====
  const FLOW_UNITS = { ls: 1e-3, m3h: 1 / 3600, m3d: 1 / 86400, lmin: 1e-3 / 60 };
  function calcUnits(source) {
    const src = source || "ls";
    const v = num("u-" + src);
    const q = v * FLOW_UNITS[src]; // м³/с
    Object.keys(FLOW_UNITS).forEach(function (k) {
      if (k === src) return;
      const el = document.getElementById("u-" + k);
      el.value = isFinite(q) ? +(q / FLOW_UNITS[k]).toPrecision(6) : "";
    });
  }

  // ===== 2. Напорный трубопровод =====
  function calcPipe() {
    const Q = num("p-q") / 1000;      // м³/с
    const d = num("p-d") / 1000;      // м
    const L = num("p-l");             // м
    const rough = num("p-k") / 1000;  // м
    const t = num("p-t");
    const localPercent = num("p-local");
    const local = localPercent / 100;
    if (!positive(Q, d, L) || !(rough >= 0) || !isFinite(t) || !(localPercent >= 0)) {
      ["p-v", "p-re", "p-lambda", "p-i", "p-h", "p-htot", "p-regime"].forEach(function (id) { set(id, "—"); });
      setStatus("p-status", "Введите положительные расход, диаметр и длину; шероховатость и надбавка не могут быть отрицательными.");
      return;
    }
    setStatus("p-status", "");
    const A = Math.PI * d * d / 4;
    const v = Q / A;
    const nu = waterViscosity(t);
    const re = v * d / nu;
    const lambda = frictionFactor(re, rough / d);
    const i = lambda / d * v * v / (2 * G);   // м/м
    const h = i * L;
    set("p-v", fmt(v, 3) + " м/с");
    set("p-re", fmt(re, 0));
    set("p-lambda", fmt(lambda, 5));
    set("p-i", fmt(i * 1000, 2) + " мм/м");
    set("p-h", fmt(h, 3) + " м");
    set("p-htot", fmt(h * (1 + local), 3) + " м");
    set("p-regime", re < 2300 ? "ламинарный" : re < 4000 ? "переходный" : "турбулентный");
  }

  // ===== 3. Подбор диаметра по скорости =====
  function calcDiam() {
    const Q = num("d-q") / 1000;
    const v = num("d-v");
    if (!positive(Q, v)) {
      set("d-d", "—"); set("d-dn", "—"); set("d-vreal", "—");
      setStatus("d-status", "Введите положительные расход и целевую скорость.");
      return;
    }
    setStatus("d-status", "");
    const d = Math.sqrt(4 * Q / (Math.PI * v)) * 1000; // мм
    set("d-d", fmt(d, 1) + " мм");
    // Ближайший больший внутренний диаметр из ряда, введённого пользователем
    const series = String(document.getElementById("d-series").value)
      .split(/[;\s]+/).map(function (s) { return parseFloat(s.replace(",", ".")); })
      .filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    const pick = series.find(function (x) { return x >= d; });
    if (pick) {
      const vReal = Q / (Math.PI * Math.pow(pick / 1000, 2) / 4);
      set("d-dn", fmt(pick, 1) + " мм");
      set("d-vreal", fmt(vReal, 3) + " м/с");
    } else {
      set("d-dn", "нет в ряду");
      set("d-vreal", "—");
      setStatus("d-status", "В указанном ряду нет диаметра, достаточного для расчётного расхода.");
    }
  }

  // ===== 4. Самотечная канализация (частичное наполнение, формула Маннинга) =====
  function calcGravity() {
    const d = num("g-d") / 1000;      // м
    const fill = num("g-fill");       // h/d
    const slope = num("g-i") / 1000;  // м/м (ввод в ‰)
    const n = num("g-n");
    if (!positive(d, slope, n) || !(fill > 0 && fill <= 1)) {
      ["g-v", "g-q", "g-qfull", "g-a", "g-r"].forEach(function (id) { set(id, "—"); });
      setStatus("g-status", "Введите положительные диаметр, уклон и коэффициент n; наполнение должно быть больше 0 и не больше 1.");
      return;
    }
    setStatus("g-status", "");
    // Центральный угол смоченного сегмента
    const theta = 2 * Math.acos(1 - 2 * fill);
    const A = d * d / 8 * (theta - Math.sin(theta));
    const P = d * theta / 2;
    const R = A / P;
    const v = Math.pow(R, 2 / 3) * Math.sqrt(slope) / n;
    const q = v * A;
    const Afull = Math.PI * d * d / 4;
    const vFull = Math.pow(d / 4, 2 / 3) * Math.sqrt(slope) / n;
    set("g-v", fmt(v, 3) + " м/с");
    set("g-q", fmt(q * 1000, 2) + " л/с");
    set("g-qfull", fmt(vFull * Afull * 1000, 2) + " л/с");
    set("g-a", fmt(A * 1e4, 1) + " см²");
    set("g-r", fmt(R * 1000, 1) + " мм");
  }

  // ===== 5. Суточное водопотребление по норме =====
  function calcDaily() {
    const norm = num("w-norm");  // л/сут на единицу
    const count = num("w-count");
    const hours = num("w-hours");
    if (!positive(norm, count, hours) || hours > 24) {
      set("w-day", "—"); set("w-hour", "—"); set("w-sec", "—");
      setStatus("w-status", "Введите положительные значения; период водопотребления должен быть не больше 24 часов.");
      return;
    }
    setStatus("w-status", "");
    const day = norm * count / 1000;        // м³/сут
    const hour = day / hours;               // м³/ч
    set("w-day", fmt(day, 2) + " м³/сут");
    set("w-hour", fmt(hour, 3) + " м³/ч");
    set("w-sec", fmt(hour / 3.6, 3) + " л/с");
  }

  document.addEventListener("DOMContentLoaded", function () {
    Object.keys(FLOW_UNITS).forEach(function (k) {
      const el = document.getElementById("u-" + k);
      if (el) el.addEventListener("input", function () { calcUnits(k); });
    });
    const bind = function (prefix, fn) {
      document.querySelectorAll('[id^="' + prefix + '"]').forEach(function (el) {
        if (el.tagName === "INPUT" || el.tagName === "SELECT") el.addEventListener("input", fn);
      });
      fn();
    };
    bind("p-", calcPipe);
    bind("d-", calcDiam);
    bind("g-", calcGravity);
    bind("w-", calcDaily);
    calcUnits("ls");

    // Пресеты шероховатости и коэффициента n
    document.querySelectorAll("[data-preset]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        const target = document.getElementById(sel.getAttribute("data-preset"));
        if (sel.value) {
          target.value = sel.value;
          target.dispatchEvent(new Event("input"));
        }
      });
    });

    document.querySelectorAll("[data-copy-result]").forEach(function (button) {
      button.addEventListener("click", function () {
        const result = document.querySelector(button.getAttribute("data-copy-result"));
        const status = button.parentElement.querySelector("[data-copy-status]");
        if (!result) return;
        const lines = Array.from(result.querySelectorAll(".result__row")).map(function (row) {
          const label = row.querySelector("span");
          const value = row.querySelector("b");
          return label.textContent.trim() + ": " + value.textContent.trim();
        });
        const copied = navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(lines.join("\n")) : Promise.reject();
        copied.then(function () {
          if (status) status.textContent = "Результат скопирован";
        }).catch(function () {
          if (status) status.textContent = "Не удалось скопировать результат";
        });
      });
    });
  });

  // Экспорт для проверки из консоли
  window.VKCalc = { waterViscosity: waterViscosity, frictionFactor: frictionFactor };
})();
