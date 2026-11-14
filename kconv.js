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
      case "ㄲ": return { jp: "k", sp: "k", ph: "k" };
      case "ㅋ": return { jp: "k", sp: "k", ph: "kh" };
      case "ㄷ": return voiced ? { jp: "d", sp: "d", ph: "d" } : { jp: "t", sp: "t", ph: "t" };
      case "ㄸ": return { jp: "t", sp: "t", ph: "t" };
      case "ㅌ": return { jp: "t", sp: "t", ph: "th" };
      case "ㅂ": return voiced ? { jp: "b", sp: "b", ph: "b" } : { jp: "p", sp: "p", ph: "p" };
      case "ㅃ": return { jp: "p", sp: "p", ph: "p" };
      case "ㅍ": return { jp: "p", sp: "p", ph: "ph" };
      case "ㅅ": case "ㅆ": return pal ? { jp: "sh", sp: "sh", ph: "S" } : { jp: "s", sp: "s", ph: "s" };
      case "ㅈ": return voiced ? { jp: "j", sp: "j", ph: "dZ" } : { jp: "ch", sp: "ch", ph: "tS" };
      case "ㅉ": return { jp: "ch", sp: "j", ph: "tS" };
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
  // VOCALOID Japanese phonemes (see manual appendix)
  const VJ = { a: "a", i: "i", u: "M", e: "e", o: "o" };
  const CJ = { "": "", k: "k", g: "g", s: "s", sh: "S", j: "dZ", ch: "tS", t: "t", d: "d", n: "n", h: "h", b: "b", p: "p", m: "m", r: "4" };
  const PAL = { k: "k'", g: "g'", t: "t'", d: "d'", n: "J", h: "C", b: "b'", p: "p'", m: "m'", r: "4'" };
  const jpPh = (c, glide, base) => {
    const v = jpVowel(base), vv = VJ[v];
    let head;
    if (glide === "y") head = c === "" ? (v === "i" ? "" : "j") : ["sh", "j", "ch"].includes(c) ? CJ[c] : c === "t" ? "tS" : c === "d" ? "dZ" : PAL[c];
    else if (glide === "w") head = ["sh", "j", "ch"].includes(c) ? CJ[c] : c === "" ? (v === "u" ? "" : "w") : `${CJ[c]} w`;
    else if (v === "i" && PAL[c]) head = PAL[c];
    else if (c === "h" && v === "u") head = "p\\";
    else head = CJ[c];
    return [head, vv].filter(Boolean).join(" ");
  };
  const JP_CODA_PH = { "ん": "N\\", "っ": "", "る": "4 M", "く": "k M", "む": "m M", "ぷ": "p M", "ン": "N\\", "ッ": "", "ル": "4 M", "ク": "k M", "ム": "m M", "プ": "p M" };
  const toKata = (s) => s.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));

  /* ---------- 4) English ---------- */
  // English never ends a word on the "uh"/"eh" vowels, so VOCALOID's English
  // dictionary can't sing "nuh" or "neh". Use real-word spelling patterns instead:
  // open syllables → saw / say / sah / so / soo / see, closed → song / sell / sung / sing.
  const OPEN = { a: "ah", e: "ay", eo: "aw", o: "oh", u: "oo", eu: "oo", i: "ee" };
  const CLOSED = { a: "o", e: "e", eo: "u", eu: "u", o: "o", u: "oo", i: "ee" };
  const CODA_SHORT = { ㄱ: "ck", ㄴ: "n", ㄷ: "t", ㄹ: "ll", ㅁ: "m", ㅂ: "p", ㅇ: "ng" }; // after short vowels
  const CODA_LONG = { ㄱ: "k", ㄴ: "n", ㄷ: "t", ㄹ: "l", ㅁ: "m", ㅂ: "p", ㅇ: "ng" };
  const enSpell = (cons, glide, base, fin) => {
    const pal = ["sh", "ch", "j"].includes(cons);
    const g = glide === "y" ? (pal ? "" : "y") : glide === "w" ? "w" : "";
    let onset = cons + g;
    if (!fin) {
      if (glide === "y" && base === "u") return cons + (pal ? "oo" : "yoo");
      if (glide === "y" && base === "i") return cons + "ee";
      if (!onset && base === "eo") return "aw";
      return onset + OPEN[base];
    }
    if (base === "o") { // 옴 → ohm-like magic-e: home / hole / joke / note / rope
      if (fin === "ㄴ") return onset + "ohn";
      if (fin === "ㅇ") return onset + "ong";
      return onset + "o" + CODA_LONG[fin] + "e";
    }
    if (base === "i") return onset + (fin === "ㅇ" ? "ing" : "ee" + CODA_LONG[fin]);
    if (base === "u") return onset + (fin === "ㅇ" ? "oong" : "oo" + CODA_LONG[fin]);
    if (!onset && base === "a") onset = "";
    return onset + CLOSED[base] + CODA_SHORT[fin];
  };
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
        const eWord = enSpell(c.sp, glide, base, fin);
        // English phonemes
        const ph = [c.ph, glide === "y" ? "j" : glide === "w" ? "w" : "", EN_PH[base], fin ? EN_CODA_PH[fin] : ""]
          .filter(Boolean).join(" ");

        let lang = o.mode === "mix"
          ? ((base === "eo" || base === "eu" || (fin && !"ㄴㅇ".includes(fin))) ? "en" : "ja")
          : o.mode;
        const enMain = o.mode === "en" && o.en === "ph" ? ph : null;
        const parts = lang === "ja"
          ? (o.split && jCoda ? [jHead, jCoda] : [jHead + jCoda])
          : enMain ? [enMain] : (o.split && fin ? [eWord, "-"] : [eWord]);

        // per-note phonemes (for VPR export)
        const headPh = lang === "ja" ? jpPh(c.jp, glide, base) : [c.ph, glide === "y" ? "j" : glide === "w" ? "w" : "", EN_PH[base]].filter(Boolean).join(" ");
        const codaPh = !fin ? "" : lang === "ja" ? JP_CODA_PH[JP_CODA[o.coda][fin]] : EN_CODA_PH[fin];
        let notes;
        if (lang === "en" && enMain) notes = [{ t: eWord, ph: [headPh, codaPh].filter(Boolean).join(" ") }];
        else if (lang === "en" && parts.length === 2) notes = [{ t: eWord, ph: [headPh, codaPh].join(" ") }, { t: "-", ph: "-" }];
        else if (parts.length === 2) notes = [{ t: parts[0], ph: headPh }, { t: parts[1], ph: codaPh || "-" }];
        else notes = [{ t: parts[0], ph: [headPh, codaPh].filter(Boolean).join(" ") }];
        notes.forEach((n) => (n.lang = lang));
        return { src: s.src, lang, parts, ph, notes };
      });
    }));
  };

  window.KConv = { convert };
})();
