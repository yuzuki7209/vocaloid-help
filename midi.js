// MIDI → VOCALOID (.vpr / lyric .mid) — runs entirely in the browser
(() => {
  const PPQ = 480;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteName = (n) => NAMES[n % 12] + (Math.floor(n / 12) - 2); // VOCALOID: C3 = 60

  /* ---------- SMF parser ---------- */
  const parseMidi = (buf) => {
    const d = new DataView(buf);
    let p = 0;
    const str = (n) => { let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); return s; };
    if (str(4) !== "MThd") throw new Error("MIDI 파일이 아닙니다 (MThd 없음).");
    const hlen = d.getUint32(4);
    const division = d.getUint16(12);
    if (division & 0x8000) throw new Error("SMPTE 타임코드 MIDI는 지원하지 않습니다.");
    const ntrks = d.getUint16(10);
    p = 8 + hlen;
    const scale = (t) => Math.round((t * PPQ) / division);
    const tempos = [], sigs = [], tracks = [];
    const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    const dec = new TextDecoder("utf-8");

    for (let t = 0; t < ntrks && p < d.byteLength; t++) {
      if (str(4) !== "MTrk") break;
      const len = d.getUint32(p + 4); p += 8;
      const end = p + len;
      let tick = 0, rs = 0, name = "";
      const open = {}, notes = [];
      while (p < end) {
        tick += vlq();
        let st = d.getUint8(p);
        if (st & 0x80) { p++; if (st < 0xf0) rs = st; } else st = rs;
        const type = st & 0xf0;
        if (st === 0xff) {
          const mt = d.getUint8(p++); const ml = vlq(); const at = p; p += ml;
          if (mt === 0x51 && ml === 3) tempos.push({ tick: scale(tick), us: (d.getUint8(at) << 16) | (d.getUint8(at + 1) << 8) | d.getUint8(at + 2) });
          else if (mt === 0x58 && ml >= 2) sigs.push({ tick: scale(tick), n: d.getUint8(at), dd: 2 ** d.getUint8(at + 1) });
          else if (mt === 0x03) name = dec.decode(new Uint8Array(buf, at, ml));
          else if (mt === 0x2f) break;
        } else if (st === 0xf0 || st === 0xf7) { p += vlq(); }
        else if (type === 0x90 || type === 0x80) {
          const key = d.getUint8(p), vel = d.getUint8(p + 1); p += 2;
          const id = (st & 0x0f) * 128 + key;
          if (type === 0x90 && vel > 0) (open[id] ||= []).push({ tick, key, vel });
          else if (open[id]?.length) { const on = open[id].shift(); if (tick > on.tick) notes.push({ pos: scale(on.tick), dur: Math.max(1, scale(tick) - scale(on.tick)), key, vel: on.vel }); }
        } else if (type === 0xc0 || type === 0xd0) p += 1;
        else p += 2;
      }
      p = end;
      if (notes.length) tracks.push({ name: name || `Track ${t + 1}`, notes: notes.sort((a, b) => a.pos - b.pos || b.key - a.key) });
    }
    if (!tracks.length) throw new Error("음표가 들어 있는 트랙을 찾지 못했습니다.");
    tempos.sort((a, b) => a.tick - b.tick); sigs.sort((a, b) => a.tick - b.tick);
    return { tracks, tempos: tempos.length ? tempos : [{ tick: 0, us: 500000 }], sigs: sigs.length ? sigs : [{ tick: 0, n: 4, dd: 4 }] };
  };

  // one note at a time: drop chord notes (keep highest), trim overlaps
  const monophonic = (notes) => {
    const out = [];
    for (const n of notes) {
      const prev = out[out.length - 1];
      if (prev && prev.pos === n.pos) continue;
      if (prev && prev.pos + prev.dur > n.pos) prev.dur = n.pos - prev.pos;
      out.push({ ...n });
    }
    return out;
  };

  /* ---------- tiny ZIP (stored) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const zip = (files) => {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const csize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/octet-stream" });
  };

  /* ---------- builders ---------- */
  const barsOf = (sigs) => { // tick → bar index for each time signature
    let bar = 0, prev = { tick: 0, n: 4, dd: 4 };
    return sigs.map((s) => {
      const tpb = (PPQ * 4 * prev.n) / prev.dd;
      bar += Math.round((s.tick - prev.tick) / tpb);
      prev = s;
      return { bar, numer: s.n, denom: s.dd };
    }).filter((s, i, a) => i === 0 || s.bar !== a[i - 1].bar);
  };

  const buildVpr = (song, notes, lyrics, title, langID) => {
    const last = notes[notes.length - 1];
    const end = Math.max(1920, Math.ceil((last.pos + last.dur) / 1920) * 1920);
    const tempoEv = song.tempos.map((t) => ({ pos: t.tick, value: Math.round(6000000000 / t.us) }));
    const sigs = barsOf(song.sigs);
    if (sigs[0].bar !== 0) sigs.unshift({ bar: 0, numer: 4, denom: 4 });
    const voice = { compID: "", langID };
    const seq = {
      version: { major: 5, minor: 0, revision: 0 },
      vender: "Yamaha Corporation",
      title,
      masterTrack: {
        samplingRate: 44100,
        loop: { isEnabled: false, begin: 0, end: 7680 },
        tempo: { isFolded: false, height: 0, global: { isEnabled: false, value: tempoEv[0].value }, events: tempoEv[0].pos === 0 ? tempoEv : [{ pos: 0, value: 12000 }, ...tempoEv] },
        timeSig: { isFolded: false, events: sigs },
        volume: { isFolded: false, height: 0, events: [{ pos: 0, value: 0 }] }
      },
      voices: [{ compID: "", name: "" }],
      tracks: [{
        type: 0, name: title || "Vocal", color: 0, busNo: 0, isFolded: false, height: 0,
        volume: { isFolded: true, height: 40, events: [{ pos: 0, value: 0 }] },
        panpot: { isFolded: true, height: 40, events: [{ pos: 0, value: 0 }] },
        isMuted: false, isSoloMode: false,
        parts: [{
          pos: 0, duration: end, styleName: "No Effect", voice, midiEffects: [],
          notes: notes.map((n, i) => {
            const l = lyrics[i];
            const def = { 0: ["あ", "a"], 1: ["Ooh", "u:"], 2: ["아", "a"] }[langID] || ["あ", "a"];
            const lyric = l ? (l.ph === "-" ? "-" : l.t) : def[0];
            const phoneme = l ? l.ph : def[1];
            return {
              lyric, phoneme, isProtected: !!l, pos: n.pos, duration: n.dur, number: n.key, velocity: 64,
              exp: { opening: 127 }, singingSkill: { duration: 158, weight: { pre: 64, post: 64 } }, vibrato: { type: 0, duration: 0 }
            };
          })
        }]
      }]
    };
    const json = new TextEncoder().encode(JSON.stringify(seq));
    return zip([{ name: "Project/sequence.json", data: json }]);
  };

  const buildMid = (song, notes, lyrics, title) => {
    const enc = new TextEncoder();
    const bytes = [];
    const vlq = (v) => { const s = [v & 0x7f]; while ((v >>= 7)) s.unshift((v & 0x7f) | 0x80); bytes.push(...s); };
    const meta = (type, data) => { bytes.push(0xff, type); vlq(data.length); bytes.push(...data); };
    const ev = [];
    song.tempos.forEach((t) => ev.push({ tick: t.tick, o: 0, f: () => meta(0x51, [(t.us >> 16) & 255, (t.us >> 8) & 255, t.us & 255]) }));
    song.sigs.forEach((s) => ev.push({ tick: s.tick, o: 0, f: () => meta(0x58, [s.n, Math.log2(s.dd), 24, 8]) }));
    notes.forEach((n, i) => {
      const txt = lyrics[i] ? (lyrics[i].ph === "-" ? "-" : lyrics[i].t) : "a";
      ev.push({ tick: n.pos, o: 1, f: () => meta(0x05, [...enc.encode(txt)]) });
      ev.push({ tick: n.pos, o: 2, f: () => bytes.push(0x90, n.key, 100) });
      ev.push({ tick: n.pos + n.dur, o: -1, f: () => bytes.push(0x80, n.key, 0) });
    });
    ev.sort((a, b) => a.tick - b.tick || a.o - b.o);
    vlq(0); meta(0x03, [...enc.encode(title || "Vocal")]);
    let last = 0;
    ev.forEach((e) => { vlq(e.tick - last); last = e.tick; e.f(); });
    vlq(0); bytes.push(0xff, 0x2f, 0x00);
    const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, PPQ >> 8, PPQ & 255];
    const len = bytes.length;
    const trk = [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255];
    return new Blob([new Uint8Array([...head, ...trk, ...bytes])], { type: "audio/midi" });
  };

  const download = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  /* ---------- UI ---------- */
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  // only the target language is user-selectable; everything else uses fixed defaults
  const mopts = { mode: "ko", en: "spell", kana: "hira", coda: "soft", rules: true, split: false };
  const savedMode = store.get("v7-midi-mode");
  if (["ko", "ja", "en", "mix"].includes(savedMode)) mopts.mode = savedMode;
  const lyricNotes = () => window.KConv.convert($("#kr").value, mopts).flat(2).flatMap((s) => s.notes);
  const syncOpts = () => {
    store.set("v7-midi-mode", mopts.mode);
    document.querySelectorAll(".seg").forEach((seg) => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", mopts[seg.dataset.opt] === b.dataset.v)));
  };
  let song = null, fileBase = "song";
  const current = () => {
    const tr = song.tracks[+$("#mi-track").value || 0];
    return { notes: monophonic(tr.notes), lyrics: lyricNotes() };
  };
  const refresh = () => {
    if (!song) return;
    const { notes, lyrics } = current();
    $("#mi-notes").textContent = notes.length;
    $("#mi-lyrics").textContent = lyrics.length;
    $("#mi-bpm").textContent = (60000000 / song.tempos[0].us).toFixed(1).replace(/\.0$/, "");
    $("#mi-ts").textContent = `${song.sigs[0].n}/${song.sigs[0].dd}`;
    const diff = notes.length - lyrics.length;
    $("#mi-warn").textContent = !lyrics.length ? "위에서 가사를 먼저 입력하세요."
      : diff > 0 ? `음표가 가사보다 ${diff}개 많습니다. 남는 음표는 기본 가사(아 / あ / Ooh)로 채워집니다.`
      : diff < 0 ? `가사가 음표보다 ${-diff}개 많습니다. 남는 가사는 버려집니다.` : "음표와 가사 개수가 딱 맞습니다 ✓";
    $("#mi-list").innerHTML = notes.map((n, i) => {
      const l = lyrics[i];
      return `<div class="sc-row ${l ? "" : "extra"}"><span>${String(i + 1).padStart(3, "0")} · ${noteName(n.key)}</span><span>${l ? esc(l.t) + (l.ph ? ` <code>${esc(l.ph)}</code>` : "") : "—"}</span></div>`;
    }).join("");
  };

  const load = async (file) => {
    if (!file) return;
    try {
      song = parseMidi(await file.arrayBuffer());
      fileBase = file.name.replace(/\.(mid|midi|smf)$/i, "") || "song";
      $("#mi-title").value = fileBase;
      $("#mi-track").innerHTML = song.tracks.map((t, i) => `<option value="${i}">${esc(t.name)} — ${t.notes.length}음</option>`).join("");
      const most = song.tracks.reduce((b, t, i) => (t.notes.length > song.tracks[b].notes.length ? i : b), 0);
      $("#mi-track").value = most;
      $("#mi-file").textContent = file.name;
      $("#midi-panel").hidden = false;
      refresh();
    } catch (e) {
      song = null; $("#midi-panel").hidden = true;
      alert("MIDI를 읽지 못했습니다: " + e.message);
    }
  };

  const drop = $("#drop");
  $("#midi-in").addEventListener("change", (e) => load(e.target.files[0]));
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => load(e.dataTransfer.files[0]));
  $("#mi-track").addEventListener("change", refresh);
  document.querySelectorAll(".seg").forEach((seg) => seg.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    mopts[seg.dataset.opt] = b.dataset.v; syncOpts(); refresh();
  }));
  $("#kr").addEventListener("input", () => { store.set("v7-midi-text", $("#kr").value); refresh(); });
  $("#kr").value = store.get("v7-midi-text") || store.get("v7-conv-text") || "";
  syncOpts();

  const title = () => ($("#mi-title").value.trim() || fileBase).replace(/[\\/:*?"<>|]/g, "_");
  $("#dl-vpr").addEventListener("click", () => {
    const { notes, lyrics } = current();
    const langID = { ko: 2, en: 1 }[mopts.mode] ?? 0;
    download(buildVpr(song, notes, lyrics, title(), langID), `${title()}.vpr`);
  });
  $("#dl-mid").addEventListener("click", () => {
    const { notes, lyrics } = current();
    download(buildMid(song, notes, lyrics, title()), `${title()}_lyrics.mid`);
  });

  window.__v7midi = { parseMidi, monophonic, buildVpr, buildMid, zip, crc32 }; // for testing
})();
