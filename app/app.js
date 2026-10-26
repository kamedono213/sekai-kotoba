// 「もどる」「やめる」を押したら、本当にもどるか確かめる(スマホの「戻る」操作も)。
// 画面のボタンは id="back" / id="quit"。もともと確認があるボタンは data-noconfirm をつけて除く
(() => {
  let bypass = false, ignorePop = false;
  const pass = fn => { bypass = true; fn(); setTimeout(() => { bypass = false; }, 500); };
  const ask = onYes => {
    if (document.getElementById('leave-confirm')) return;
    const d = document.createElement('div');
    d.id = 'leave-confirm'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:16px';
    d.innerHTML = '<div style="background:#fff;color:#222;border-radius:16px;padding:20px 18px;max-width:320px;width:100%;display:grid;gap:14px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25)">'
      + '<b style="font-size:18px">本当にもどりますか？</b><span style="font-size:14px;color:#555">いまの続きは消えることがあります。</span>'
      + '<div style="display:flex;gap:10px"><button type="button" data-a="no" style="flex:1;padding:12px;border-radius:12px;border:1px solid #ccc;background:#fff;color:#222;font:inherit;font-weight:700">つづける</button>'
      + '<button type="button" data-a="yes" style="flex:1;padding:12px;border-radius:12px;border:0;background:#2f6fd0;color:#fff;font:inherit;font-weight:700">もどる</button></div></div>';
    d.addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (!a && e.target !== d) return;
      d.remove();
      if (a && a.dataset.a === 'yes') onYes();
    });
    document.body.appendChild(d);
    d.querySelector('[data-a="no"]').focus();
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('#back, #quit');
    if (!b || bypass || b.hasAttribute('data-noconfirm')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    ask(() => pass(() => b.click()));
  }, true);
  // ROUTED: このアプリが画面ごとに履歴を積むか。積まないアプリは、戻る操作を受け止める「しおり」を1つ積んでおく
  const ROUTED = false;
  const guard = () => history.pushState({ leaveGuard: 1 }, '');
  if (!ROUTED) guard();
  window.addEventListener('popstate', e => {
    if (ignorePop) { ignorePop = false; e.stopImmediatePropagation(); return; }
    if (bypass) return;
    e.stopImmediatePropagation();
    if (!ROUTED) {
      const b = document.querySelector('#back, #quit');
      if (!b) { history.back(); return; }                 // メニュー画面ではそのままアプリを閉じる
      guard();
      if (b.hasAttribute('data-noconfirm')) { b.click(); return; }
      ask(() => pass(() => b.click()));
      return;
    }
    ignorePop = true; history.go(1); // いったん元の画面にとどまる
    ask(() => pass(() => history.back()));
  }, true);
})();

