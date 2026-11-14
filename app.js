(() => {
  const D = window.V7;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  /* Video: load the iframe only on click */
  $("#video-poster")?.addEventListener("click", () => {
    $("#video-wrap").innerHTML =
      '<iframe src="https://www.youtube-nocookie.com/embed/GJ92CbivkEY?autoplay=1&rel=0" title="VOCALOID7 - Imagine the culture. Imagine the future." allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
  });

  if ($("#ptable")) {
  /* Control parameters */
  const renderParams = (f) => {
    $("#ptable").innerHTML = D.params
      .filter((p) => f === "all" || (f === "ai" ? p.ai : p.v))
      .map((p) => `<div class="prow ${p.ai ? "ai" : ""}"><span class="ab">${p.ab}</span>
        <h4>${esc(p.name)}</h4><p>${esc(p.ko)}</p>
        <div class="tags">${p.ai ? '<span class="badge ai">AI</span>' : ""}${p.v ? '<span class="badge">VOCALOID</span>' : ""}</div></div>`)
      .join("");
  };
  $$("[data-pf]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-pf]").forEach((x) => x.classList.toggle("active", x === b));
    renderParams(b.dataset.pf);
  }));
  renderParams("all");

  /* Effects */
  $("#fx-grid").innerHTML = D.effects
    .map((e) => `<div class="fx" style="--c:${e.c}"><h4>${e.n}</h4><p>${esc(e.d)}</p></div>`).join("");

  /* Shortcuts */
  let os = store.get("v7-os") || (/Win/i.test(navigator.platform) ? "win" : "mac");
  const renderSC = () => {
    const q = $("#sc-filter").value.trim().toLowerCase();
    const groups = {};
    D.shortcuts.forEach(([g, f, m, w]) => {
      const key = os === "mac" ? m : w;
      if (q && !`${g} ${f} ${key}`.toLowerCase().includes(q)) return;
      (groups[g] ||= []).push([f, key]);
    });
    const names = Object.keys(groups);
    $("#sc-list").innerHTML = names.length
      ? names.map((g) => `<div class="sc-group"><h4>${g.toUpperCase()}</h4>${groups[g]
          .map(([f, k]) => `<div class="sc-row"><span>${esc(f)}</span><span>${k
            .split(" / ").map((part) => part.split(" ").map((x) => `<kbd>${esc(x)}</kbd>`).join("")).join(" / ")}</span></div>`)
          .join("")}</div>`).join("")
      : '<p class="sc-empty">일치하는 단축키가 없습니다.</p>';
    $$("[data-os]").forEach((b) => b.classList.toggle("active", b.dataset.os === os));
  };
  $$("[data-os]").forEach((b) => b.addEventListener("click", () => { os = b.dataset.os; store.set("v7-os", os); renderSC(); }));
  $("#sc-filter").addEventListener("input", renderSC);
  renderSC();

  /* Phonemes */
  const langs = Object.keys(D.phonemes);
  const labels = { English: "English", Japanese: "日本語", Korean: "한국어", Spanish: "Español", Chinese: "中文" };
  $("#ph-tabs").innerHTML = langs.map((l) => `<button class="chip" data-ph="${l}">${labels[l]}</button>`).join("");
  const renderPh = (l) => {
    const p = D.phonemes[l];
    $("#ph-grid").innerHTML = p.list
      .map(([s, ex, c]) => `<div class="ph"><b>${esc(s)}</b><span>${esc(ex)}</span>${c ? `<small>${esc(c)}</small>` : ""}</div>`).join("");
    $("#ph-note").textContent = p.note;
    $$("[data-ph]").forEach((b) => b.classList.toggle("active", b.dataset.ph === l));
    store.set("v7-ph", l);
  };
  $$("[data-ph]").forEach((b) => b.addEventListener("click", () => renderPh(b.dataset.ph)));
  renderPh(langs.includes(store.get("v7-ph")) ? store.get("v7-ph") : "Korean");

  /* Global search: index sections, cards, tools, shortcuts */
  const index = [];
  $$("main .sec").forEach((sec) => {
    const title = $(".sec-head h2", sec).textContent;
    index.push({ t: title, s: "섹션", id: sec.id, text: title + " " + $(".sec-head p", sec).textContent });
    $$(".card, .tool, .steps li, .acc, .list li", sec).forEach((el) => {
      const h = $("h3, h4, b, summary", el);
      const t = (h ? h.textContent : el.textContent).trim().slice(0, 60);
      if (!el.id) el.id = `${sec.id}-${index.length}`;
      index.push({ t, s: title, id: el.id, text: el.textContent });
    });
  });
  D.shortcuts.forEach(([g, f, m, w]) => index.push({ t: f, s: `단축키 · ${m} / ${w}`, id: "shortcuts", text: `${g} ${f} ${m} ${w}`, sc: f }));
  D.params.forEach((p) => index.push({ t: `${p.ab} ${p.name}`, s: "컨트롤 파라미터", id: "params", text: `${p.ab} ${p.name} ${p.ko}` }));

  const input = $("#search"), box = $("#search-results");
  let sel = 0, hits = [];
  const go = (h) => {
    box.hidden = true; input.value = ""; input.blur();
    if (h.sc) { $("#sc-filter").value = h.sc; renderSC(); }
    const el = document.getElementById(h.id);
    if (el) {
      if (el.tagName === "DETAILS") el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.animate([{ outline: "2px solid #2f7dff" }, { outline: "2px solid transparent" }], { duration: 1600 });
    }
  };
  const draw = () => {
    box.innerHTML = hits.length
      ? hits.map((h, i) => `<a href="#${h.id}" class="${i === sel ? "on" : ""}" data-i="${i}">${esc(h.t)}<small>${esc(h.s)}</small></a>`).join("")
      : '<div class="empty">검색 결과가 없습니다.</div>';
  };
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { box.hidden = true; return; }
    const terms = q.split(/\s+/);
    hits = index.filter((x) => terms.every((t) => x.text.toLowerCase().includes(t)))
      .sort((a, b) => (b.t.toLowerCase().includes(q)) - (a.t.toLowerCase().includes(q))).slice(0, 12);
    sel = 0; box.hidden = false; draw();
  });
  input.addEventListener("keydown", (e) => {
    if (box.hidden || !hits.length) return;
    if (e.key === "ArrowDown") { sel = (sel + 1) % hits.length; draw(); e.preventDefault(); }
    if (e.key === "ArrowUp") { sel = (sel - 1 + hits.length) % hits.length; draw(); e.preventDefault(); }
    if (e.key === "Enter") { go(hits[sel]); e.preventDefault(); }
    if (e.key === "Escape") box.hidden = true;
  });
  box.addEventListener("click", (e) => { const a = e.target.closest("a"); if (a) { e.preventDefault(); go(hits[+a.dataset.i]); } });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) box.hidden = true; });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
  });

  }

  /* Sidebar: mobile toggle + scroll spy */
  const side = $("#sidebar");
  if (side) {
  $("#menu-btn").addEventListener("click", () => side.classList.toggle("open"));
  $$("a", side).forEach((a) => a.addEventListener("click", () => side.classList.remove("open")));
  const links = new Map($$("a", side).map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((a) => a.classList.remove("active"));
        links.get(en.target.id)?.classList.add("active");
      }
    });
  }, { rootMargin: "-30% 0px -65% 0px" });
  $$("main .sec").forEach((s) => spy.observe(s));
  }

  /* Reveal on scroll */
  const rv = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); rv.unobserve(en.target); }
  }), { threshold: 0.08 });
  $$(".sec").forEach((s) => { s.classList.add("reveal"); rv.observe(s); });

  /* Back to top */
  const tt = $("#to-top");
  if (tt) addEventListener("scroll", () => tt.classList.toggle("show", scrollY > 800), { passive: true });
  tt?.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
})();
