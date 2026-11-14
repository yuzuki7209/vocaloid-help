// Converter page UI (engine: kconv.js)
(() => {
  const convert = window.KConv.convert;
  /* ---------- UI ---------- */
  const $ = (s) => document.querySelector(s);
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const opts = { mode: "ja", en: "spell", kana: "hira", coda: "soft", rules: true, split: false };
  try { Object.assign(opts, JSON.parse(store.get("v7-conv") || "{}")); } catch {}
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  let result = [];

  const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 1400); };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    toast("복사했어요");
  };

  const render = () => {
    store.set("v7-conv", JSON.stringify(opts));
    document.querySelectorAll(".seg").forEach((seg) => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", opts[seg.dataset.opt] === b.dataset.v)));
    $("#rules").checked = opts.rules; $("#split").checked = opts.split;
    $("#row-en").style.display = opts.mode === "ja" ? "none" : "";
    $("#row-ja").style.display = opts.mode === "en" ? "none" : "";
    if (opts.mode === "mix") $("#row-en").querySelector('[data-v="ph"]').style.display = "none";
    else $("#row-en").querySelector('[data-v="ph"]').style.display = "";

    result = convert($("#kr").value, { ...opts, en: opts.mode === "mix" ? "spell" : opts.en });
    $("#out").innerHTML = result.map((line) => line.map((word) => word.map((s) =>
      s.parts.map((p) => `<span class="${s.lang}">${esc(p)}</span>`).join(" ")).join(" ")).join("   ")).join("\n").trim();
    const flat = result.flat(2);
    $("#tokens").innerHTML = flat.map((s, i) =>
      `<button class="tok ${s.lang}" data-i="${i}"><span class="lang">${s.lang === "ja" ? "JA" : "EN"}</span><span class="k">${s.src}</span><span class="v">${esc(s.parts.join(" "))}</span>${s.lang === "en" ? `<span class="p">${esc(s.ph)}</span>` : ""}</button>`).join("");
    $("#tok-acc").style.display = flat.length ? "" : "none";
    $("#tok-count").textContent = `${flat.length}개`;
  };

  const lyricText = () => result.map((line) => line.map((w) => w.map((s) => s.parts.join(" ")).join(" ")).join(" ")).join("\n").trim();
  const phText = () => result.flat(2).map((s) => s.lang === "en" ? s.ph : s.parts.join(" ")).join("\n");

  document.querySelectorAll(".seg").forEach((seg) => seg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    opts[seg.dataset.opt] = b.dataset.v;
    if (opts.mode === "mix") opts.en = "spell";
    render();
  }));
  $("#rules").addEventListener("change", (e) => { opts.rules = e.target.checked; render(); });
  $("#split").addEventListener("change", (e) => { opts.split = e.target.checked; render(); });
  $("#kr").addEventListener("input", () => { store.set("v7-conv-text", $("#kr").value); render(); });
  document.querySelectorAll("[data-sample]").forEach((b) => b.addEventListener("click", () => { $("#kr").value = b.dataset.sample; render(); }));
  $("#copy-lyric").addEventListener("click", () => { const t = lyricText(); t ? copy(t) : toast("먼저 가사를 입력하세요"); });
  $("#copy-ph").addEventListener("click", () => { const t = phText(); t ? copy(t) : toast("먼저 가사를 입력하세요"); });
  $("#tokens").addEventListener("click", (e) => {
    const b = e.target.closest(".tok"); if (!b) return;
    const s = result.flat(2)[+b.dataset.i];
    copy(s.parts.join(" ")); b.classList.add("copied"); setTimeout(() => b.classList.remove("copied"), 800);
  });

  $("#kr").value = store.get("v7-conv-text") || "사랑해 너를";
  render();
})();