// ---------- ふりがな(ちりパズルと同じく、漢字の上に小さく読みを出す)
// 辞書 window.FURI は furi.js(onze.ltd/tools/furigana/make-furi.js が自動生成)。
// 画面に出た文字を自動で包むので、各画面のコードは変えなくてよい。答え合わせに使う textContent は変わらない(読みは CSS で表示)。
// 切りかえボタンは、data-furi-slot を付けた場所に自動で入る。設定はアプリごとに保存
(() => {
  const D = window.FURI || {};
  // 先頭の1文字ごとに、長い順に並べておく(文まるごと → 単語の順に当てはめる)
  const byHead = {};
  Object.keys(D).sort((a, b) => b.length - a.length).forEach(k => (byHead[k[0]] = byHead[k[0]] || []).push(k));
  const KEY = 'furi:' + location.pathname;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* 保存できなくても動く */ }
  const css = document.createElement('style');
  // アプリ側の「span に〜」という指定が効かないように、ルビの span は !important で固める
  css.textContent = '.rbw,.rb{margin:0!important;border:0!important;background:none!important;min-width:0!important;font:inherit!important;color:inherit!important;letter-spacing:inherit!important;text-indent:0!important}'
    + '.rbw{display:inline!important;padding:0!important}'
    + '.rb{display:inline-block!important;position:relative!important;padding:0!important}'
    // ふりがなありの時は行の高さを広げ、読みは行間(漢字の上のすき間)に置く。行ごとに高さがばらつかない
    + 'html.furi body{line-height:2.2}'
    + 'html.furi .rb{line-height:max(2.2em, 1em + 17px)!important}'
    + 'html.furi .rb::before{content:attr(data-rt);position:absolute;bottom:calc(50% + 1.02em);left:50%;transform:translateX(-50%);font-size:max(.5em,7.5px);font-weight:700;line-height:1.1;white-space:nowrap;letter-spacing:0;pointer-events:none}'
    + '.furi-tools{display:inline-flex;flex-wrap:wrap;gap:6px;justify-self:start;align-self:center;width:auto;flex:none;line-height:1.4}'
    + '.furi-toggle{width:auto;flex:none;line-height:1.4;border:1.5px solid rgba(127,127,127,.4);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}'
    + '.furi-toggle[aria-pressed="true"]{border-color:currentColor}';
  document.head.appendChild(css);
  const apply = () => document.documentElement.classList.toggle('furi', on);
  apply();
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TITLE']);
  const ok = el => {
    for (let e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (e.namespaceURI === 'http://www.w3.org/2000/svg') return false;
      if (e.classList.contains('rb') || e.classList.contains('rbw') || e.hasAttribute('data-nofuri')) return false;
      if (e.lang && !/^ja/i.test(e.lang)) return false; // 外国語の文字(中国語の漢字など)には付けない
      if (SKIP.has(e.tagName)) return false;
    }
    return true;
  };
  function wrapText(node) {
    const t = node.nodeValue;
    if (!/[一-鿿々]/.test(t)) return;
    const frag = document.createDocumentFragment();
    let last = 0, hit = false;
    for (let i = 0; i < t.length;) {
      const k = (byHead[t[i]] || []).find(x => t.startsWith(x, i));
      if (!k) { i++; continue; }
      hit = true;
      if (i > last) frag.appendChild(document.createTextNode(t.slice(last, i)));
      for (const seg of D[k]) {
        if (typeof seg === 'string') { frag.appendChild(document.createTextNode(seg)); continue; }
        const s = document.createElement('span'); s.className = 'rb'; s.dataset.rt = seg[1]; s.textContent = seg[0];
        frag.appendChild(s);
      }
      i = last = i + k.length;
    }
    if (!hit) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    // 1つの span にまとめて入れる(flex や grid の中で、ルビごとに改行されないように)
    const w = document.createElement('span'); w.className = 'rbw'; w.appendChild(frag);
    node.replaceWith(w);
  }
  // 切りかえボタンを入れる箱(効果音ボタンもここに入る)
  function tools(slot) {
    let box = slot.querySelector(':scope > .furi-tools');
    if (!box) { box = document.createElement('span'); box.className = 'furi-tools'; box.setAttribute('data-nofuri', ''); slot.appendChild(box); }
    return box;
  }
  function toggleHtml() { return `<button type="button" class="furi-toggle" data-furi-toggle aria-pressed="${on}">ふりがな ${on ? 'あり' : 'なし'}</button>`; }
  function scan(root) {
    if (root.nodeType === 3) { if (ok(root.parentNode)) wrapText(root); return; }
    if (root.nodeType !== 1 || !ok(root)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    let n; while ((n = w.nextNode())) if (ok(n.parentNode)) list.push(n);
    list.forEach(wrapText);
    const slots = root.querySelectorAll ? [...root.querySelectorAll('[data-furi-slot]')] : [];
    if (root.hasAttribute && root.hasAttribute('data-furi-slot')) slots.push(root);
    slots.forEach(s => { if (!s.querySelector('[data-furi-toggle]')) tools(s).insertAdjacentHTML('afterbegin', toggleHtml()); });
  }
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) scan(n); })
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-furi-toggle]'); if (!b) return;
    on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (err) { /* 保存できなくても切りかわる */ }
    apply();
    document.querySelectorAll('[data-furi-toggle]').forEach(x => { x.setAttribute('aria-pressed', on); x.textContent = 'ふりがな ' + (on ? 'あり' : 'なし'); });
  });
  window.furiTools = tools;
  if (document.body) scan(document.body);
})();

// せかいのことば — 言語ごとのデータ(data/*.js が window.LANGS に登録)を読んで、
// 「見て聞く」一覧とクイズを作る。音声はブラウザの読み上げ(speechSynthesis)、発音チェックは音声認識(使える端末だけ)。
const LANGS = window.LANGS || [];
const app = document.getElementById('app');
let S = { screen: 'home' };

// ---------- 保存(この端末のブラウザの中だけ)
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('sk:' + k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sk:' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても遊べる */ } },
};
let P = store.get('progress', {}); // 項目id → { b: 箱(0〜5), d: 次に出す日, n: 回答数, w: まちがい数 }
const INTERVAL = [0, 1, 2, 4, 7, 15];
const LEARNED = 3; // この箱以上を「覚えた」とする
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
function record(id, ok) {
  const p = P[id] || { b: 0, d: 0, n: 0, w: 0 };
  p.n++;
  if (ok) { p.b = Math.min(5, p.b + 1); p.d = today() + INTERVAL[p.b]; } else { p.w++; p.b = 1; p.d = today(); }
  P[id] = p; store.set('progress', P);
}
const learned = id => (P[id] ? P[id].b : 0) >= LEARNED;

// ---------- 共通
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const langOf = id => LANGS.find(l => l.id === id);
const unitOf = (lang, id) => lang.units.find(u => u.id === id);
const itemId = (lang, unit, it) => `${lang.id}:${unit.id}:${it.t}`;
const unitItems = unit => unit.items || [];
const unitRatio = (lang, unit) => { const it = unitItems(unit); return it.length ? it.filter(i => learned(itemId(lang, unit, i))).length / it.length : 0; };
const langItems = lang => lang.units.flatMap(u => unitItems(u).map(i => ({ u, i })));
const dueOf = lang => langItems(lang).filter(({ u, i }) => { const p = P[itemId(lang, u, i)]; return p && p.d <= today(); });
const ko = (lang, html, cls = '') => `<span class="tl ${cls}" lang="${lang.tts.slice(0, 2)}" style="font-family:${lang.font}">${html}</span>`;
const GROUPS = [['moji', '文字', ['intro', 'letters', 'syllables', 'patchim']], ['tango', '単語', ['words']], ['bun', '文', ['sentences']]];

