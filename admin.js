/**
 * Админ-панель рекламы для сайта «ЭлектроТранспорт».
 * Работает без сервера: объявления редактируются в браузере (черновик в localStorage),
 * публикация — экспорт файла js/ads.js и замена его в папке сайта.
 */
(function () {
  "use strict";

  const CFG = window.ELTRANSPORT_CONFIG || {};
  const DRAFT_KEY = "eltransport_ads_draft";
  const SESSION_KEY = "eltransport_admin_until";
  const STATS_KEY = "eltransport_ad_stats";
  const PUBLISHED = window.ELTRANSPORT_ADS;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let ads = []; // рабочий массив (черновик)

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  /* ---------- Тема ---------- */
  function initTheme() {
    const saved = localStorage.getItem("eltransport_theme");
    const theme = saved || CFG.defaultTheme || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    const btn = $("#themeToggle");
    if (!btn) return;
    btn.textContent = theme === "dark" ? "🌙" : "☀️";
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("eltransport_theme", next);
      btn.textContent = next === "dark" ? "🌙" : "☀️";
    });
  }

  /* ---------- Авторизация (клиентская) ---------- */
  function sessionValid() {
    const until = Number(localStorage.getItem(SESSION_KEY) || 0);
    return until > Date.now();
  }
  function startSession() {
    const mins = Number(CFG.adminSessionMinutes) || 120;
    localStorage.setItem(SESSION_KEY, String(Date.now() + mins * 60000));
  }
  function applyView() {
    const logged = sessionValid();
    $("#loginView").hidden = logged;
    $("#dashboardView").hidden = !logged;
    $("#logoutBtn").hidden = !logged;
    if (logged) renderAll();
  }
  function initAuth() {
    $("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const val = $("#passwordInput").value;
      if (val === CFG.adminPassword) {
        startSession();
        $("#passwordInput").value = "";
        applyView();
        toast("Добро пожаловать!");
      } else {
        toast("Неверный пароль");
        $("#passwordInput").select();
      }
    });
    $("#logoutBtn").addEventListener("click", () => {
      localStorage.removeItem(SESSION_KEY);
      applyView();
    });
  }

  /* ---------- Данные ---------- */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function loadDraft() {
    const published = (PUBLISHED && Array.isArray(PUBLISHED.items)) ? clone(PUBLISHED.items) : [];
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) { ads = parsed; return; }
      }
    } catch (e) {}
    ads = published;
  }
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(ads)); } catch (e) {}
  }
  function readStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function uid() {
    return "ad-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }


  /* ---------- Рендер дашборда ---------- */
  const ZONES = {
    leaderboard: "Шапка",
    sidebar: "Сайдбар",
    feed: "Лента статей",
    prefooter: "Перед подвалом",
    popup: "Попандер"
  };

  function renderStats() {
    const stats = readStats();
    const total = ads.length;
    const active = ads.filter((a) => a.active).length;
    let views = 0, clicks = 0;
    ads.forEach((a) => {
      const s = stats[a.id];
      if (s) { views += s.views || 0; clicks += s.clicks || 0; }
    });
    $("#adminStats").innerHTML = `
      <div class="mini-stat"><b>${total}</b><span>всего объявлений</span></div>
      <div class="mini-stat"><b>${active}</b><span>активных</span></div>
      <div class="mini-stat"><b>${views}</b><span>показов (локальных)</span></div>
      <div class="mini-stat"><b>${clicks}</b><span>кликов (локальных)</span></div>`;
  }

  function renderTable() {
    const body = $("#adsTableBody");
    const stats = readStats();
    $("#adsEmpty").hidden = ads.length > 0;
    body.innerHTML = ads.map((a) => {
      const s = stats[a.id] || { views: 0, clicks: 0 };
      const period = (a.start || a.end)
        ? `${esc(a.start || "…")} — ${esc(a.end || "…")}`
        : "без ограничений";
      return `<tr data-id="${esc(a.id)}">
        <td><span class="ad-title">${esc(a.title)}</span><span class="ad-link">${esc(a.link || "")}</span></td>
        <td>${esc(ZONES[a.zone] || a.zone)}</td>
        <td>${a.format === "native" ? "картинка + текст" : "текст"}</td>
        <td>${period}</td>
        <td>${Number(a.showPercent) || 100}</td>
        <td><span class="badge-status ${a.active ? "on" : "off"}">${a.active ? "активно" : "выкл"}</span></td>
        <td>${s.views || 0}</td>
        <td>${s.clicks || 0}</td>
        <td><div class="row-actions">
          <button class="mini-btn" data-act="edit">✏</button>
          <button class="mini-btn" data-act="toggle" title="Вкл/выкл">${a.active ? "⏸" : "▶"}</button>
          <button class="mini-btn" data-act="copy" title="Дублировать">⧉</button>
          <button class="mini-btn danger" data-act="del" title="Удалить">🗑</button>
        </div></td>
      </tr>`;
    }).join("");
  }

  function renderAll() {
    renderStats();
    renderTable();
  }

  $("#adsTableBody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest("tr").getAttribute("data-id");
    const idx = ads.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const act = btn.getAttribute("data-act");
    if (act === "edit") openEditor(ads[idx]);
    if (act === "toggle") { ads[idx].active = !ads[idx].active; commit("Статус изменён"); }
    if (act === "copy") {
      const copyItem = clone(ads[idx]);
      copyItem.id = uid();
      copyItem.title = copyItem.title + " (копия)";
      ads.splice(idx + 1, 0, copyItem);
      commit("Объявление продублировано");
    }
    if (act === "del") {
      if (confirm(`Удалить «${ads[idx].title}»?`)) { ads.splice(idx, 1); commit("Объявление удалено"); }
    }
  });

  function commit(msg) {
    saveDraft();
    renderAll();
    if (msg) toast(msg);
  }

  /* ---------- Редактор ---------- */
  function openEditor(ad) {
    const isNew = !ad;
    const a = ad || {
      id: "", title: "", text: "", zone: "leaderboard", format: "text",
      link: "", image: "", active: true, priority: 1, showPercent: 100, start: "", end: ""
    };
    $("#editorTitle").textContent = isNew ? "Новое объявление" : "Редактирование";
    $("#fId").value = a.id || "";
    $("#fTitle").value = a.title || "";
    $("#fText").value = a.text || "";
    $("#fZone").value = a.zone || "leaderboard";
    $("#fFormat").value = a.format || "text";
    $("#fLink").value = a.link || "";
    $("#fImage").value = a.image && !String(a.image).startsWith("data:") ? a.image : "";
    $("#fStart").value = a.start || "";
    $("#fEnd").value = a.end || "";
    $("#fPercent").value = a.showPercent || 100;
    $("#fPriority").value = a.priority == null ? 1 : a.priority;
    $("#fActive").checked = a.active !== false;
    $("#imageInfo").textContent = String(a.image || "").startsWith("data:") ? "встроенное изображение (base64)" : "";
    $("#editorModal").classList.add("open");
    document.body.style.overflow = "hidden";
    updatePreview();
    $("#fTitle").focus();
  }

  function closeEditor() {
    $("#editorModal").classList.remove("open");
    document.body.style.overflow = "";
  }

  function formData() {
    return {
      id: $("#fId").value || uid(),
      title: $("#fTitle").value.trim(),
      text: $("#fText").value.trim(),
      zone: $("#fZone").value,
      format: $("#fFormat").value,
      link: $("#fLink").value.trim(),
      image: $("#fImage").value.trim(),
      start: $("#fStart").value,
      end: $("#fEnd").value,
      showPercent: Math.min(100, Math.max(1, Number($("#fPercent").value) || 100)),
      priority: Number($("#fPriority").value) || 0,
      active: $("#fActive").checked
    };
  }

  function updatePreview() {
    const ad = formData();
    const box = $("#previewBox");
    if (!ad.title) { box.innerHTML = `<p class="muted small">Заполните название — здесь появится предпросмотр.</p>`; return; }
    const image = ad.image ? `<img src="${esc(ad.image)}" alt="" loading="lazy">` : "";
    const body = `<div class="ad-body"><h4>${esc(ad.title)}</h4><p>${esc(ad.text)}</p><span class="ad-cta">Подробнее →</span></div>`;
    const inner = image
      ? `<div class="ad-native">${image}${body}</div>`
      : `<div class="ad-text"><h4>${esc(ad.title)}</h4><p>${esc(ad.text)}</p><span class="ad-cta">Подробнее →</span></div>`;
    box.innerHTML = `<div class="ad-slot${ad.zone === "sidebar" ? " ad-sidebar" : ""}"><span class="ad-label">Реклама</span>${inner}</div>`;
    const img = box.querySelector("img");
    if (img) img.addEventListener("error", () => { img.style.display = "none"; });
  }


  /* ---------- Загрузка изображения (сжатие в canvas) ---------- */
  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) { toast("Нужен файл изображения"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        $("#fImage").value = dataUrl;
        $("#imageInfo").textContent = `встроено: ${w}×${h}, ${Math.round(dataUrl.length / 1024)} КБ`;
        updatePreview();
        toast("Изображение встроено в объявление");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- Экспорт / Импорт ---------- */
  function exportAds() {
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: ads
    };
    const text =
      "/**\n" +
      " * Рекламные объявления сайта «ЭлектроТранспорт».\n" +
      " * Сгенерировано админ-панелью " + new Date().toLocaleString("ru-RU") + "\n" +
      " * Разместите этот файл в папке js/ вместо старого ads.js.\n" +
      " */\n" +
      "window.ELTRANSPORT_ADS = " + JSON.stringify(payload, null, 2) + ";\n";
    const blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ads.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast("Файл ads.js выгружен — замените им js/ads.js на сайте");
  }

  function parseAdsText(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) throw new Error("Не найден JSON");
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed || !Array.isArray(parsed.items)) throw new Error("Нет поля items");
    return parsed.items;
  }

  function importAds(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const items = parseAdsText(String(reader.result));
        if (!confirm(`Импортировать ${items.length} объявлений? Текущий черновик будет заменён.`)) return;
        ads = items;
        commit("Импорт выполнен");
      } catch (err) {
        toast("Ошибка импорта: " + err.message);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  /* ---------- События ---------- */
  function bind() {
    $("#createBtn").addEventListener("click", () => openEditor(null));
    $("#exportBtn").addEventListener("click", exportAds);
    $("#importBtn").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) importAds(e.target.files[0]);
      e.target.value = "";
    });
    $("#resetBtn").addEventListener("click", () => {
      if (!confirm("Вернуть объявления из опубликованного файла ads.js? Черновик будет очищен.")) return;
      localStorage.removeItem(DRAFT_KEY);
      loadDraft();
      renderAll();
      toast("Черновик сброшен к файлу ads.js");
    });

    $("#editorClose").addEventListener("click", closeEditor);
    $("#editorCancel").addEventListener("click", closeEditor);
    $("#editorModal").addEventListener("click", (e) => { if (e.target.id === "editorModal") closeEditor(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEditor(); });

    ["#fTitle", "#fText", "#fZone", "#fFormat", "#fLink", "#fImage", "#fActive"].forEach((sel) => {
      const el = $(sel);
      el.addEventListener("input", updatePreview);
      el.addEventListener("change", updatePreview);
    });
    $("#fFile").addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
      e.target.value = "";
    });
    $("#clearImage").addEventListener("click", () => {
      $("#fImage").value = "";
      $("#imageInfo").textContent = "";
      updatePreview();
    });

    $("#adForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const ad = formData();
      if (!ad.title) { toast("Укажите название"); return; }
      if (ad.start && ad.end && ad.start > ad.end) { toast("Дата окончания раньше даты начала"); return; }
      const idx = ads.findIndex((x) => x.id === ad.id);
      if (idx >= 0) ads[idx] = ad;
      else ads.unshift(ad);
      closeEditor();
      commit("Объявление сохранено в черновик");
    });
  }

  /* ---------- Запуск ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initAuth();
    loadDraft();
    bind();
    applyView();
  });
})();
