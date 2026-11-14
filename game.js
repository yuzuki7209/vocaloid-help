(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const keys = (k) => k.split(" / ").map((part) => part.split(" ").map((x) => `<kbd>${esc(x)}</kbd>`).join("")).join(" / ");

  const ROUND = 10, TIME = 10;
  const cfg = { os: store.get("v7-os") || (/Win/i.test(navigator.platform) ? "win" : "mac"), dir: "f2k" };
  let st, tick, startAt, locked;

  const pool = () => window.V7.shortcuts
    .map(([g, f, m, w]) => ({ g, f, k: cfg.os === "mac" ? m : w }))
    .filter((x) => x.k !== "—");
  const bestKey = () => `v7-best-${cfg.os}-${cfg.dir}`;
  const hud = () => {
    $("#h-score").textContent = st ? st.score : 0;
    $("#h-q").textContent = `${st ? Math.min(st.i + 1, ROUND) : 0}/${ROUND}`;
    $("#h-combo").textContent = `×${st ? st.combo : 0}`;
    $("#h-best").textContent = store.get(bestKey()) || 0;
  };

  const startScreen = () => {
    st = null; stopTimer(); hud();
    $("#timer").style.transform = "scaleX(1)";
    $("#g-body").innerHTML = `<div class="g-start">
      <h2>준비됐나요?</h2>
      <p>기능을 보고 맞는 단축키를 고르거나, 단축키를 보고 기능을 맞혀 보세요.</p>
      <div class="opt-row"><div class="seg" id="s-os"><button data-v="mac">macOS</button><button data-v="win">Windows</button></div></div>
      <div class="opt-row"><div class="seg" id="s-dir"><button data-v="f2k">기능 → 단축키</button><button data-v="k2f">단축키 → 기능</button></div></div>
      <button class="btn primary" id="go">시작하기 (Enter)</button></div>`;
    const sync = () => {
      document.querySelectorAll("#s-os button").forEach((b) => b.classList.toggle("on", b.dataset.v === cfg.os));
      document.querySelectorAll("#s-dir button").forEach((b) => b.classList.toggle("on", b.dataset.v === cfg.dir));
      hud();
    };
    $("#s-os").onclick = (e) => { const b = e.target.closest("button"); if (b) { cfg.os = b.dataset.v; store.set("v7-os", cfg.os); sync(); } };
    $("#s-dir").onclick = (e) => { const b = e.target.closest("button"); if (b) { cfg.dir = b.dataset.v; sync(); } };
    $("#go").onclick = start;
    sync();
  };

  const start = () => {
    const p = pool();
    st = { qs: shuffle(p).slice(0, ROUND), all: p, i: 0, score: 0, combo: 0, maxCombo: 0, wrong: [] };
    ask();
  };

  const ask = () => {
    locked = false;
    const q = st.qs[st.i];
    const field = cfg.dir === "f2k" ? "k" : "f";
    const others = shuffle(st.all.filter((x) => x[field] !== q[field]));
    const opts = [q];
    for (const o of others) { if (opts.length === 4) break; if (!opts.some((x) => x[field] === o[field])) opts.push(o); }
    st.opts = shuffle(opts);
    const prompt = cfg.dir === "f2k" ? esc(q.f) : keys(q.k);
    $("#g-body").innerHTML = `<p class="g-q-group">${esc(q.g.toUpperCase())}${cfg.dir === "f2k" ? " · 단축키는?" : " · 무슨 기능?"}</p>
      <p class="g-q">${prompt}</p>
      <div class="g-choices">${st.opts.map((o, i) => `<button class="g-choice" data-i="${i}"><span class="n">${i + 1}</span><span>${cfg.dir === "f2k" ? keys(o.k) : esc(o.f)}</span></button>`).join("")}</div>
      <p class="g-feedback" id="fb"></p>`;
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
      bar.style.background = left < 3 ? "#ff6b6b" : "";
      if (left <= 0) return answer(-1);
      tick = requestAnimationFrame(loop);
    };
    tick = requestAnimationFrame(loop);
  };
  const stopTimer = () => cancelAnimationFrame(tick);

  const answer = (i) => {
    if (locked || !st) return;
    locked = true; stopTimer();
    const q = st.qs[st.i];
    const field = cfg.dir === "f2k" ? "k" : "f";
    const ok = i >= 0 && st.opts[i][field] === q[field];
    const left = Math.max(0, TIME - (performance.now() - startAt) / 1000);
    const btns = document.querySelectorAll(".g-choice");
    btns.forEach((b, j) => { b.disabled = true; if (st.opts[j][field] === q[field]) b.classList.add("right"); else if (j === i) b.classList.add("wrong"); });
    const fb = $("#fb");
    if (ok) {
      st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
      const gain = 100 + Math.round(left) * 10 + (st.combo - 1) * 20;
      st.score += gain;
      fb.innerHTML = `<b class="ok">정답 +${gain}</b>${st.combo > 1 ? ` · ${st.combo}콤보!` : ""}`;
      $("#h-combo").classList.remove("pop"); void $("#h-combo").offsetWidth; $("#h-combo").classList.add("pop");
    } else {
      st.combo = 0; st.wrong.push(q);
      fb.innerHTML = `<b class="no">${i < 0 ? "시간 초과" : "오답"}</b> · ${esc(q.f)} = ${keys(q.k)}`;
    }
    hud();
    setTimeout(() => { st.i++; st.i < ROUND ? ask() : finish(); }, ok ? 700 : 1600);
  };

  const finish = () => {
    const best = +(store.get(bestKey()) || 0);
    const isBest = st.score > best;
    if (isBest) store.set(bestKey(), st.score);
    const correct = ROUND - st.wrong.length;
    const grade = correct === 10 ? "단축키 마스터" : correct >= 8 ? "숙련자" : correct >= 5 ? "중급자" : "입문자";
    $("#g-body").innerHTML = `<div class="g-start">
      <p class="eyebrow">${isBest ? "NEW BEST!" : "RESULT"}</p>
      <h2>${st.score}점 · ${grade}</h2>
      <p>${correct}/${ROUND} 정답 · 최대 ${st.maxCombo}콤보</p>
      ${st.wrong.length ? `<div class="review"><p class="kp-title">다시 볼 단축키</p>${st.wrong.map((w) => `<div class="sc-row"><span>${esc(w.f)}</span><span>${keys(w.k)}</span></div>`).join("")}</div>` : ""}
      <div class="hero-cta" style="justify-content:center;margin-top:24px">
        <button class="btn primary" id="again">다시 하기 (Enter)</button>
        <button class="btn" id="menu">설정 바꾸기</button>
      </div></div>`;
    $("#again").onclick = start;
    $("#menu").onclick = startScreen;
    st.done = true;
    hud();
  };

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") {
      if (!st || st.done) { e.preventDefault(); start(); }
      return;
    }
    if (st && !st.done && /^[1-4]$/.test(e.key)) answer(+e.key - 1);
  });

  startScreen();
})();
