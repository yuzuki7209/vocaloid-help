(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const keys = (k) => k.split(" / ").map((part) => part.split(" ").map((x) => `<kbd>${esc(x)}</kbd>`).join("")).join(" / ");
  const DESC = window.V7.shortcutDesc || {};

  const ROUND = 10, TIME = 10, LIVES = 3;
  const cfg = {
    os: store.get("v7-os") || (/Win/i.test(navigator.platform) ? "win" : "mac"),
    dir: store.get("v7-game-dir") || "mix",
    len: store.get("v7-game-len") || "round"
  };
  let st, tick, startAt, locked;

  const pool = () => window.V7.shortcuts
    .map(([g, f, m, w]) => ({ g, f, k: cfg.os === "mac" ? m : w, d: DESC[`${g}|${f}`] || "" }))
    .filter((x) => x.k !== "—");
  const endless = () => cfg.len === "endless";
  const bestKey = () => `v7-best-${cfg.os}-${cfg.dir}-${cfg.len}`;
  const hearts = (n) => `<span class="lives">${"♥".repeat(n)}<span class="off">${"♥".repeat(LIVES - n)}</span></span>`;

  const hud = () => {
    $("#h-score").textContent = st ? st.score : 0;
    const q = $("#h-q");
    q.previousElementSibling.textContent = endless() ? "LIVES" : "QUESTION";
    q.innerHTML = endless() ? `${hearts(st ? st.lives : LIVES)} <small style="display:inline;letter-spacing:0">#${st ? st.n + 1 : 0}</small>` : `${st ? Math.min(st.n + 1, ROUND) : 0}/${ROUND}`;
    $("#h-combo").textContent = `×${st ? st.combo : 0}`;
    $("#h-best").textContent = store.get(bestKey()) || 0;
  };

  const seg = (id, key, items) => `<div class="opt-row"><div class="seg" id="${id}">${items.map(([v, l]) => `<button data-v="${v}" class="${cfg[key] === v ? "on" : ""}">${l}</button>`).join("")}</div></div>`;

  const startScreen = () => {
    st = null; stopTimer(); hud();
    $("#timer").style.transform = "scaleX(1)";
    $("#g-body").innerHTML = `<div class="g-start">
      <h2>준비됐나요?</h2>
      <p>기능을 보고 단축키를, 단축키를 보고 기능을 맞혀 보세요. 답을 고르면 어떤 기능인지 설명해 드려요.</p>
      ${seg("s-len", "len", [["round", "10문제"], ["endless", "무한 모드 ♥×3"]])}
      ${seg("s-dir", "dir", [["mix", "혼합"], ["f2k", "기능 → 단축키"], ["k2f", "단축키 → 기능"]])}
      ${seg("s-os", "os", [["mac", "macOS"], ["win", "Windows"]])}
      <button class="btn primary" id="go">시작하기 (Enter)</button></div>`;
    [["#s-len", "len", "v7-game-len"], ["#s-dir", "dir", "v7-game-dir"], ["#s-os", "os", "v7-os"]].forEach(([id, key, sk]) => {
      $(id).onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        cfg[key] = b.dataset.v; store.set(sk, cfg[key]);
        $(id).querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        hud();
      };
    });
    $("#go").onclick = start;
  };

  const start = () => {
    const p = pool();
    st = { all: p, deck: shuffle(p), n: 0, score: 0, combo: 0, maxCombo: 0, wrong: [], correct: 0, lives: LIVES };
    ask();
  };

  const nextQuestion = () => {
    if (!st.deck.length) st.deck = shuffle(st.all); // endless: reshuffle when the deck runs out
    return st.deck.pop();
  };

  const ask = () => {
    locked = false;
    const q = (st.q = nextQuestion());
    st.qdir = cfg.dir === "mix" ? (Math.random() < 0.5 ? "f2k" : "k2f") : cfg.dir;
    const dir = st.qdir, field = dir === "f2k" ? "k" : "f";
    const opts = [q];
    for (const o of shuffle(st.all.filter((x) => x[field] !== q[field]))) {
      if (opts.length === 4) break;
      if (!opts.some((x) => x[field] === o[field])) opts.push(o);
    }
    st.opts = shuffle(opts);
    $("#g-body").innerHTML = `<p class="g-q-group">${esc(q.g.toUpperCase())}${dir === "f2k" ? " · 단축키는?" : " · 무슨 기능?"}</p>
      <p class="g-q">${dir === "f2k" ? esc(q.f) : keys(q.k)}</p>
      <div class="g-choices">${st.opts.map((o, i) => `<button class="g-choice" data-i="${i}"><span class="n">${i + 1}</span><span>${dir === "f2k" ? keys(o.k) : esc(o.f)}</span></button>`).join("")}</div>
      <div id="fb"></div>`;
    $("#g-body .g-choices").onclick = (e) => { const b = e.target.closest(".g-choice"); if (b) answer(+b.dataset.i); };
    hud();
    startTimer();
  };

  const startTimer = () => {
    stopTimer();
    startAt = performance.now();
    const bar = $("#timer");
    const loop = (t) => {
      const left = Math.max(0, TIME - (t - startAt) / 1000);
      bar.style.transform = `scaleX(${left / TIME})`;
      bar.style.background = left < 3 ? "#5cd6ff" : "";
      if (left <= 0) return answer(-1);
      tick = requestAnimationFrame(loop);
    };
    tick = requestAnimationFrame(loop);
  };
  const stopTimer = () => cancelAnimationFrame(tick);

  const answer = (i) => {
    if (locked || !st || st.done) return;
    locked = true; stopTimer();
    const q = st.q, field = st.qdir === "f2k" ? "k" : "f";
    const ok = i >= 0 && st.opts[i][field] === q[field];
    const left = Math.max(0, TIME - (performance.now() - startAt) / 1000);
    document.querySelectorAll(".g-choice").forEach((b, j) => {
      b.disabled = true;
      if (st.opts[j][field] === q[field]) b.classList.add("right");
      else if (j === i) b.classList.add("wrong");
    });

    let head;
    if (ok) {
      st.combo++; st.correct++; st.maxCombo = Math.max(st.maxCombo, st.combo);
      const gain = 100 + Math.round(left) * 10 + (st.combo - 1) * 20;
      st.score += gain;
      head = `<b class="ok">정답 +${gain}</b>${st.combo > 1 ? ` <span class="combo">${st.combo}콤보!</span>` : ""}`;
      const c = $("#h-combo"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
    } else {
      st.combo = 0; st.wrong.push(q);
      if (endless()) st.lives--;
      head = `<b class="no">${i < 0 ? "시간 초과" : "오답"}</b>${endless() ? ` · 남은 목숨 ${hearts(st.lives)}` : ""}`;
    }
    // explanation of the asked shortcut (and of the wrong pick, if any)
    const picked = i >= 0 && !ok ? st.opts[i] : null;
    const over = endless() ? st.lives <= 0 : st.n + 1 >= ROUND;
    $("#fb").innerHTML = `<div class="g-explain ${ok ? "ok" : ""}">
        <div class="ex-h">${head}<span>${esc(q.f)}</span><span>${keys(q.k)}</span></div>
        <p>${esc(q.d)}</p>
        ${picked ? `<p style="margin-top:8px;font-size:13.5px">고른 답 → <b>${esc(picked.f)}</b> ${keys(picked.k)}: ${esc(picked.d)}</p>` : ""}
      </div>
      <div style="display:flex"><button class="btn primary g-next" id="next">${over ? "결과 보기" : "다음 문제"} (Enter)</button></div>`;
    $("#next").onclick = next;
    hud();
  };

  const next = () => {
    if (!st || !locked || st.done) return;
    const over = endless() ? st.lives <= 0 : st.n + 1 >= ROUND;
    st.n++;
    over ? finish() : ask();
  };

  const finish = () => {
    st.done = true;
    const best = +(store.get(bestKey()) || 0);
    const isBest = st.score > best;
    if (isBest) store.set(bestKey(), st.score);
    const total = st.n, correct = st.correct;
    const grade = endless()
      ? (correct >= 40 ? "단축키 마스터" : correct >= 20 ? "숙련자" : correct >= 10 ? "중급자" : "입문자")
      : (correct === 10 ? "단축키 마스터" : correct >= 8 ? "숙련자" : correct >= 5 ? "중급자" : "입문자");
    const uniq = st.wrong.filter((w, i, a) => a.findIndex((x) => x.g === w.g && x.f === w.f) === i);
    $("#g-body").innerHTML = `<div class="g-start">
      <p class="eyebrow">${isBest ? "NEW BEST!" : "RESULT"}${endless() ? " · 무한 모드" : ""}</p>
      <h2>${st.score}점 · ${grade}</h2>
      <p>${correct}/${total} 정답 · 최대 ${st.maxCombo}콤보</p>
      ${uniq.length ? `<div class="review"><p class="kp-title">다시 볼 단축키</p>${uniq.map((w) => `<div class="sc-row"><span>${esc(w.f)}<br><small style="color:var(--dim)">${esc(w.d)}</small></span><span>${keys(w.k)}</span></div>`).join("")}</div>` : ""}
      <div class="hero-cta" style="justify-content:center;margin-top:24px">
        <button class="btn primary" id="again">다시 하기 (Enter)</button>
        <button class="btn" id="menu">설정 바꾸기</button>
      </div></div>`;
    $("#again").onclick = start;
    $("#menu").onclick = startScreen;
    hud();
  };

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (!st || st.done) start();
      else if (locked) next();
      return;
    }
    if (st && !st.done && !locked && /^[1-4]$/.test(e.key)) answer(+e.key - 1);
  });

  startScreen();
})();