// ---------- 効果音(Web Audio で合成)
const SE = {
  ctx: null, muted: store.get('muted', false),
  ac() { if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); } if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  tone(f, at, dur, type = 'sine', vol = 0.14) {
    const c = this.ac(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(n) {
    if (this.muted) return;
    try {
      if (n === 'ok') { this.tone(1047, 0, 0.1); this.tone(1568, 0.08, 0.22); }
      if (n === 'ng') this.tone(220, 0, 0.25, 'square', 0.05);
      if (n === 'result') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.1, 0.2, 'triangle'));
    } catch (e) { /* 音が出せない環境でも遊べる */ }
  },
};

// ---------- 読み上げ(端末に入っている声を使う)
const TTS = {
  ok: 'speechSynthesis' in window,
  voices: [],
  load() { if (!this.ok) return; this.voices = speechSynthesis.getVoices(); },
  voice(tag) { const l = tag.slice(0, 2).toLowerCase(); return this.voices.find(v => v.lang.replace('_', '-').toLowerCase() === tag.toLowerCase()) || this.voices.find(v => v.lang.toLowerCase().startsWith(l)); },
  has(tag) { return !!this.voice(tag); },
  speak(text, tag, slow) {
    if (!this.ok || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = tag; const v = this.voice(tag); if (v) u.voice = v;
    u.rate = slow ? 0.55 : 0.85;
    speechSynthesis.speak(u);
  },
};
if (TTS.ok) { TTS.load(); speechSynthesis.onvoiceschanged = () => { TTS.load(); if (S.screen === 'lang') render(); }; }

// ---------- 発音チェック(音声認識。Android の Chrome などで使える)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const norm = s => String(s).replace(/[\s.,!?。、!?~'’¿¡-]/g, '').toLowerCase();
function listen(lang, target, btn, out) {
  if (!SR) return;
  const r = new SR();
  r.lang = lang.tts; r.interimResults = false; r.maxAlternatives = 5;
  btn.disabled = true; btn.textContent = '🎤 聞いています…';
  out.className = 'heard'; out.textContent = '';
  let got = false;
  r.onresult = e => {
    got = true;
    const alts = [...e.results[0]].map(a => a.transcript);
    const ok = alts.some(a => norm(a) === norm(target));
    out.className = 'heard ' + (ok ? 'ok' : 'ng');
    out.innerHTML = ok ? `ばっちり! 「${ko(lang, esc(alts.find(a => norm(a) === norm(target))))}」と聞こえたよ`
      : `「${ko(lang, esc(alts[0]))}」と聞こえたよ。お手本を聞いて、もう1回!`;
    SE.play(ok ? 'ok' : 'ng');
  };
  r.onerror = e => { out.className = 'heard ng'; out.textContent = e.error === 'not-allowed' ? 'マイクが使えません(ブラウザの設定でマイクを許可してね)' : '聞き取れなかったよ。もう1回!'; };
  r.onend = () => { btn.disabled = false; btn.textContent = '🎤 言ってみる'; if (!got && !out.textContent) { out.className = 'heard ng'; out.textContent = '聞き取れなかったよ。もう1回!'; } };
  try { r.start(); } catch (e) { btn.disabled = false; btn.textContent = '🎤 言ってみる'; }
}

// ---------- 画面
function render() {
  window.scrollTo(0, 0);
  ({ home: renderHome, lang: renderLang, study: renderStudy, intro: renderIntro, quiz: renderQuiz, done: renderDone, nanigo: renderNanigo })[S.screen]();
}
function go(screen, extra = {}) { if (TTS.ok) speechSynthesis.cancel(); S = { ...extra, screen }; render(); }
const back = to => `<button class="link" id="back">← ${to}</button>`;
const sayBtns = (lang, say) => `<span class="says"><button class="say" data-say="${esc(say)}" aria-label="聞く">🔊</button><button class="say slow" data-say="${esc(say)}" data-slow="1" aria-label="ゆっくり聞く">🐢</button></span>`;
function bindSay(lang) {
  app.querySelectorAll('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); TTS.speak(b.dataset.say, lang.tts, !!b.dataset.slow); });
}
function bindMic(lang) {
  app.querySelectorAll('[data-mic]').forEach(b => b.onclick = e => { e.stopPropagation(); listen(lang, b.dataset.mic, b, b.parentElement.querySelector('.heard')); });
}
const micHTML = target => SR ? `<div class="mic"><button class="micbtn" data-mic="${esc(target)}">🎤 言ってみる</button><span class="heard"></span></div>` : '';

function renderHome() {
  app.innerHTML = `
    <header class="mast" data-furi-slot><p class="eyebrow">いろんな国のことば</p><h1>せかいの<span>ことば</span></h1>
      <p class="muted">文字の読み方から、単語・かんたんな文まで。音を聞いて、まねして言ってみよう。</p></header>
    <div class="langs">${LANGS.map(l => {
      const all = langItems(l), got = all.filter(({ u, i }) => learned(itemId(l, u, i))).length;
      return `<button class="langcard" data-lang="${l.id}" style="--lc:${l.color}">
        <span class="hello" style="font-family:${l.font}">${esc(l.hello)}</span>
        <b>${esc(l.name)} <small style="font-family:${l.font}">${esc(l.native)}</small></b>
        <span class="track"><i style="width:${all.length ? got / all.length * 100 : 0}%"></i></span>
        <span class="small muted">覚えた ${got} / ${all.length}</span></button>`;
    }).join('')}</div>
    ${window.NANIGO ? `<button class="mission" id="nanigo"><b>なに語? クイズ</b><span>${window.NANIGO.length}の言語から、見た目と音で当てよう</span></button>` : ''}
    <p class="small muted">ほかの言語は、これから順番に追加します。</p>
    <p class="foot small muted">音声は、この端末に入っている読み上げの声を使います。記録はこの端末のブラウザに保存されます。</p>`;
  app.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => go('lang', { lang: b.dataset.lang }));
  const ng = app.querySelector('#nanigo'); if (ng) ng.onclick = () => startNanigo();
}

function renderLang() {
  const lang = langOf(S.lang);
  const due = dueOf(lang);
  const noVoice = TTS.ok && TTS.voices.length && !TTS.has(lang.tts);
  app.innerHTML = `
    <div class="bar">${back('ホーム')}<span class="small muted">${esc(lang.name)}</span></div>
    <h2 class="lh" style="--lc:${lang.color}">${esc(lang.name)} ${ko(lang, esc(lang.native))}</h2>
    ${!TTS.ok || noVoice ? `<p class="warn">この端末には${esc(lang.name)}の読み上げの声が見つかりません。端末の設定(読み上げ・テキスト読み上げ)で${esc(lang.name)}の音声を追加すると、音が聞けます。</p>` : ''}
    ${due.length ? `<button class="mission" id="review"><b>今日の復習 ${Math.min(10, due.length)}問</b><span>前にやった問題から、そろそろ忘れそうなものを出します</span></button>` : ''}
    ${GROUPS.map(([gid, gname, kinds]) => {
      const us = lang.units.filter(u => kinds.includes(u.kind));
      return `<section class="group"><h3>${gname}</h3><div class="units">${us.map(u => {
        const r = unitRatio(lang, u);
        return `<button class="unit" data-unit="${u.id}"><span><b>${esc(u.title)}</b><small>${esc(u.sub || '')}</small></span>
          ${u.items ? `<span class="pct">${Math.round(r * 100)}%</span>` : '<span class="pct">読む</span>'}</button>`;
      }).join('')}</div></section>`;
    }).join('')}`;
  app.querySelector('#back').onclick = () => go('home');
  const rv = app.querySelector('#review');
  if (rv) rv.onclick = () => startQuiz(lang, null);
  app.querySelectorAll('[data-unit]').forEach(b => b.onclick = () => {
    const u = unitOf(lang, b.dataset.unit);
    go(u.kind === 'intro' ? 'intro' : 'study', { lang: lang.id, unit: u.id });
  });
}

// ハングルのしくみ(ブロックの組み立てを色分けで見せる)
function renderIntro() {
  const lang = langOf(S.lang), unit = unitOf(lang, S.unit);
  const nextU = lang.units[lang.units.indexOf(unit) + 1];
  if (unit.body) return renderIntroBody(lang, unit, nextU);
  const blk = (ch, parts, kana) => `<button class="blk" data-say="${ch}"><span class="big" style="font-family:${lang.font}">${ch}</span>
    <span class="eq">= ${parts.map(([p, c]) => `<i class="${c}" style="font-family:${lang.font}">${p}</i>`).join(' + ')}</span><span class="small muted">${kana} 🔊</span></button>`;
  app.innerHTML = `
    <div class="bar">${back(esc(lang.name))}</div>
    <h2>ハングルのしくみ</h2>
    <p>ハングルは、<b class="cC">子音</b>と<b class="cV">母音</b>を組み合わせて、<b>1つの四角いブロック</b>で1つの音(1文字)を書きます。</p>
    <div class="blks">${blk('가', [['ㄱ', 'cC'], ['ㅏ', 'cV']], 'カ')}${blk('나', [['ㄴ', 'cC'], ['ㅏ', 'cV']], 'ナ')}</div>
    <p><b>たて長の母音</b>(ㅏ ㅓ ㅣ …)は子音の<b>右</b>に、<b>横長の母音</b>(ㅗ ㅜ ㅡ …)は子音の<b>下</b>に書きます。</p>
    <div class="blks">${blk('고', [['ㄱ', 'cC'], ['ㅗ', 'cV']], 'コ')}${blk('누', [['ㄴ', 'cC'], ['ㅜ', 'cV']], 'ヌ')}</div>
    <p>さらに下に子音がつくことがあります。下の子音を<b class="cP">パッチム</b>といいます。</p>
    <div class="blks">${blk('한', [['ㅎ', 'cC'], ['ㅏ', 'cV'], ['ㄴ', 'cP']], 'ハン')}${blk('국', [['ㄱ', 'cC'], ['ㅜ', 'cV'], ['ㄱ', 'cP']], 'クク')}</div>
    <p>2つ合わせると <button class="inl" data-say="한국" style="font-family:${lang.font}">한국 🔊</button>(ハングク)=「韓国」。</p>
    <p class="box small">ハングルは、朝鮮王朝の世宗(セジョン)大王のもとで1443年に作られ、1446年に「訓民正音(フンミンジョンウム)」として発表されました。音を出すときの口や舌の形をもとに、文字の形が考えられています(たとえば ㄱ は、舌のつけねがのどをふさぐ形)。</p>
    <button class="primary" id="next">次へ: ${esc(nextU.title)}</button>`;
  bindSay(lang);
  app.querySelectorAll('.blk').forEach(b => b.onclick = () => TTS.speak(b.dataset.say, lang.tts));
  app.querySelector('#back').onclick = () => go('lang', { lang: lang.id });
  app.querySelector('#next').onclick = () => go('study', { lang: lang.id, unit: nextU.id });
}
// body: { p: 説明(HTML、データ側で書いた固定の文) } / { ex: [[ことば, カタカナ, 意味], …] }
function renderIntroBody(lang, unit, nextU) {
  app.innerHTML = `
    <div class="bar">${back(esc(lang.name))}</div>
    <h2>${esc(unit.title)}</h2>
    ${unit.body.map(b => b.p ? `<p>${b.p}</p>` : `<div class="list">${b.ex.map(([t, kana, ja]) => `<div class="row"><div class="rt">${ko(lang, esc(t), 'mid')}${sayBtns(lang, t)}</div><div><b>${esc(kana)}</b> ・ ${esc(ja)}</div></div>`).join('')}</div>`).join('')}
    <button class="primary" id="next">次へ: ${esc(nextU.title)}</button>`;
  bindSay(lang);
  app.querySelector('#back').onclick = () => go('lang', { lang: lang.id });
  app.querySelector('#next').onclick = () => go('study', { lang: lang.id, unit: nextU.id });
}

// 見て聞く(一覧)
function renderStudy() {
  const lang = langOf(S.lang), unit = unitOf(lang, S.unit);
  let body = '';
  if (unit.kind === 'letters' || unit.kind === 'patchim') {
    body = `<div class="cards">${unit.items.map(it => `
      <button class="card" data-say="${esc(it.say)}">
        <span class="big" style="font-family:${lang.font}">${esc(it.t)}</span>
        <b>${esc(it.kana)}</b>${it.ja ? `<span class="small">${esc(it.ja)}</span>` : ''}
        ${unit.with ? `<span class="small muted" style="font-family:${lang.font}">${esc(it.say)} の音</span>` : ''}
        ${it.ex ? `<span class="small" style="font-family:${lang.font}">例: ${esc(it.ex)}</span>` : ''}<span class="small muted">${esc(it.note)}</span></button>`).join('')}</div>
      ${unit.compare ? `<h3>くらべて聞こう</h3><p class="small muted">ふつうの音・息を強く出す音・つまる音</p><div class="cmp">${unit.compare.map(g => `<div>${g.map(s => `<button data-say="${s}" style="font-family:${lang.font}">${s}</button>`).join('')}</div>`).join('')}</div>` : ''}`;
  } else if (unit.kind === 'syllables') {
    // 反切表: たてに子音、横に母音。マスをタップすると読む
    body = `<p class="small muted">マスをタップすると音が聞けます。たてに子音、横に母音。</p>
      <div class="grid-wrap"><table class="hb" style="font-family:${lang.font}"><tr><th></th>${unit.vows.map(v => `<th class="cV">${v}</th>`).join('')}</tr>
      ${unit.cons.map(c => `<tr><th class="cC">${c}</th>${unit.items.filter(i => i.c === c).map(i => `<td><button data-say="${i.say}">${i.t}</button></td>`).join('')}</tr>`).join('')}</table></div>`;
  } else {
    body = `<div class="list">${unit.items.map(it => `
      <div class="row">
        <div class="rt">${ko(lang, esc(it.t), 'mid')}${sayBtns(lang, it.say)}</div>
        <div><b>${esc(it.ja)}</b></div><div class="muted small">${esc(it.kana)}</div>
        ${it.tiles && it.tiles.length > 1 ? `<div class="gloss">${it.tiles.map(([k, j]) => `<span>${ko(lang, esc(k))}<small>${esc(j)}</small></span>`).join('')}</div>` : ''}
        ${it.note ? `<div class="small muted">${esc(it.note)}</div>` : ''}
        ${micHTML(it.t)}
      </div>`).join('')}</div>`;
  }
  app.innerHTML = `
    <div class="bar">${back(esc(lang.name))}<span class="small muted">覚えた ${Math.round(unitRatio(lang, unit) * 100)}%</span></div>
    <h2>${esc(unit.title)}</h2>
    ${unit.kind === 'syllables' ? '' : `<p class="muted small">${unit.kind === 'words' || unit.kind === 'sentences' ? (SR ? '🔊で聞いて、🎤でまねして言ってみよう。' : '🔊で聞いて、まねして言ってみよう。') : 'タップすると音が聞けます。'}</p>`}
    ${body}
    <button class="primary sticky" id="quiz">クイズ 10問</button>`;
  bindSay(lang); bindMic(lang);
  app.querySelector('#back').onclick = () => go('lang', { lang: lang.id });
  app.querySelector('#quiz').onclick = () => startQuiz(lang, unit);
}

// ---------- クイズ
// unit が null のときは、言語全体から復習の時期が来た問題を出す
function startQuiz(lang, unit) {
  let pool;
  if (unit) {
    const its = unit.items.map(i => ({ u: unit, i }));
    const id = x => itemId(lang, x.u, x.i);
    const dueI = shuffle(its.filter(x => P[id(x)] && P[id(x)].d <= today()));
    const fresh = shuffle(its.filter(x => !P[id(x)]));
    const rest = shuffle(its.filter(x => P[id(x)] && P[id(x)].d > today() && !learned(id(x))));
    const done = shuffle(its.filter(x => learned(id(x)) && P[id(x)].d > today()));
    pool = [...dueI, ...fresh, ...rest, ...done].slice(0, 10);
  } else pool = shuffle(dueOf(lang)).slice(0, 10);
  const qs = pool.map(x => makeQ(lang, x.u, x.i)).filter(Boolean);
  go('quiz', { lang: lang.id, unit: unit ? unit.id : null, qs, i: 0, score: 0 });
}
const TYPES = { letters: ['see', 'hear'], patchim: ['see', 'hear'], syllables: ['hear', 'build'], words: ['see', 'mean', 'hear'], sentences: ['see', 'arrange', 'hear'] };
function others(unit, it, n, key) {
  // 正解と同じ「音」や「意味」のものは選択肢に入れない
  const k = x => (key === 'snd' ? x.snd || x.kana : x[key]);
  const seen = new Set([k(it)]), out = [];
  for (const x of shuffle(unit.items)) { if (out.length >= n) break; if (!seen.has(k(x))) { seen.add(k(x)); out.push(x); } }
  return out;
}
function makeQ(lang, unit, it) {
  let types = unit.types || TYPES[unit.kind];
  if (unit.kind === 'sentences' && it.tiles.length < 2) types = ['see', 'hear'];
  const type = types[Math.floor(Math.random() * types.length)];
  const q = { uid: unit.id, it, type };
  if (type === 'build') {
    q.cons = shuffle([it.c, ...shuffle(unit.cons.filter(c => c !== it.c)).slice(0, 3)]);
    q.vows = shuffle([it.v, ...shuffle(unit.vows.filter(v => v !== it.v)).slice(0, 3)]);
    return q;
  }
  if (type === 'arrange') { q.tiles = shuffle(it.tiles.map((t, k) => ({ k, t: t[0] }))); return q; }
  if (unit.kind === 'syllables') {
    // 聞いて選ぶ: 子音が同じで母音がちがう字2つ+母音が同じで子音がちがう字1つ
    const sameC = shuffle(unit.items.filter(x => x.c === it.c && x.v !== it.v)).slice(0, 2);
    const sameV = shuffle(unit.items.filter(x => x.v === it.v && x.c !== it.c)).slice(0, 1);
    q.opts = shuffle([it, ...sameC, ...sameV]).map(x => ({ label: x.t, ok: x === it, ko: true }));
    return q;
  }
  const g = unit.compare && type === 'hear' && unit.compare.find(gr => gr.includes(it.say));
  if (g) {
    // 濃音: 가・카・까 のように、まぎらわしい音どうしで選ぶ(싸 のように組がない字は、ふつうの「聞いて選ぶ」)
    const extra = shuffle(unit.items.filter(x => !g.includes(x.say))).slice(0, 1).map(x => x.say);
    q.opts = shuffle([...g, ...extra]).map(s => ({ label: s, ok: s === it.say, ko: true }));
    return q;
  }
  const key = unit.kind === 'letters' || unit.kind === 'patchim' ? 'snd' : 'ja';
  const os = [it, ...others(unit, it, 3, key)];
  if (type === 'see') q.opts = shuffle(os).map(x => ({ label: unit.kind === 'letters' || unit.kind === 'patchim' ? x.kana : x.ja, ok: x === it }));
  else if (type === 'mean') q.opts = shuffle(os).map(x => ({ label: x.t, ok: x === it, ko: true }));
  else if (unit.kind === 'sentences') q.opts = shuffle(os).map(x => ({ label: x.ja, ok: x === it }));
  else q.opts = shuffle(os).map(x => ({ label: x.t, ok: x === it, ko: true }));
  return q;
}
function renderQuiz() {
  const lang = langOf(S.lang), q = S.qs[S.i];
  if (!q) return go('lang', { lang: lang.id });
  const it = q.it, unit = unitOf(lang, q.uid);
  const total = S.qs.length;
  let prompt = '', main = '', choices = '';
  const big = `<div class="qbig">${ko(lang, esc(it.t), it.t.length > 6 ? 'long' : '')}</div>`;
  const hearBox = `<div class="qhear"><button class="say huge" data-say="${esc(it.say)}">🔊</button><button class="say slow" data-say="${esc(it.say)}" data-slow="1">🐢 ゆっくり</button></div>`;
  if (q.type === 'see') { prompt = unit.kind === 'letters' ? 'この文字の音は?' : unit.kind === 'patchim' ? 'この言葉の読み方は?' : 'どういう意味?'; main = big; }
  if (q.type === 'mean') { prompt = `「${esc(it.ja)}」は${esc(lang.name)}で?`; }
  if (q.type === 'hear') { prompt = unit.kind === 'sentences' ? '聞いて、意味をえらぼう' : '聞こえたのはどれ?'; main = hearBox; }
  if (q.type === 'build') { prompt = '聞こえた文字を組み立てよう'; main = hearBox + `<div class="built" id="built">${ko(lang, '?', 'mid')}</div>`; }
  if (q.type === 'arrange') { prompt = `ならべて「${esc(it.ja)}」にしよう`; main = hearBox + `<div class="line" id="line"></div>`; }
  if (q.opts) choices = `<div class="choices">${q.opts.map((o, k) => `<button class="choice" data-k="${k}">${o.ko ? ko(lang, esc(o.label), 'mid') : esc(o.label)}</button>`).join('')}</div>`;
  if (q.type === 'build') choices = `<p class="small muted">子音</p><div class="pick" id="pc">${q.cons.map(c => `<button data-c="${c}" style="font-family:${lang.font}">${c}</button>`).join('')}</div>
    <p class="small muted">母音</p><div class="pick" id="pv">${q.vows.map(v => `<button data-v="${v}" style="font-family:${lang.font}">${v}</button>`).join('')}</div>
    <button class="primary" id="ok" disabled>これで決定</button>`;
  if (q.type === 'arrange') choices = `<div class="tiles" id="tiles">${q.tiles.map((t, k) => `<button data-t="${k}">${ko(lang, esc(t.t))}</button>`).join('')}</div>`;
  app.innerHTML = `
    <div class="bar"><button class="link" id="quit">✕ やめる</button><span class="small muted num">${S.i + 1} / ${total}</span></div>
    <div class="track"><i style="width:${S.i / total * 100}%"></i></div>
    <section class="qcard"><span class="tag">${esc(unit.title)}</span><p class="qtext">${prompt}</p>${main}${choices}<div id="after"></div></section>`;
  bindSay(lang);
  app.querySelector('#quit').onclick = () => go(S.unit ? 'study' : 'lang', { lang: lang.id, unit: S.unit });
  if (q.type === 'hear' || q.type === 'build' || q.type === 'arrange') setTimeout(() => TTS.speak(it.say, lang.tts), 250);
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => answer(q.opts[+b.dataset.k].ok, b));
  if (q.type === 'build') {
    const pick = { c: null, v: null };
    const upd = () => {
      app.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === pick.c));
      app.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === pick.v));
      const s = pick.c && pick.v ? unit.items.find(x => x.c === pick.c && x.v === pick.v) : null;
      app.querySelector('#built').innerHTML = ko(lang, s ? esc(s.t) : esc((pick.c || '') + (pick.v || '') || '?'), 'mid');
      if (s) TTS.speak(s.say, lang.tts);
      app.querySelector('#ok').disabled = !s;
    };
    app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { pick.c = b.dataset.c; upd(); });
    app.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { pick.v = b.dataset.v; upd(); });
    app.querySelector('#ok').onclick = () => answer(pick.c === it.c && pick.v === it.v, null);
  }
  if (q.type === 'arrange') {
    const placed = [];
    const draw = () => {
      app.querySelector('#line').innerHTML = placed.length ? placed.map((t, n) => `<button data-p="${n}">${ko(lang, esc(t.t))}</button>`).join('') : '<span class="small muted">下のことばを順にタップ</span>';
      app.querySelectorAll('[data-t]').forEach(b => { b.hidden = placed.some(p => p === q.tiles[+b.dataset.t]); });
      app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { placed.splice(+b.dataset.p, 1); draw(); });
      if (placed.length === q.tiles.length) answer(placed.every((t, n) => t.t === it.tiles[n][0]), null);
    };
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { placed.push(q.tiles[+b.dataset.t]); draw(); });
    draw();
  }
}
function answer(ok, btn) {
  const lang = langOf(S.lang), q = S.qs[S.i], it = q.it, unit = unitOf(lang, q.uid);
  if (S.answered === S.i) return;
  S.answered = S.i;
  record(itemId(lang, unit, it), ok);
  if (ok) S.score++;
  SE.play(ok ? 'ok' : 'ng');
  app.querySelectorAll('.choice, .pick button, .tiles button, .line button, #ok').forEach(b => b.disabled = true);
  if (q.opts) app.querySelectorAll('[data-k]').forEach(b => { const o = q.opts[+b.dataset.k]; if (o.ok) b.classList.add('ok'); else if (b === btn) b.classList.add('ng'); });
  const detail = `<div class="ans">${ko(lang, esc(it.t), 'mid')}${sayBtns(lang, it.say)}
    <div>${it.kana ? `<b>${esc(it.kana)}</b>` : ''}${it.rom && unit.kind === 'syllables' ? ` <span class="muted">(${esc(it.rom)})</span>` : ''}${it.ja ? ` ・ ${esc(it.ja)}` : ''}${it.ex ? ` ・ 例: ${ko(lang, esc(it.ex))}` : ''}</div>
    ${it.tiles && it.tiles.length > 1 ? `<div class="gloss">${it.tiles.map(([k, j]) => `<span>${ko(lang, esc(k))}<small>${esc(j)}</small></span>`).join('')}</div>` : ''}
    ${it.note ? `<div class="small muted">${esc(it.note)}</div>` : ''}</div>`;
  const last = S.i === S.qs.length - 1;
  const after = app.querySelector('#after');
  after.innerHTML = `<div class="verdict ${ok ? 'ok' : 'ng'}"><b>${ok ? '正解!' : 'ざんねん'}</b>${detail}</div>
    ${(unit.kind === 'words' || unit.kind === 'sentences') ? micHTML(it.t) : ''}
    <button class="primary" id="next">${last ? '結果を見る' : '次へ'}</button>`;
  bindSay(lang); bindMic(lang);
  setTimeout(() => TTS.speak(it.say, lang.tts), 350);
  const nx = after.querySelector('#next');
  nx.onclick = () => { if (last) finish(); else { S.i++; render(); } };
  after.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function finish() { SE.play('result'); go('done', { lang: S.lang, unit: S.unit, score: S.score, total: S.qs.length }); }
function renderDone() {
  const lang = langOf(S.lang), unit = S.unit ? unitOf(lang, S.unit) : null;
  const msg = S.score === S.total ? 'パーフェクト!' : S.score >= S.total * 0.7 ? 'よくできました!' : 'もう1回やると、もっと覚えられるよ';
  app.innerHTML = `
    <section class="qcard center"><p class="small muted">${unit ? esc(unit.title) : '今日の復習'}</p>
      <p class="score num">${S.score} / ${S.total}</p><p><b>${msg}</b></p>
      ${unit ? `<p class="small muted">この単元の覚えた割合: ${Math.round(unitRatio(lang, unit) * 100)}%</p>` : ''}</section>
    ${unit ? '<button class="primary" id="again">もう1回</button>' : ''}
    <button class="ghost" id="list">${unit ? '一覧にもどる' : esc(lang.name) + 'のメニューへ'}</button>`;
  const again = app.querySelector('#again');
  if (again) again.onclick = () => startQuiz(lang, unit);
  app.querySelector('#list').onclick = () => go(unit ? 'study' : 'lang', { lang: lang.id, unit: S.unit });
}

// ---------- なに語? クイズ(data/nanigo.js)
// 1問 = 1つのことば。選択肢は4つの言語名。答えのあとに「見分けるコツ」
function startNanigo() {
  const L = window.NANIGO;
  const pool = shuffle(L.flatMap(l => l.samples.map(s => ({ l, s })))).slice(0, 10);
  const qs = pool.map(({ l, s }) => {
    const near = (l.near || []).map(id => L.find(x => x.id === id)).filter(Boolean);
    const rest = shuffle(L.filter(x => x !== l && !near.includes(x)));
    const opts = shuffle([l, ...shuffle(near).slice(0, 1), ...rest].slice(0, 4));
    return { l, s, opts };
  });
  go('nanigo', { qs, i: 0, score: 0 });
}
function renderNanigo() {
  const q = S.qs[S.i], total = S.qs.length;
  if (!q) { SE.play('result'); return renderNanigoDone(); }
  const ngVoice = TTS.ok && TTS.has(q.l.tts);
  app.innerHTML = `
    <div class="bar"><button class="link" id="quit">✕ やめる</button><span class="small muted num">${S.i + 1} / ${total}</span></div>
    <div class="track"><i style="width:${S.i / total * 100}%"></i></div>
    <section class="qcard"><span class="tag">なに語?</span><p class="qtext">このことばは、なに語?</p>
      <div class="qbig"><span class="tl ${q.s.length > 8 ? 'long' : ''}" lang="${q.l.tts.slice(0, 2)}" dir="auto">${esc(q.s)}</span></div>
      ${ngVoice ? `<div class="qhear"><button class="say" id="ngsay">🔊 聞いてみる</button></div>` : ''}
      <div class="choices">${q.opts.map((o, k) => `<button class="choice" data-k="${k}">${esc(o.name)}</button>`).join('')}</div>
      <div id="after"></div></section>`;
  app.querySelector('#quit').onclick = () => go('home');
  const sb = app.querySelector('#ngsay'); if (sb) sb.onclick = () => TTS.speak(q.s, q.l.tts);
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    if (S.answered === S.i) return; S.answered = S.i;
    const ok = q.opts[+b.dataset.k] === q.l; if (ok) S.score++;
    SE.play(ok ? 'ok' : 'ng');
    app.querySelectorAll('[data-k]').forEach(x => { x.disabled = true; if (q.opts[+x.dataset.k] === q.l) x.classList.add('ok'); else if (x === b) x.classList.add('ng'); });
    const after = app.querySelector('#after');
    after.innerHTML = `<div class="verdict ${ok ? 'ok' : 'ng'}"><b>${ok ? '正解!' : 'ざんねん'}</b><div><b>${esc(q.l.name)}</b>(${esc(q.l.native)})</div><div class="small">見分けるコツ: ${esc(q.l.tip)}</div></div>
      <button class="primary" id="next">${S.i === total - 1 ? '結果を見る' : '次へ'}</button>`;
    if (ngVoice) setTimeout(() => TTS.speak(q.s, q.l.tts), 300);
    after.querySelector('#next').onclick = () => { S.i++; renderNanigo(); };
    after.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}
function renderNanigoDone() {
  app.innerHTML = `
    <section class="qcard center"><p class="small muted">なに語? クイズ</p><p class="score num">${S.score} / ${S.qs.length}</p>
      <p><b>${S.score === S.qs.length ? 'パーフェクト!' : S.score >= 7 ? 'よく見分けられたね!' : 'コツを思い出して、もう1回!'}</b></p></section>
    <button class="primary" id="again">もう1回</button><button class="ghost" id="home">ホームへ</button>`;
  app.querySelector('#again').onclick = () => startNanigo();
  app.querySelector('#home').onclick = () => go('home');
}

render();
