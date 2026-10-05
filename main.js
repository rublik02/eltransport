/**
 * ЭлектроТранспорт — основной скрипт.
 * Рендерит контент из window.ELTRANSPORT_DATA, управляет темой, фильтрами,
 * модальными окнами, калькулятором и рекламными зонами (window.ELTRANSPORT_ADS).
 */
(function () {
  "use strict";

  const D = window.ELTRANSPORT_DATA || {};
  const CFG = window.ELTRANSPORT_CONFIG || {};
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const catById = (id) => (D.categories || []).find((c) => c.id === id) || { title: id, icon: "🚗" };
  const fmtMoney = (n) => Math.round(n).toLocaleString("ru-RU") + " ₽";
  const fmtNum = (n, d) => n.toLocaleString("ru-RU", { maximumFractionDigits: d === undefined ? 1 : d });
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* Фолбэк для битых изображений */
  function guardImage(img) {
    const onErr = () => {
      img.classList.add("failed");
      const holder = img.parentElement;
      if (holder) holder.classList.add("img-fallback");
    };
    img.addEventListener("error", onErr);
    if (img.complete && img.naturalWidth === 0 && img.src) onErr();
  }
  const guardImages = (root) => $$("img", root).forEach(guardImage);

  /* Тема */
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

  /* Шапка: бургер, прогресс, активный пункт */
  function initHeader() {
    const nav = $("#mainNav");
    const burger = $("#burger");
    if (burger && nav) {
      burger.addEventListener("click", () => nav.classList.toggle("open"));
      nav.addEventListener("click", (e) => { if (e.target.tagName === "A") nav.classList.remove("open"); });
    }
    const progress = $("#progressBar");
    const toTop = $("#toTop");
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (progress) progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
      if (toTop) toTop.classList.toggle("show", h.scrollTop > 600);
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    const links = $$("#mainNav a");
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      const spy = new IntersectionObserver(
        (entries) => entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
        }),
        { rootMargin: "-40% 0px -55% 0px" }
      );
      sections.forEach((s) => spy.observe(s));
    }
  }

  /* Появление при скролле */
  function initReveal() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("visible")); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); } }),
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }


  /* ---------- Hero + статистика ---------- */
  function animateCounters(root) {
    const nums = $$("[data-count]", root);
    const run = (el) => {
      const target = Number(el.getAttribute("data-count")) || 0;
      const stat = (D.stats || []).find((s) => String(s.value) === el.getAttribute("data-count"));
      const suffix = stat ? stat.suffix : "";
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1200);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: 0.5 });
    nums.forEach((n) => io.observe(n));
  }

  function renderHero() {
    const hero = D.hero || {};
    const titleEl = $("#heroTitle");
    if (titleEl && hero.title) {
      const parts = hero.title.split("—");
      titleEl.innerHTML = esc(parts[0]).trim() + (parts.length > 1 ? " — <span>" + esc(parts.slice(1).join("—")).trim() + "</span>" : "");
    }
    const sub = $("#heroSubtitle"); if (sub && hero.subtitle) sub.textContent = hero.subtitle;
    const badge = $("#heroBadge"); if (badge && hero.badge) badge.textContent = hero.badge;
    const cap = $("#heroCaption"); if (cap && hero.imageCaption) cap.textContent = hero.imageCaption;
    if (hero.ctaPrimary) { const b = $("#heroCta1"); b.textContent = hero.ctaPrimary.label; b.setAttribute("href", hero.ctaPrimary.href); }
    if (hero.ctaSecondary) { const b = $("#heroCta2"); b.textContent = hero.ctaSecondary.label; b.setAttribute("href", hero.ctaSecondary.href); }
    const img = $("#heroImage");
    if (img && hero.image) { img.src = hero.image; guardImage(img); }

    const grid = $("#statsGrid");
    if (grid) {
      grid.innerHTML = (D.stats || [])
        .map((s, i) => `<div class="stat reveal"><b data-count="${s.value}" id="statN${i}">0</b><span>${esc(s.label)}</span></div>`)
        .join("");
      animateCounters(grid);
      $$(".stat", grid).forEach((el, i) => setTimeout(() => el.classList.add("visible"), 90 * i));
    }
  }

  /* ---------- Направления ---------- */
  function renderDirections() {
    const grid = $("#directionsGrid");
    if (!grid) return;
    const articles = D.articles || [];
    grid.innerHTML = (D.categories || []).map((c) => {
      const n = articles.filter((a) => a.cat === c.id).length;
      return `<article class="dir-card reveal" data-cat="${esc(c.id)}" tabindex="0">
        <span class="count">${n} ${plural(n, "материал", "материала", "материалов")}</span>
        <div class="icon">${esc(c.icon)}</div>
        <h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`;
    }).join("");
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".dir-card");
      if (!card) return;
      setFilter(card.getAttribute("data-cat"));
      $("#articles").scrollIntoView({ behavior: "smooth" });
    });
    setTimeout(() => $$(".dir-card", grid).forEach((el, i) => setTimeout(() => el.classList.add("visible"), 70 * i)), 60);
  }


  /* ---------- Статьи: рендер, фильтр, поиск, модальное окно ---------- */
  let activeCat = "all";
  let searchQuery = "";

  function renderChips() {
    const box = $("#filterChips");
    if (!box) return;
    const chips = [{ id: "all", title: "Все" }].concat(D.categories || []);
    box.innerHTML = chips.map((c) => `<button type="button" class="chip${c.id === activeCat ? " active" : ""}" data-cat="${esc(c.id)}">${esc(c.title)}</button>`).join("");
    box.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) setFilter(chip.getAttribute("data-cat"));
    });
  }

  function setFilter(cat) {
    activeCat = cat || "all";
    $$("#filterChips .chip").forEach((c) => c.classList.toggle("active", c.getAttribute("data-cat") === activeCat));
    renderArticles();
  }

  function renderArticles() {
    const grid = $("#articlesGrid");
    if (!grid) return;
    const q = searchQuery.trim().toLowerCase();
    const list = (D.articles || []).filter((a) => {
      const okCat = activeCat === "all" || a.cat === activeCat;
      const hay = (a.title + " " + a.excerpt + " " + (a.tags || []).join(" ")).toLowerCase();
      return okCat && (!q || hay.includes(q));
    });
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state">Ничего не найдено. Попробуйте другой запрос или сбросьте фильтр.</div>`;
      return;
    }
    grid.innerHTML = list.map((a) => {
      const c = catById(a.cat);
      const date = new Date(a.date).toLocaleDateString("ru-RU");
      return `<article class="article-card reveal visible" data-id="${esc(a.id)}" tabindex="0">
        <div class="thumb"><img loading="lazy" src="${esc(a.image)}" alt="${esc(a.title)}" /><span class="badge">${esc(c.icon)} ${esc(c.title)}</span></div>
        <div class="card-body">
          <div class="meta"><span>🗓 ${date}</span><span>⏱ ${esc(a.read)}</span></div>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.excerpt)}</p>
          <span class="read-more">Читать статью →</span>
        </div></article>`;
    }).join("");
    guardImages(grid);
    grid.querySelectorAll(".article-card").forEach((card) => {
      card.addEventListener("click", () => openArticle(card.getAttribute("data-id")));
      card.addEventListener("keydown", (e) => { if (e.key === "Enter") openArticle(card.getAttribute("data-id")); });
    });
  }

  function openArticle(id) {
    const a = (D.articles || []).find((x) => x.id === id);
    if (!a) return;
    const c = catById(a.cat);
    const modal = $("#articleModal");
    const img = $("#modalImage");
    img.classList.remove("failed");
    if (img.parentElement) img.parentElement.classList.remove("img-fallback");
    img.src = a.image;
    img.alt = a.title;
    guardImage(img);
    const date = new Date(a.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    $("#modalContent").innerHTML =
      `<div class="kicker">${esc(c.icon)} ${esc(c.title)}</div>` +
      `<h2>${esc(a.title)}</h2>` +
      `<div class="meta"><span>🗓 ${date}</span><span>⏱ ${esc(a.read)}</span><span>Теги: ${esc((a.tags || []).join(", "))}</span></div>` +
      (a.body || []).map((p) => `<p>${esc(p)}</p>`).join("");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    modal.scrollTop = 0;
  }

  function closeArticle() {
    const modal = $("#articleModal");
    if (modal) modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  function initArticles() {
    renderChips();
    renderArticles();
    const input = $("#searchInput");
    if (input) {
      let t = null;
      input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { searchQuery = input.value; renderArticles(); }, 180);
      });
    }
    const modal = $("#articleModal");
    $("#modalClose").addEventListener("click", closeArticle);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeArticle(); });
  }

  /* ---------- Новости ---------- */
  function renderNews() {
    const box = $("#newsList");
    if (!box) return;
    box.innerHTML = (D.news || []).map((n) => {
      const date = new Date(n.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
      return `<div class="news-item"><div class="date">${date} · ${esc(n.tag)}</div><h4>${esc(n.title)}</h4><p>${esc(n.text)}</p></div>`;
    }).join("");
  }


  /* ---------- Калькулятор ---------- */
  function initCalculator() {
    const cfg = D.calculator || {};
    const fields = [
      ["inDistance", cfg.distance],
      ["inFuelUse", cfg.fuelUse],
      ["inFuelPrice", cfg.fuelPrice],
      ["inPowerUse", cfg.powerUse],
      ["inPowerPrice", cfg.powerPrice]
    ];
    fields.forEach(([id, val]) => {
      const inp = $("#" + id);
      if (!inp) return;
      inp.value = val;
      inp.addEventListener("input", calc);
    });
    calc();
  }

  function calc() {
    const cfg = D.calculator || {};
    const num = (id, def) => {
      const el = $("#" + id);
      const v = el ? parseFloat(el.value) : NaN;
      return isNaN(v) ? def : v;
    };
    const distance = num("inDistance", cfg.distance);
    const fuelUse = num("inFuelUse", cfg.fuelUse);
    const fuelPrice = num("inFuelPrice", cfg.fuelPrice);
    const powerUse = num("inPowerUse", cfg.powerUse);
    const powerPrice = num("inPowerPrice", cfg.powerPrice);

    const iceFuelYear = ((distance * fuelUse) / 100) * fuelPrice;
    const iceTotal = iceFuelYear + (cfg.serviceIce || 0);
    const evPowerYear = ((distance * powerUse) / 100) * powerPrice;
    const evTotal = evPowerYear + (cfg.serviceEv || 0);
    const saving = iceTotal - evTotal;
    const per100Ice = fuelUse * fuelPrice;
    const per100Ev = powerUse * powerPrice;
    const co2Ice = ((distance * fuelUse) / 100) * (cfg.co2Fuel || 2.31);
    const co2Ev = ((distance * powerUse) / 100) * (cfg.co2Grid || 0.32);
    const co2Cut = co2Ice > 0 ? Math.max(0, Math.round((1 - co2Ev / co2Ice) * 100)) : 0;

    const box = $("#calcResult");
    if (!box) return;
    const setLabel = (id, txt) => { const el = $("#" + id); if (el) el.textContent = txt; };
    setLabel("lblDistance", fmtNum(distance, 0));
    setLabel("lblFuelUse", fmtNum(fuelUse));
    setLabel("lblFuelPrice", fmtNum(fuelPrice, 0));
    setLabel("lblPowerUse", fmtNum(powerUse));
    setLabel("lblPowerPrice", fmtNum(powerPrice));
    box.innerHTML =
      `<div class="result-card"><span class="label">Бензин: 100 км ≈ ${fmtNum(per100Ice, 0)} ₽</span><span class="value">${fmtMoney(iceFuelYear)}<small style="font-size:12px;color:var(--muted)"> /год</small></span></div>` +
      `<div class="result-card"><span class="label">Электромобиль: 100 км ≈ ${fmtNum(per100Ev, 0)} ₽</span><span class="value">${fmtMoney(evPowerYear)}<small style="font-size:12px;color:var(--muted)"> /год</small></span></div>` +
      `<div class="result-card win"><span class="label">Экономия в год<br/>(энергия + ТО)</span><span class="value">${fmtMoney(saving)}</span></div>` +
      `<div class="result-card win"><span class="label">Экономия за 5 лет</span><span class="value">${fmtMoney(saving * 5)}</span></div>` +
      `<div class="result-card"><span class="label">CO₂: бензин ${fmtNum(co2Ice / 1000, 2)} т/год → электро ${fmtNum(co2Ev / 1000, 2)} т/год</span><span class="value">−${co2Cut} %</span></div>` +
      `<div class="calc-note">Расчёт ориентировочный: реальные цифры зависят от манеры езды, температуры и тарифов. CO₂ считается по коэффициентам из js/data.js.</div>`;
  }

  /* ---------- Таблица сравнения ---------- */
  function renderCompare() {
    const cmp = D.comparison || {};
    const head = $("#compareHead");
    const body = $("#compareBody");
    if (!head || !body) return;
    head.innerHTML = "<tr>" + (cmp.columns || []).map((c) => `<th>${esc(c)}</th>`).join("") + "</tr>";
    body.innerHTML = (cmp.rows || []).map((r) => "<tr>" + r.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>").join("");
  }

  /* ---------- FAQ ---------- */
  function renderFaq() {
    const box = $("#faqList");
    if (!box) return;
    box.innerHTML = (D.faq || [])
      .map((f, i) => `<details class="faq-item reveal visible"${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><div class="faq-a">${esc(f.a)}</div></details>`)
      .join("");
  }


  /* ---------- Галерея + лайтбокс ---------- */
  let lbIndex = 0;
  function renderGallery() {
    const grid = $("#galleryGrid");
    if (!grid) return;
    grid.innerHTML = (D.gallery || [])
      .map((g, i) => `<figure class="gallery-item reveal visible" data-i="${i}" style="margin:0">
        <img loading="lazy" src="${esc(g.src)}" alt="${esc(g.title)}" />
        <figcaption>${esc(g.title)}</figcaption></figure>`)
      .join("");
    guardImages(grid);
    grid.addEventListener("click", (e) => {
      const item = e.target.closest(".gallery-item");
      if (item) openLightbox(Number(item.getAttribute("data-i")));
    });
  }

  function openLightbox(i) {
    const items = D.gallery || [];
    if (!items.length) return;
    lbIndex = (i + items.length) % items.length;
    const g = items[lbIndex];
    const img = $("#lbImage");
    img.classList.remove("failed");
    if (img.parentElement) img.parentElement.classList.remove("img-fallback");
    img.src = g.src;
    img.alt = g.title;
    guardImage(img);
    $("#lbCaption").textContent = g.title + " · фото Wikimedia Commons";
    $("#lightbox").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    const lb = $("#lightbox");
    if (lb) lb.classList.remove("open");
    const modal = $("#articleModal");
    if (!modal || !modal.classList.contains("open")) document.body.style.overflow = "";
  }
  function initLightbox() {
    $("#lbClose").addEventListener("click", closeLightbox);
    $("#lbPrev").addEventListener("click", () => openLightbox(lbIndex - 1));
    $("#lbNext").addEventListener("click", () => openLightbox(lbIndex + 1));
    $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      const lb = $("#lightbox");
      if (!lb || !lb.classList.contains("open")) return;
      if (e.key === "ArrowLeft") openLightbox(lbIndex - 1);
      if (e.key === "ArrowRight") openLightbox(lbIndex + 1);
    });
  }

  /* ---------- Видео ---------- */
  function renderVideos() {
    const grid = $("#videoGrid");
    if (!grid) return;
    grid.innerHTML = (D.videos || [])
      .map((v) => `<article class="video-card reveal visible" data-id="${esc(v.id)}">
        <div class="video-frame">
          <img class="poster" loading="lazy" src="${esc(v.poster)}" alt="${esc(v.title)}" />
          <button class="play-btn" aria-label="Смотреть">▶</button>
        </div>
        <div class="video-body">
          <h3>${esc(v.title)}</h3>
          <p>${esc(v.text)}</p>
          <a class="src" href="${esc(v.page)}" target="_blank" rel="noopener">Источник: ${esc(v.credit)} →</a>
        </div></article>`)
      .join("");
    guardImages(grid);
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".video-card");
      if (!card || e.target.closest("a")) return;
      const v = (D.videos || []).find((x) => x.id === card.getAttribute("data-id"));
      if (!v) return;
      const frame = $(".video-frame", card);
      if (!frame || $("video", frame)) return;
      frame.innerHTML = `<video controls autoplay playsinline preload="metadata" poster="${esc(v.poster)}"><source src="${esc(v.src)}" type="video/webm"></video>`;
      const vid = $("video", frame);
      vid.addEventListener("error", () => {
        frame.innerHTML = `<img class="poster" src="${esc(v.poster)}" alt="${esc(v.title)}"><div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:rgba(0,0,0,.55);font-size:14px;padding:14px;text-align:center">Видео не удалось загрузить. <a href="${esc(v.page)}" target="_blank" rel="noopener" style="color:#7cf;margin-left:6px">Открыть источник →</a></div>`;
      });
      const p = vid.play();
      if (p && p.catch) p.catch(() => {});
    });
  }


  /* ---------- Реклама (window.ELTRANSPORT_ADS) ---------- */
  const STATS_KEY = "eltransport_ad_stats";

  function readStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function writeStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function trackView(id) {
    const s = readStats();
    s[id] = s[id] || { views: 0, clicks: 0 };
    s[id].views += 1;
    s[id].updated = new Date().toISOString();
    writeStats(s);
  }
  function trackClick(id) {
    const s = readStats();
    s[id] = s[id] || { views: 0, clicks: 0 };
    s[id].clicks += 1;
    s[id].updated = new Date().toISOString();
    writeStats(s);
  }

  function adsList() {
    const ads = window.ELTRANSPORT_ADS;
    return (ads && Array.isArray(ads.items)) ? ads.items : [];
  }

  function pickAd(zone) {
    const now = Date.now();
    const pool = adsList().filter((ad) => {
      if (!ad || ad.active === false) return false;
      if (ad.zone !== zone) return false;
      if (ad.start) { const t = new Date(ad.start).getTime(); if (!isNaN(t) && now < t) return false; }
      if (ad.end) { const t = new Date(ad.end).getTime(); if (!isNaN(t) && now > t + 86400000) return false; }
      const pct = Number(ad.showPercent);
      if (!isNaN(pct) && pct < 100 && Math.random() * 100 > pct) return false;
      return true;
    });
    pool.sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
    return pool[0] || null;
  }

  function adMarkup(ad) {
    const head = `<h4>${esc(ad.title)}</h4><p>${esc(ad.text || "")}</p><span class="ad-cta">Подробнее →</span>`;
    const inner = ad.image
      ? `<div class="ad-native"><img src="${esc(ad.image)}" alt="${esc(ad.title)}" loading="lazy"><div class="ad-body">${head}</div></div>`
      : `<div class="ad-text">${head}</div>`;
    return `<div class="ad-slot${ad.zone === "sidebar" ? " ad-sidebar" : ""}" data-ad="${esc(ad.id)}">
      <span class="ad-label">Реклама</span>${inner}</div>`;
  }

  function renderZones() {
    $$(".ad-zone[data-zone]").forEach((zoneEl) => {
      const zone = zoneEl.getAttribute("data-zone");
      const ad = pickAd(zone);
      if (!ad) { zoneEl.innerHTML = ""; return; }
      zoneEl.innerHTML = adMarkup(ad);
      trackView(ad.id);
      guardImages(zoneEl);
      zoneEl.addEventListener("click", (e) => {
        if (e.target.closest(".ad-slot")) {
          trackClick(ad.id);
          if (ad.link) window.open(ad.link, "_blank", "noopener");
        }
      });
    });
  }

  function maybeShowPopup() {
    const ad = pickAd("popup");
    if (!ad) return;
    if (sessionStorage.getItem("eltransport_popup_shown") === "1") return;
    const delay = Number(CFG.popupDelayMs) || 12000;
    setTimeout(() => {
      if (sessionStorage.getItem("eltransport_popup_shown") === "1") return;
      sessionStorage.setItem("eltransport_popup_shown", "1");
      const overlay = $("#popupOverlay");
      const box = $("#popupContent");
      if (!overlay || !box) return;
      box.innerHTML =
        `<div class="kicker">Реклама</div><h3>${esc(ad.title)}</h3><p>${esc(ad.text || "")}</p>` +
        `<a class="btn btn-primary" href="${esc(ad.link || "#")}" target="_blank" rel="noopener" id="popupCta">Подробнее →</a>`;
      overlay.classList.add("open");
      trackView(ad.id);
      $("#popupCta").addEventListener("click", () => trackClick(ad.id));
      const close = () => overlay.classList.remove("open");
      $("#popupClose").onclick = close;
      overlay.onclick = (e) => { if (e.target === overlay) close(); };
    }, delay);
  }


  /* ---------- Инициализация ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initHeader();
    renderHero();
    renderDirections();
    initArticles();
    renderNews();
    initCalculator();
    renderCompare();
    renderFaq();
    renderGallery();
    initLightbox();
    renderVideos();
    renderZones();
    maybeShowPopup();

    const yearEl = $("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const tagline = $("#logoTagline");
    if (tagline && D.site && D.site.tagline) tagline.textContent = D.site.tagline;

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeArticle();
        closeLightbox();
        const overlay = $("#popupOverlay");
        if (overlay) overlay.classList.remove("open");
      }
    });

    initReveal();
  });
})();
