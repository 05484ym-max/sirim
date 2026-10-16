(() => {
  'use strict';

  /* ───────── עזרים ───────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

  /* ───────── תיאוריה: אקורדים והעברת טון ───────── */
  const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);
  const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const KEYS = [...ROOTS, ...ROOTS.map(k => k + 'm')];

  function shiftNote(note, n, flat) {
    const i = IDX[note];
    return i === undefined ? note : (flat ? FLAT : SHARP)[(i + n % 12 + 12) % 12];
  }
  function transposeChord(chord, n, flat) {
    if (!n) return chord;
    return chord.split('/').map(part => {
      const m = part.match(/^([A-G][#b]?)(.*)$/);
      return m ? shiftNote(m[1], n, flat) + m[2] : part;
    }).join('/');
  }
  function transposeText(text, n, flat) {
    return text.replace(/\[([^\]]*)\]/g, (_, c) => '[' + transposeChord(c.trim(), n, flat) + ']');
  }
  function transposeKey(key, n) {
    if (!key) return key;
    const m = key.match(/^([A-G][#b]?)(m?)$/);
    if (!m) return key;
    const target = shiftNote(m[1], n, false) + m[2];
    const flatTarget = shiftNote(m[1], n, true) + m[2];
    return FLAT_KEYS.has(flatTarget) ? flatTarget : target;
  }
  function useFlats(song, n) {
    const k = transposeKey(song.key, n);
    if (k) return FLAT_KEYS.has(k);
    return n < 0;
  }
  // האקורדים הטבעיים של סולם (מז'ור או מינורי)
  function diatonic(key) {
    const m = (key || 'C').match(/^([A-G][#b]?)(m?)$/);
    if (!m || IDX[m[1]] === undefined) return diatonic('C');
    const flat = FLAT_KEYS.has(key || 'C');
    const root = IDX[m[1]], minor = !!m[2];
    const n = (st, q) => shiftNote('C', root + st, flat) + q;
    return minor
      ? [n(0, 'm'), n(2, 'dim'), n(3, ''), n(5, 'm'), n(7, 'm'), n(7, ''), n(8, ''), n(10, ''), n(7, '7')]
      : [n(0, ''), n(2, 'm'), n(4, 'm'), n(5, ''), n(7, ''), n(9, 'm'), n(11, 'dim'), n(7, '7'), n(0, 'maj7')];
  }

  /* ───────── גופנים ───────── */
  const FONTS = [
    { id: 'Frank Ruhl Libre', label: 'ספרותי', serif: true },
    { id: 'David Libre', label: 'דפוס קלאסי', serif: true },
    { id: 'Noto Serif Hebrew', label: 'סריף מודרני', serif: true },
    { id: 'Miriam Libre', label: 'מרים', serif: false },
    { id: 'Bellefair', label: 'אלגנטי', serif: true },
    { id: 'Suez One', label: 'כותרת עבה', serif: true },
    { id: 'Heebo', label: 'נקי', serif: false },
    { id: 'Assistant', label: 'רגוע', serif: false },
    { id: 'Rubik', label: 'מעוגל', serif: false },
    { id: 'Varela Round', label: 'עגלגל', serif: false },
    { id: 'Alef', label: 'אלף', serif: false },
    { id: 'Secular One', label: 'בולט', serif: false },
    { id: 'Playpen Sans Hebrew', label: 'כתב יד', serif: false },
    { id: 'Karantina', label: 'פוסטר', serif: false },
  ];

  /* ───────── מצב ───────── */
  const SAMPLE = {
    id: uid(), title: 'שיר לדוגמה', artist: 'כאן כותבים', key: 'Am', capo: '',
    text: [
      '# בית 1',
      '[Am]אני יושב על [F]הגג עם גיטרה',
      '[C]העיר דולקת [G]למטה בשקט',
      '[Am]כל מילה שנכתבת [F]נשארת קרובה',
      '[C]וכל אקורד [E7]מחכה לשיר',
      '',
      '# פזמון',
      '[F]לה לה לה, [C]תן לי עוד שורה',
      '[G]עוד לילה אחד [Am]ועוד נגינה',
      '',
      '# הערות',
      'לחצו על "הופעה" כדי לגלול את השיר אוטומטית.',
    ].join('\n'),
    transpose: 0, updated: Date.now(),
  };
  let songs = load('sirim.songs', null);
  if (!Array.isArray(songs) || !songs.length) songs = [SAMPLE];
  const prefs = Object.assign(
    { font: 'Frank Ruhl Libre', size: 34, speed: 30, chords: true, light: false, current: songs[0].id, view: 'edit' },
    load('sirim.prefs', {}));
  if (!songs.some(s => s.id === prefs.current)) prefs.current = songs[0].id;

  const cur = () => songs.find(s => s.id === prefs.current);
  const persistSongs = () => save('sirim.songs', songs);
  const persistPrefs = () => save('sirim.prefs', prefs);

  /* ───────── אלמנטים ───────── */
  const app = $('#app'), scroller = $('#scroller'), songView = $('#songView');
  const fTitle = $('#fTitle'), fArtist = $('#fArtist'), fKey = $('#fKey'), fCapo = $('#fCapo'), fText = $('#fText');

  /* ───────── רשימת שירים ───────── */
  function renderList() {
    const q = $('#search').value.trim().toLowerCase();
    const items = [...songs].sort((a, b) => b.updated - a.updated)
      .filter(s => !q || (s.title + ' ' + s.artist + ' ' + s.text).toLowerCase().includes(q));
    $('#songList').innerHTML = items.length ? items.map(s => `
      <li><button class="song-item ${s.id === prefs.current ? 'active' : ''}" data-id="${s.id}">
        <div class="t">${esc(s.title || 'ללא שם')}</div>
        <div class="s"><span>${esc(s.artist || '—')}</span>${s.key ? `<span class="k">${esc(s.key)}</span>` : ''}</div>
      </button></li>`).join('') : '<li class="empty-list">לא נמצאו שירים</li>';
  }

  function openSong(id) {
    stopScroll();
    prefs.current = id; persistPrefs();
    const s = cur();
    fTitle.value = s.title; fArtist.value = s.artist; fKey.value = s.key || ''; fCapo.value = s.capo || '';
    model = parseSong(s.text); sel = null; fText.value = lyricsOf(model);
    s.transpose = 0;
    renderChips(); renderStage(); renderList(); syncSheet(); setEMode(eMode);
    scroller.scrollTop = 0;
    app.classList.remove('lib-open');
  }

  function newSong() {
    const s = { id: uid(), title: '', artist: '', key: '', capo: '', text: '', transpose: 0, updated: Date.now() };
    songs.push(s); persistSongs();
    openSong(s.id); setView('edit'); setEMode('text'); fTitle.focus();
  }

  /* ───────── מודל שיר: שורות עם אקורדים במיקום לפי אות ───────── */
  // line = { t: טקסט, ch: [{ p: אינדקס אות, c: שם אקורד }] }. נשמר בדיסק בתור [Am]מילה.
  let model = [], sel = null, activeChord = '', eMode = 'text';
  const isSection = t => /^\s*#/.test(t);

  function parseModelLine(raw) {
    const line = { t: '', ch: [] };
    if (isSection(raw)) { line.t = raw; return line; }
    raw.split(/\[([^\]]*)\]/).forEach((part, i) => {
      if (i % 2) { if (part.trim()) line.ch.push({ p: line.t.length, c: part.trim() }); } else line.t += part;
    });
    return line;
  }
  const parseSong = text => text.split('\n').map(parseModelLine);
  const lyricsOf = m => m.map(l => l.t).join('\n');
  function serialize(m) {
    return m.map(l => {
      if (!l.ch.length) return l.t;
      const chords = l.ch.map((x, k) => ({ ...x, k })).sort((a, b) => a.p - b.p || a.k - b.k);
      let out = '', at = 0;
      chords.forEach(x => { const p = clamp(x.p, 0, l.t.length); out += l.t.slice(at, p) + `[${x.c}]`; at = p; });
      return out + l.t.slice(at);
    }).join('\n');
  }

  // מזיז אקורדים לפי השינוי בטקסט של שורה (השוואת תחילית/סיומת)
  function adjustChords(ch, oldT, newT) {
    if (oldT === newT || !ch.length) return ch;
    const min = Math.min(oldT.length, newT.length);
    let a = 0; while (a < min && oldT[a] === newT[a]) a++;
    let b = 0; while (b < min - a && oldT[oldT.length - 1 - b] === newT[newT.length - 1 - b]) b++;
    const delta = newT.length - oldT.length;
    return ch.map(x => {
      let p = x.p;
      if (p > a) p = p >= oldT.length - b ? p + delta : a;
      return { p: clamp(p, 0, newT.length), c: x.c };
    });
  }
  // מעדכן את המודל לפי הטקסט החדש בתיבת הטקסט, ושומר אקורדים של שורות שלא נמחקו
  function reconcile(old, texts) {
    let i = 0; while (i < old.length && i < texts.length && old[i].t === texts[i]) i++;
    let j = 0; while (j < old.length - i && j < texts.length - i && old[old.length - 1 - j].t === texts[texts.length - 1 - j]) j++;
    const oMid = old.slice(i, old.length - j), nMid = texts.slice(i, texts.length - j);
    return [
      ...old.slice(0, i),
      ...nMid.map((t, k) => (oMid[k] ? { t, ch: adjustChords(oMid[k].ch, oMid[k].t, t) } : { t, ch: [] })),
      ...old.slice(old.length - j),
    ];
  }

  /* ───────── עריכה ושמירה ───────── */
  let saveTimer;
  function markDirty() {
    const s = cur();
    s.title = fTitle.value; s.artist = fArtist.value; s.key = fKey.value; s.capo = fCapo.value; s.text = serialize(model);
    s.updated = Date.now();
    $('#saveState').textContent = 'שומר…'; $('#saveState').classList.add('dirty');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistSongs(); renderList();
      $('#saveState').textContent = 'נשמר'; $('#saveState').classList.remove('dirty');
    }, 350);
  }
  function onTextInput() {
    model = reconcile(model, fText.value.split('\n'));
    // מי שהקליד אקורד בסוגריים ידנית – נהפוך אותו לאקורד אמיתי מעל השורה
    let converted = false;
    model = model.map(l => {
      if (isSection(l.t) || !/\[[^\]]+\]/.test(l.t)) return l;
      const m = parseModelLine(l.t); converted = true;
      return { t: m.t, ch: [...adjustChords(l.ch, l.t, m.t), ...m.ch] };
    });
    if (converted) fText.value = lyricsOf(model);
    markDirty();
  }
  [fTitle, fArtist, fCapo].forEach(el => el.addEventListener('input', markDirty));
  fText.addEventListener('input', onTextInput);
  fKey.addEventListener('change', () => { markDirty(); renderChips(); });

  fKey.innerHTML = '<option value="">—</option>' + KEYS.map(k => `<option>${k}</option>`).join('');

  $('#addSection').addEventListener('click', () => {
    const atLineStart = fText.selectionStart === 0 || fText.value[fText.selectionStart - 1] === '\n';
    fText.setRangeText((atLineStart ? '' : '\n') + '# ', fText.selectionStart, fText.selectionEnd, 'end');
    fText.focus(); onTextInput();
  });

  /* ───────── מצב אקורדים: הנחה וגרירה מעל השורה ───────── */
  const canvas = $('#chordCanvas');

  function setEMode(m) {
    eMode = m;
    $('#editor').dataset.emode = m;
    $$('[data-emode]').forEach(b => b.setAttribute('aria-selected', b.dataset.emode === m));
    fText.hidden = m !== 'text'; $('#chordPane').hidden = m !== 'chords';
    if (m === 'text') fText.value = lyricsOf(model); else { renderCanvas(); }
  }
  $$('button[data-emode]').forEach(b => b.addEventListener('click', () => setEMode(b.dataset.emode)));

  function renderChips() {
    $('#chordChips').innerHTML = diatonic(fKey.value || 'C')
      .map(c => `<button class="chip ${c === activeChord ? 'on' : ''}" data-chord="${c}">${c}</button>`).join('');
  }
  function setActive(c) { activeChord = c; renderChips(); updateSelInfo(); }
  $('#chordChips').addEventListener('click', e => { const b = e.target.closest('[data-chord]'); if (b) setActive(b.dataset.chord); });
  function addCustom() {
    const v = $('#customChord').value.trim(); if (!v) return;
    setActive(v); $('#customChord').value = '';
  }
  $('#addCustom').addEventListener('click', addCustom);
  $('#customChord').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });

  function updateSelInfo() {
    const c = sel && model[sel.l]?.ch[sel.k];
    $('#selInfo').innerHTML = c ? `אקורד נבחר: <b>${esc(c.c)}</b> — גרור כדי להזיז`
      : activeChord ? `אקורד פעיל: <b>${esc(activeChord)}</b> — לחץ על אות כדי להניח` : 'בחר אקורד מהרשימה';
    $('#chRename').disabled = $('#chDelete').disabled = !c;
  }

  function renderCanvas() {
    if (!model.some(l => l.t.trim())) { canvas.innerHTML = '<div class="cv-empty">אין עדיין מילים. עבור ללשונית ״מילים״ וכתוב את השיר.</div>'; updateSelInfo(); return; }
    canvas.innerHTML = model.map((l, li) => {
      if (isSection(l.t)) return `<div class="cv-sec">${esc(l.t.replace(/^\s*#+\s*/, ''))}</div>`;
      if (!l.t.trim() && !l.ch.length) return '<div class="cv-gap"></div>';
      const chars = l.t.split('').map((c, i) => `<span class="cc" data-i="${i}">${esc(c)}</span>`).join('');
      const chords = l.ch.map((x, k) => `<span class="cv-chord ${sel && sel.l === li && sel.k === k ? 'sel' : ''}" data-l="${li}" data-k="${k}">${esc(x.c)}</span>`).join('');
      return `<div class="cv-line" data-l="${li}"><div class="cv-text">${chars}<span class="cc" data-i="${l.t.length}"> </span></div>${chords}</div>`;
    }).join('');
    layoutAll(); updateSelInfo();
  }
  function layoutLine(lineEl) {
    const li = +lineEl.dataset.l, cont = lineEl.getBoundingClientRect();
    lineEl.querySelectorAll('.cv-chord').forEach(el => {
      const x = model[li].ch[+el.dataset.k]; if (!x) return;
      const target = lineEl.querySelector(`.cc[data-i="${Math.min(x.p, model[li].t.length)}"]`);
      const r = target.getBoundingClientRect();
      el.style.right = (cont.right - r.right) + 'px';
      el.style.top = (r.top - cont.top) + 'px';
    });
  }
  const layoutAll = () => $$('.cv-line', canvas).forEach(layoutLine);
  window.addEventListener('resize', () => eMode === 'chords' && layoutAll());
  document.fonts?.ready.then(() => eMode === 'chords' && layoutAll());

  function commitChords() { markDirty(); }

  // הנחת אקורד חדש בלחיצה על אות
  canvas.addEventListener('click', e => {
    if (drag) return;
    const cc = e.target.closest('.cc'); if (!cc) { if (!e.target.closest('.cv-chord')) { sel = null; renderCanvas(); } return; }
    if (!activeChord) { $('#selInfo').textContent = 'קודם בחר אקורד מהרשימה למעלה'; return; }
    const li = +cc.closest('.cv-line').dataset.l, line = model[li];
    line.ch.push({ p: +cc.dataset.i, c: activeChord });
    sel = { l: li, k: line.ch.length - 1 };
    commitChords(); renderCanvas();
  });

  // גרירת אקורד למיקום אחר באותה שורה
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    const el = e.target.closest('.cv-chord'); if (!el) return;
    e.preventDefault();
    const li = +el.dataset.l, k = +el.dataset.k;
    drag = { el, li, k, moved: false, x0: e.clientX, line: el.closest('.cv-line') };
    el.setPointerCapture(e.pointerId);
    if (!sel || sel.l !== li || sel.k !== k) {
      canvas.querySelectorAll('.cv-chord.sel').forEach(n => n.classList.remove('sel'));
      el.classList.add('sel'); sel = { l: li, k };
    }
    activeChord = model[li].ch[k].c; renderChips(); updateSelInfo();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) < 5) return;
    drag.moved = true; drag.el.classList.add('drag');
    let best = 0, bestD = Infinity;
    drag.line.querySelectorAll('.cc').forEach(c => {
      const r = c.getBoundingClientRect(), d = Math.abs((r.left + r.right) / 2 - e.clientX);
      if (d < bestD && e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60) { bestD = d; best = +c.dataset.i; }
    });
    const x = model[drag.li].ch[drag.k];
    if (x.p !== best) { x.p = best; layoutLine(drag.line); }
  });
  const endDrag = () => {
    if (!drag) return;
    const moved = drag.moved; drag.el.classList.remove('drag');
    setTimeout(() => { drag = null; }, 0);
    if (moved) commitChords();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  $('#chDelete').addEventListener('click', () => {
    if (!sel) return; model[sel.l].ch.splice(sel.k, 1); sel = null; commitChords(); renderCanvas();
  });
  $('#chRename').addEventListener('click', () => {
    const x = sel && model[sel.l].ch[sel.k]; if (!x) return;
    const v = prompt('שם האקורד:', x.c); if (v && v.trim()) { x.c = v.trim(); commitChords(); renderCanvas(); }
  });

  /* ───────── תצוגת הופעה ───────── */
  function parseLine(line, n, flat, showChords) {
    const parts = line.split(/\[([^\]]*)\]/);
    if (parts.length === 1) return `<div class="ln">${esc(line)}</div>`;
    if (!showChords) return `<div class="ln">${esc(parts.filter((_, i) => i % 2 === 0).join(''))}</div>`;
    let html = '';
    const seg = (ch, tx) => `<span class="seg"><span class="ch">${esc(ch) || '&nbsp;'}</span><span class="tx">${esc(tx) || '&nbsp;'}</span></span>`;
    if (parts[0]) html += seg('', parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      const ch = transposeChord(parts[i].trim(), n, flat);
      html += seg(ch, parts[i + 1] || '');
    }
    return `<div class="ln has-chords">${html}</div>`;
  }

  function renderStage() {
    const s = cur(); if (!s) return;
    const n = s.transpose || 0, flat = useFlats(s, n);
    const key = transposeKey(s.key, n);
    const body = s.text.split('\n').map(raw => {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) return '<div class="ln gap"></div>';
      if (/^\s*#/.test(line)) return `<div class="sec">${esc(line.replace(/^\s*#+\s*/, ''))}</div>`;
      return parseLine(line, n, flat, prefs.chords);
    }).join('');
    const tags = [key && `סולם <span dir="ltr">${esc(key)}</span>`, s.capo > 0 && `קאפו ${esc(String(s.capo))}`]
      .filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');
    songView.classList.toggle('no-chords', !prefs.chords);
    songView.innerHTML = `
      <header class="song-head">
        <h1>${esc(s.title || 'ללא שם')}</h1>
        ${s.artist ? `<div class="by">${esc(s.artist)}</div>` : ''}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </header>${body}`;
    $('#trVal').textContent = n ? (n > 0 ? '+' : '') + n : '0';
  }

  /* ───────── גלילה אוטומטית ───────── */
  let playing = false, raf = 0, last = 0, pos = 0, lastSet = 0, wake = null;
  const pps = () => 3 + prefs.speed * 1.7; // פיקסלים לשנייה

  function loop(t) {
    if (!playing) return;
    const dt = Math.min((t - last) / 1000, .1); last = t;
    if (Math.abs(scroller.scrollTop - lastSet) > 1.5) pos = scroller.scrollTop; // המשתמש גלל ידנית
    pos += pps() * dt;
    scroller.scrollTop = pos; lastSet = scroller.scrollTop;
    const max = scroller.scrollHeight - scroller.clientHeight;
    if (pos >= max - 1) { stopScroll(); return; }
    raf = requestAnimationFrame(loop);
  }
  async function startScroll() {
    if (playing) return;
    if (prefs.view !== 'stage') setView('stage');
    playing = true; pos = lastSet = scroller.scrollTop; last = performance.now();
    $('#playBtn').innerHTML = '<svg class="i"><use href="#i-pause"/></svg>';
    $('#playBtn').setAttribute('aria-label', 'עצור גלילה');
    raf = requestAnimationFrame(loop);
    try { wake = await navigator.wakeLock?.request('screen'); } catch { /* not supported */ }
  }
  function stopScroll() {
    playing = false; cancelAnimationFrame(raf);
    $('#playBtn').innerHTML = '<svg class="i"><use href="#i-play"/></svg>';
    $('#playBtn').setAttribute('aria-label', 'התחל גלילה');
    try { wake?.release(); } catch { /* ignore */ } wake = null;
  }
  $('#playBtn').addEventListener('click', () => (playing ? stopScroll() : startScroll()));
  $('#topBtn').addEventListener('click', () => { scroller.scrollTo({ top: 0, behavior: 'smooth' }); pos = lastSet = 0; });

  document.addEventListener('keydown', e => {
    if (prefs.view !== 'stage' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? stopScroll() : startScroll(); }
    else if (e.key === 'ArrowUp' && e.shiftKey) { e.preventDefault(); setSpeed(prefs.speed + 3); }
    else if (e.key === 'ArrowDown' && e.shiftKey) { e.preventDefault(); setSpeed(prefs.speed - 3); }
  });
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && playing) { try { wake = await navigator.wakeLock?.request('screen'); } catch { /* ignore */ } }
  });

  /* ───────── תצוגה: גופן, גודל, מהירות ───────── */
  const fill = el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
  const sliders = () => $$('input[type=range]');

  function setSize(v) {
    prefs.size = clamp(+v, 16, 84);
    document.documentElement.style.setProperty('--fs', prefs.size + 'px');
    persistPrefs(); syncSheet();
  }
  function setSpeed(v) { prefs.speed = clamp(Math.round(+v), 1, 100); persistPrefs(); syncSheet(); }
  function setFont(id) {
    prefs.font = id;
    const f = FONTS.find(x => x.id === id) || FONTS[0];
    document.documentElement.style.setProperty('--font-song', `"${f.id}", ${f.serif ? 'serif' : 'sans-serif'}`);
    persistPrefs(); syncSheet();
  }
  function setTheme(light) {
    prefs.light = light;
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    $('meta[name=theme-color]').content = light ? '#f6f0e4' : '#16130f';
    persistPrefs();
  }

  function syncSheet() {
    $('#dockSpeed').value = $('#setSpeed').value = prefs.speed;
    $('#dockSize').value = $('#setSize').value = prefs.size;
    $('#speedVal').textContent = $('#speedVal2').textContent = prefs.speed;
    $('#sizeVal').textContent = $('#sizeVal2').textContent = prefs.size;
    $('#setChords').checked = prefs.chords; $('#setLight').checked = prefs.light;
    sliders().forEach(fill);
    $$('.font-opt').forEach(b => b.setAttribute('aria-selected', b.dataset.font === prefs.font));
    const s = cur(); if (s) $('#trVal').textContent = s.transpose ? (s.transpose > 0 ? '+' : '') + s.transpose : '0';
  }

  $('#fontList').innerHTML = FONTS.map(f => `
    <button class="font-opt" role="option" data-font="${f.id}" style="font-family:'${f.id}',${f.serif ? 'serif' : 'sans-serif'}">
      <span class="fn">שיר ואקורד</span><span class="fl">${f.label}</span>
    </button>`).join('');
  $('#fontList').addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (b) setFont(b.dataset.font); });

  ['#dockSize', '#setSize'].forEach(id => $(id).addEventListener('input', e => setSize(e.target.value)));
  ['#dockSpeed', '#setSpeed'].forEach(id => $(id).addEventListener('input', e => setSpeed(e.target.value)));
  $('#setChords').addEventListener('change', e => { prefs.chords = e.target.checked; persistPrefs(); renderStage(); });
  $('#setLight').addEventListener('change', e => setTheme(e.target.checked));

  // העברת טון
  function shiftView(d) { const s = cur(); s.transpose = clamp((s.transpose || 0) + d, -11, 11); renderStage(); syncSheet(); }
  $('#trUp').addEventListener('click', () => shiftView(1));
  $('#trDown').addEventListener('click', () => shiftView(-1));
  $('#trReset').addEventListener('click', () => { cur().transpose = 0; renderStage(); syncSheet(); });
  $('#trBake').addEventListener('click', () => {
    const s = cur(), n = s.transpose || 0; if (!n) return;
    const flat = useFlats(s, n);
    s.text = transposeText(s.text, n, flat); s.key = transposeKey(s.key, n); s.transpose = 0; s.updated = Date.now();
    persistSongs(); openSong(s.id);
  });

  /* ───────── חלונית הגדרות ───────── */
  const sheetWrap = $('#sheetWrap');
  function toggleSheet(open) {
    sheetWrap.hidden = !open; $('#aaBtn').setAttribute('aria-expanded', open);
    if (open) { syncSheet(); $('#fontList .font-opt[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }); }
  }
  $('#aaBtn').addEventListener('click', () => toggleSheet(sheetWrap.hidden));
  $('#sheetScrim').addEventListener('click', () => toggleSheet(false));
  $('#sheetClose').addEventListener('click', () => toggleSheet(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { toggleSheet(false); app.classList.remove('lib-open'); } });

  /* ───────── ניווט ───────── */
  function setView(v) {
    prefs.view = v; app.dataset.view = v; persistPrefs();
    $$('.seg-switch button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v));
    if (v === 'stage') { renderStage(); } else stopScroll();
  }
  $$('.seg-switch button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

  $('#menuBtn').addEventListener('click', () => app.classList.add('lib-open'));
  $('#scrim').addEventListener('click', () => app.classList.remove('lib-open'));
  $('#songList').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) openSong(b.dataset.id); });
  $('#search').addEventListener('input', renderList);
  $('#newSong').addEventListener('click', newSong);

  $('#dupBtn').addEventListener('click', () => {
    const s = cur(), c = { ...s, id: uid(), title: (s.title || 'ללא שם') + ' (עותק)', updated: Date.now() };
    songs.push(c); persistSongs(); openSong(c.id);
  });
  $('#delBtn').addEventListener('click', () => {
    const s = cur();
    if (!confirm(`למחוק את "${s.title || 'ללא שם'}"? אי אפשר לשחזר.`)) return;
    songs = songs.filter(x => x.id !== s.id);
    if (!songs.length) songs.push({ id: uid(), title: '', artist: '', key: '', capo: '', text: '', transpose: 0, updated: Date.now() });
    persistSongs(); openSong([...songs].sort((a, b) => b.updated - a.updated)[0].id);
  });

  /* ───────── גיבוי ושחזור ───────── */
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'sirim', songs }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `sirim-backup-${new Date().toISOString().slice(0, 10)}.json` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const incoming = (Array.isArray(data) ? data : data.songs || []).filter(s => s && typeof s.text === 'string');
      const have = new Set(songs.map(s => s.id));
      incoming.forEach(s => songs.push({ title: '', artist: '', key: '', capo: '', transpose: 0, ...s, id: have.has(s.id) ? uid() : (s.id || uid()), updated: s.updated || Date.now() }));
      persistSongs(); renderList();
      alert(`נוספו ${incoming.length} שירים`);
    } catch { alert('הקובץ לא תקין'); }
    e.target.value = '';
  });

  /* ───────── אתחול ───────── */
  setTheme(prefs.light);
  setFont(prefs.font);
  setSize(prefs.size);
  setView(prefs.view);
  openSong(prefs.current);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
