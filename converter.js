// Korean → Japanese kana / English spelling / VOCALOID English phonemes
(() => {
  const INI = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split("");
  const VOW = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ".split("");
  const FIN = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const SPLIT = { ㄳ: ["ㄱ", "ㅅ"], ㄵ: ["ㄴ", "ㅈ"], ㄶ: ["ㄴ", "ㅎ"], ㄺ: ["ㄹ", "ㄱ"], ㄻ: ["ㄹ", "ㅁ"], ㄼ: ["ㄹ", "ㅂ"], ㄽ: ["ㄹ", "ㅅ"], ㄾ: ["ㄹ", "ㅌ"], ㄿ: ["ㄹ", "ㅍ"], ㅀ: ["ㄹ", "ㅎ"], ㅄ: ["ㅂ", "ㅅ"] };
  // representative final sound (7 종성)
  const REP = { ㄱ: "ㄱ", ㄲ: "ㄱ", ㅋ: "ㄱ", ㄳ: "ㄱ", ㄺ: "ㄱ", ㄴ: "ㄴ", ㄵ: "ㄴ", ㄶ: "ㄴ", ㄷ: "ㄷ", ㅅ: "ㄷ", ㅆ: "ㄷ", ㅈ: "ㄷ", ㅊ: "ㄷ", ㅌ: "ㄷ", ㅎ: "ㄷ", ㄹ: "ㄹ", ㄼ: "ㄹ", ㄽ: "ㄹ", ㄾ: "ㄹ", ㅀ: "ㄹ", ㅁ: "ㅁ", ㄻ: "ㅁ", ㅂ: "ㅂ", ㅍ: "ㅂ", ㅄ: "ㅂ", ㄿ: "ㅂ", ㅇ: "ㅇ" };
  // vowel → [glide, base]; base ∈ a e eo o u eu i
  const V = { ㅏ: ["", "a"], ㅐ: ["", "e"], ㅑ: ["y", "a"], ㅒ: ["y", "e"], ㅓ: ["", "eo"], ㅔ: ["", "e"], ㅕ: ["y", "eo"], ㅖ: ["y", "e"], ㅗ: ["", "o"], ㅘ: ["w", "a"], ㅙ: ["w", "e"], ㅚ: ["w", "e"], ㅛ: ["y", "o"], ㅜ: ["", "u"], ㅝ: ["w", "eo"], ㅞ: ["w", "e"], ㅟ: ["w", "i"], ㅠ: ["y", "u"], ㅡ: ["", "eu"], ㅢ: ["w", "i"], ㅣ: ["", "i"] };

  const isHangul = (c) => c >= "가" && c <= "힣";
  const decompose = (c) => {
    const n = c.charCodeAt(0) - 0xac00;
    return { ini: INI[Math.floor(n / 588)], vow: VOW[Math.floor((n % 588) / 28)], fin: FIN[n % 28], src: c };
  };

  /* ---------- 1) Korean pronunciation rules ---------- */
  const applyRules = (syls) => {
    for (let i = 0; i < syls.length - 1; i++) {
      const a = syls[i], b = syls[i + 1];
      if (!a.fin) continue;
      // 연음: final + ㅇ-initial
      if (b.ini === "ㅇ" && a.fin !== "ㅇ") {
        let move;
        if (SPLIT[a.fin]) { const [x, y] = SPLIT[a.fin]; a.fin = x; move = y; }
        else { move = a.fin; a.fin = ""; }
        if (move === "ㅎ") continue; // ㅎ drops (좋아 → 조아)
        if (move === "ㄷ" && b.vow === "ㅣ") move = "ㅈ"; // 굳이 → 구지
        if (move === "ㅌ" && b.vow === "ㅣ") move = "ㅊ"; // 같이 → 가치
        b.ini = move;
        continue;
      }
      const r = REP[a.fin];
      // ㅎ + ㄱㄷㅈ → aspirated (좋다 → 조타)
      if ((a.fin === "ㅎ" || a.fin === "ㄶ" || a.fin === "ㅀ") && "ㄱㄷㅈ".includes(b.ini)) {
        b.ini = { ㄱ: "ㅋ", ㄷ: "ㅌ", ㅈ: "ㅊ" }[b.ini];
        a.fin = SPLIT[a.fin] ? SPLIT[a.fin][0] : "";
        continue;
      }
      // 비음화: ㄱㄷㅂ + ㄴㅁ → ㅇㄴㅁ
      if ("ㄴㅁ".includes(b.ini) && "ㄱㄷㅂ".includes(r)) a.fin = { ㄱ: "ㅇ", ㄷ: "ㄴ", ㅂ: "ㅁ" }[r];
      // ㄹ after ㅁ/ㅇ → ㄴ (음료 → 음뇨)
      if (b.ini === "ㄹ" && "ㅁㅇ".includes(REP[a.fin])) b.ini = "ㄴ";
      // 유음화: ㄴ+ㄹ / ㄹ+ㄴ → ㄹㄹ
      if (REP[a.fin] === "ㄴ" && b.ini === "ㄹ") a.fin = "ㄹ";
      if (REP[a.fin] === "ㄹ" && b.ini === "ㄴ") b.ini = "ㄹ";
    }
    return syls;
  };

  /* ---------- 2) consonant classes ---------- */
  // returns {jp, sp, ph}: JP row key, english spelling, VOCALOID EN phoneme
  const consonant = (ini, vow, voiced) => {
    const pal = vow === "ㅣ" || V[vow][0] === "y" || vow === "ㅟ";
    switch (ini) {
      case "ㅇ": return { jp: "", sp: "", ph: "" };
      case "ㄱ": return voiced ? { jp: "g", sp: "g", ph: "g" } : { jp: "k", sp: "k", ph: "k" };
      case "ㄲ": return { jp: "k", sp: "kk", ph: "k" };
      case "ㅋ": return { jp: "k", sp: "k", ph: "kh" };
      case "ㄷ": return voiced ? { jp: "d", sp: "d", ph: "d" } : { jp: "t", sp: "t", ph: "t" };
      case "ㄸ": return { jp: "t", sp: "tt", ph: "t" };
      case "ㅌ": return { jp: "t", sp: "t", ph: "th" };
      case "ㅂ": return voiced ? { jp: "b", sp: "b", ph: "b" } : { jp: "p", sp: "p", ph: "p" };
      case "ㅃ": return { jp: "p", sp: "pp", ph: "p" };
      case "ㅍ": return { jp: "p", sp: "p", ph: "ph" };
      case "ㅅ": case "ㅆ": return pal ? { jp: "sh", sp: "sh", ph: "S" } : { jp: "s", sp: ini === "ㅆ" ? "ss" : "s", ph: "s" };
      case "ㅈ": return voiced ? { jp: "j", sp: "j", ph: "dZ" } : { jp: "ch", sp: "ch", ph: "tS" };
      case "ㅉ": return { jp: "ch", sp: "jj", ph: "tS" };
      case "ㅊ": return { jp: "ch", sp: "ch", ph: "tS" };
      case "ㅎ": return { jp: "h", sp: "h", ph: "h" };
      case "ㄴ": return { jp: "n", sp: "n", ph: "n" };
      case "ㅁ": return { jp: "m", sp: "m", ph: "m" };
      case "ㄹ": return { jp: "r", sp: "r", ph: "l0" };
    }
    return { jp: "", sp: "", ph: "" };
  };

  /* ---------- 3) Japanese kana ---------- */
  const IDX = { a: 0, i: 1, u: 2, e: 3, o: 4 };
  const ROW = {
    "": ["あ", "い", "う", "え", "お"], k: ["か", "き", "く", "け", "こ"], g: ["が", "ぎ", "ぐ", "げ", "ご"],
    s: ["さ", "し", "す", "せ", "そ"], sh: ["しゃ", "し", "しゅ", "しぇ", "しょ"], j: ["じゃ", "じ", "じゅ", "じぇ", "じょ"],
    ch: ["ちゃ", "ち", "ちゅ", "ちぇ", "ちょ"], t: ["た", "てぃ", "とぅ", "て", "と"], d: ["だ", "でぃ", "どぅ", "で", "ど"],
    n: ["な", "に", "ぬ", "ね", "の"], h: ["は", "ひ", "ふ", "へ", "ほ"], b: ["ば", "び", "ぶ", "べ", "ぼ"],
    p: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"], m: ["ま", "み", "む", "め", "も"], r: ["ら", "り", "る", "れ", "ろ"]
  };
  const SMALL_Y = { a: "ゃ", u: "ゅ", o: "ょ", e: "ぇ", i: "" };
  const SMALL_W = { a: "ぁ", i: "ぃ", e: "ぇ", o: "ぉ", u: "" };
  const W_HEAD = { t: "と", d: "ど", s: "す", sh: "す", j: "ず", ch: "つ" };
  const jpVowel = (b) => ({ eo: "o", eu: "u" }[b] || b);
  const kana = (c, glide, base) => {
    const v = jpVowel(base);
    if (glide === "y") {
      if (c === "") return { a: "や", u: "ゆ", o: "よ", e: "いぇ", i: "い" }[v];
      if (["sh", "j", "ch"].includes(c)) return ROW[c][IDX[v]];
      if (c === "t") return ROW.ch[IDX[v]];
      if (c === "d") return ROW.j[IDX[v]];
      return ROW[c][1] + SMALL_Y[v];
    }
    if (glide === "w") {
      if (c === "") return { a: "わ", i: "うぃ", e: "うぇ", o: "うぉ", u: "う" }[v];
      if (["sh", "j", "ch"].includes(c)) return ROW[c][IDX[v]]; // 좌 → ちゃ, 쉬 → し
      return (W_HEAD[c] || ROW[c][2]) + SMALL_W[v];
    }
    return ROW[c][IDX[v]];
  };
  const JP_CODA = {
    soft: { ㄴ: "ん", ㅇ: "ん", ㅁ: "ん", ㄹ: "る", ㄱ: "っ", ㄷ: "っ", ㅂ: "っ" },
    clear: { ㄴ: "ん", ㅇ: "ん", ㅁ: "む", ㄹ: "る", ㄱ: "く", ㄷ: "っ", ㅂ: "ぷ" }
  };
  const toKata = (s) => s.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));

  /* ---------- 4) English ---------- */
  const EN_SP = { a: "ah", e: "eh", eo: "uh", o: "oh", u: "oo", eu: "eu", i: "ee" };
  const EN_SP_Y = { a: "yah", e: "yeh", eo: "yuh", o: "yoh", u: "you", i: "ee" };
  const EN_SP_W = { a: "wah", e: "weh", eo: "wuh", i: "wee", o: "woh", u: "woo" };
  const EN_PH = { a: "Q", e: "e", eo: "V", o: "O:", u: "u:", eu: "U", i: "i:" };
  const EN_CODA_SP = { ㄱ: "k", ㄴ: "n", ㄷ: "t", ㄹ: "l", ㅁ: "m", ㅂ: "p", ㅇ: "ng" };
  const EN_CODA_PH = { ㄱ: "k", ㄴ: "n", ㄷ: "t", ㄹ: "l", ㅁ: "m", ㅂ: "p", ㅇ: "N" };

  /* ---------- convert ---------- */
  const convert = (text, o) => {
    const lines = text.split("\n");
    return lines.map((line) => line.split(/\s+/).filter(Boolean).map((word) => {
      const syls = [...word].filter(isHangul).map(decompose);
      if (o.rules) applyRules(syls);
      return syls.map((s, i) => {
        const prev = syls[i - 1];
        const voiced = !!prev && (!prev.fin || "ㄴㄹㅁㅇ".includes(REP[prev.fin]));
        let [glide, base] = V[s.vow];
        if (s.vow === "ㅢ" && s.ini !== "ㅇ") glide = "";            // 희 → 히
        if (glide === "y" && "ㅈㅉㅊ".includes(s.ini)) glide = "";   // 져 → 저
        const c = consonant(s.ini, s.vow, voiced);
        const fin = s.fin ? REP[s.fin] : "";

        // Japanese
        let jHead = kana(c.jp, glide, base);
        let jCoda = fin ? JP_CODA[o.coda][fin] : "";
        if (o.kana === "kata") { jHead = toKata(jHead); jCoda = toKata(jCoda); }

        // English spelling
        let vs = glide === "y" ? EN_SP_Y[base] : glide === "w" ? EN_SP_W[base] : EN_SP[base];
        if (c.sp && glide === "y" && base !== "i") vs = vs.replace(/^y/, c.sp === "sh" ? "" : "y");
        const eHead = c.sp + vs;
        const eCoda = fin ? EN_CODA_SP[fin] : "";
        // English phonemes
        const ph = [c.ph, glide === "y" ? "j" : glide === "w" ? "w" : "", EN_PH[base], fin ? EN_CODA_PH[fin] : ""]
          .filter(Boolean).join(" ");

        let lang = o.mode === "mix"
          ? ((base === "eo" || base === "eu" || (fin && !"ㄴㅇ".includes(fin))) ? "en" : "ja")
          : o.mode;
        const enMain = o.mode === "en" && o.en === "ph" ? ph : null;
        const parts = lang === "ja"
          ? (o.split && jCoda ? [jHead, jCoda] : [jHead + jCoda])
          : enMain ? [enMain] : (o.split && eCoda ? [eHead, eCoda] : [eHead + eCoda]);
        return { src: s.src, lang, parts, ph };
      });
    }));
  };

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
    $("#tokens").style.display = flat.length ? "" : "none";
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
  window.__v7convert = convert; // for testing
})();
