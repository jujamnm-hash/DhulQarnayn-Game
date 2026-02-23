/* ══════════════════════════════════════════════
   main.js  —  دەستپێکردن و منیوی سەرەکی
   ══════════════════════════════════════════════ */
'use strict';

/* ─── Global screen manager ─── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
window.showScreen = showScreen;

/* ─── Main init ─── */
document.addEventListener('DOMContentLoaded', () => {

  /* Boot game engine (renderer + scene created, loop started) */
  const game = new Game();
  game.ui    = new UI();
  game.init();
  game.start();  /* Render loop begins (nothing visible yet until level loads) */

  /* Ensure save state is applied after DOM is ready */
  game._loadSave();

  /* ════════  MAIN MENU BUTTONS  ════════ */
  const _click = () => game.audio && game.audio.play('ui_click', { volume: 0.6 });

  document.getElementById('btn-start').addEventListener('click', () => {
    _click();
    showScreen('game-screen');
    game.loadChapter(1);
  });

  document.getElementById('btn-chapters').addEventListener('click', () => {
    _click(); showScreen('chapter-screen');
  });

  document.getElementById('btn-lore').addEventListener('click', () => {
    _click(); showScreen('lore-screen');
    _buildVerseGallery();
  });

  function _buildVerseGallery() {
    const gallery = document.getElementById('verse-gallery');
    const countEl = document.getElementById('gallery-count');
    if (!gallery) return;

    /* All verses defined in NARRATIVE */
    const known = [];
    ['ch1','ch2','ch3'].forEach(k => {
      const ch = (typeof NARRATIVE !== 'undefined') && NARRATIVE[k];
      if (ch && ch.verses) ch.verses.forEach(v => {
        if (!known.find(x => x.ref === v.ref)) known.push(v);
      });
    });

    /* Collected verses from localStorage */
    let collected = [];
    try { collected = JSON.parse(localStorage.getItem('dq_verses') || '[]'); } catch (e) {}

    gallery.innerHTML = '';
    known.forEach(v => {
      const found = collected.find(c => c.ref === v.ref);
      const card = document.createElement('div');
      card.className = 'gallery-card' + (found ? '' : ' locked');
      card.innerHTML = `
        <div class="gc-ar">${found ? v.ar : '○ ○ ○'}</div>
        ${found ? `<div class="gc-ku">${v.ku}</div>` : ''}
        <div class="gc-ref">${v.ref}</div>
      `;
      gallery.appendChild(card);
    });
    if (countEl) countEl.textContent = `کۆڵکراو: ${collected.length} / ${known.length}`;
  }

  document.getElementById('btn-settings').addEventListener('click', () => {
    _click(); showScreen('settings-screen');
  });

  /* ════════  CHAPTER CARDS — event delegation ════════ */
  document.querySelector('.chapters-grid').addEventListener('click', e => {
    const card = e.target.closest('.chapter-card');
    if (!card || card.classList.contains('locked')) return;
    _click();
    const ch = parseInt(card.dataset.chapter);
    showScreen('game-screen');
    game.loadChapter(ch);
  });

  /* ch1 always unlocked on chapter screen open */
  document.getElementById('btn-chapters').addEventListener('click', () => {
    const c1 = document.querySelector('[data-chapter="1"]');
    if (c1) c1.classList.remove('locked');
  });

  /* ════════  BACK BUTTONS  ════════ */
  document.getElementById('btn-back-chapters').addEventListener('click', () => showScreen('main-menu'));
  document.getElementById('btn-back-lore').addEventListener('click',     () => showScreen('main-menu'));
  document.getElementById('btn-back-settings').addEventListener('click', () => showScreen('main-menu'));

  /* ════════  SETTINGS  ════════ */

  /* Load persisted settings from localStorage */
  (function _loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('dq_settings') || '{}');
      if (saved.quality) {
        const el = document.getElementById('setting-quality');
        if (el) el.value = saved.quality;
        window._settings.quality = saved.quality;
        game.renderer.setPixelRatio(
          saved.quality === 'ultra'  ? window.devicePixelRatio :
          saved.quality === 'high'   ? Math.min(window.devicePixelRatio, 2) :
          saved.quality === 'medium' ? 1.0 : 0.75
        );
      }
      if (saved.volume !== undefined) {
        const el = document.getElementById('setting-volume');
        if (el) el.value = saved.volume;
        window._settings.volume = saved.volume;
        game.audio && game.audio.setVolume(saved.volume);
      }
      if (saved.sensitivity !== undefined) {
        const el = document.getElementById('setting-sensitivity');
        if (el) el.value = saved.sensitivity;
        window._settings.sensitivity = saved.sensitivity;
      }
      if (saved.fov !== undefined) {
        const el = document.getElementById('setting-fov');
        if (el) el.value = saved.fov;
        window._settings.fov = saved.fov;
        game.camera && (game.camera.fov = saved.fov) && game.camera.updateProjectionMatrix();
      }
    } catch (e) { /* ignore */ }
  })();

  function _saveSettings() {
    try {
      localStorage.setItem('dq_settings', JSON.stringify(window._settings));
    } catch (e) { /* ignore */ }
  }

  document.getElementById('setting-quality').addEventListener('change', e => {
    window._settings.quality = e.target.value;
    game.renderer.setPixelRatio(
      e.target.value === 'ultra' ? window.devicePixelRatio :
      e.target.value === 'high'  ? Math.min(window.devicePixelRatio, 2) :
      e.target.value === 'medium' ? 1.0 : 0.75
    );
    _saveSettings();
  });
  /* Wire volume to AudioEngine */
  document.getElementById('setting-volume').addEventListener('input', e => {
    window._settings.volume = +e.target.value;
    game.audio && game.audio.setVolume(+e.target.value);
    _saveSettings();
  });

  /* ════════  ANIMATED MENU BACKGROUND  ════════ */
  _animateMenuBg();

  /* ════════  AUDIO AMBIENT  ════════ */
  _initAmbientAudio();

  /* Show main menu initially */
  showScreen('main-menu');

  /* Auto-hide key hints after 15s of gameplay */
  document.addEventListener('keydown', () => {
    const hints = document.getElementById('key-hints');
    if (!hints) return;
    clearTimeout(window._hintTimer);
    hints.style.opacity = '0.4';
    window._hintTimer = setTimeout(() => { hints.style.opacity = '0'; }, 15000);
  }, { once: true });
});

/* ─── Menu background particle canvas ─── */
function _animateMenuBg() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.6';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.getElementById('main-menu').appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vy: -(0.2 + Math.random() * 0.6),
    vx: (Math.random() - 0.5) * 0.2,
    r: 0.8 + Math.random() * 2,
    a: 0.1 + Math.random() * 0.5,
    col: Math.random() > 0.5 ? '#c9a84c' : '#ff8822'
  }));

  function frame() {
    if (!document.getElementById('main-menu').classList.contains('active')) {
      requestAnimationFrame(frame); return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.col;
      ctx.globalAlpha = p.a;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  frame();

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

/* ─── Ambient audio using Web Audio API (synthesized tones) ─── */
function _initAmbientAudio() {
  let audioCtx, gainNode, started = false;

  function startAmbient() {
    if (started) return;
    started = true;
    try {
      audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
      gainNode  = audioCtx.createGain();
      gainNode.gain.value = 0.06;
      gainNode.connect(audioCtx.destination);

      /* Low drone */
      _createDrone(audioCtx, gainNode, 55, 0.04);
      _createDrone(audioCtx, gainNode, 82.5, 0.025);
      _createDrone(audioCtx, gainNode, 110, 0.018);

      /* Slow LFO modulation */
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value  = 0.03;
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      lfo.start();
    } catch (e) { /* Audio blocked */ }
  }

  /* Start on first interaction */
  ['click', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, startAmbient, { once: true })
  );
}

function _createDrone(ctx, dest, freq, amp) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = amp;
  osc.connect(gain);
  gain.connect(dest);
  osc.start();
  /* Slow frequency wobble */
  const wobble = ctx.createOscillator();
  const wobGain = ctx.createGain();
  wobble.frequency.value = 0.04 + Math.random() * 0.08;
  wobGain.gain.value = 0.2;
  wobble.connect(wobGain);
  wobGain.connect(osc.frequency);
  wobble.start();
}
