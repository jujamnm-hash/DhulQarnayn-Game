/* ══════════════════════════════════════════════
   ui.js  —  HUD  و  منیو  کۆنترۆل
   ══════════════════════════════════════════════ */
'use strict';

class UI {
  constructor() {
    this.$ = id => document.getElementById(id);

    /* Cache elements */
    this.dialogueBox     = this.$('dialogue-box');
    this.dialogueSpeaker = this.$('dialogue-speaker');
    this.dialogueText    = this.$('dialogue-text');
    this.dialogueArabic  = this.$('dialogue-arabic');
    this.dialoguePortrait= this.$('dialogue-portrait');
    this.versePopup      = this.$('verse-popup');
    this.interactPrompt  = this.$('interact-prompt');
    this.chapterIntro    = this.$('chapter-intro');
    this.objText         = this.$('obj-text');
    this.capIndicator    = this.$('chapter-indicator');
    this.pauseMenu       = this.$('pause-menu');
    this.notification    = this._createNotification();
    this.hitFlash        = this._createHitFlash();
    this.minimap         = this._createMinimap();
    this.vignette        = this._createVignette();

    this._verseTimer     = null;
    this._notifTimer     = null;
  }

  /* ─── Notifications ─── */
  _createNotification() {
    let el = document.getElementById('notification');
    if (!el) {
      el = document.createElement('div');
      el.id = 'notification';
      document.getElementById('game-screen').appendChild(el);
    }
    return el;
  }
  _createHitFlash() {
    let el = document.getElementById('hit-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hit-flash';
      document.getElementById('game-screen').appendChild(el);
    }
    return el;
  }

  _createMinimap() {
    let el = document.getElementById('minimap');
    if (!el) {
      el = document.createElement('div');
      el.id = 'minimap';
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 120;
      el.appendChild(canvas);
      document.getElementById('hud').appendChild(el);
    }
    return el;
  }

  _createVignette() {
    let el = document.getElementById('vignette');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vignette';
      document.getElementById('game-screen').appendChild(el);
    }
    return el;
  }

  /* ─── Chapter indicator ─── */
  setChapter(num, name) {
    if (this.capIndicator)
      this.capIndicator.textContent = `بەش ${['I','II','III'][num - 1]}  —  ${name}`;
  }

  /* ─── Objective ─── */
  setObjective(text) {
    if (this.objText) this.objText.textContent = text;
  }

  /* ─── Chapter intro cinematic ─── */
  showChapterIntro(numeral, name, desc, cb) {
    const el = this.chapterIntro;
    if (!el) return;
    this.$('ci-num').textContent  = numeral;
    this.$('ci-name').textContent = name;
    this.$('ci-desc').textContent = desc;
    el.classList.remove('hidden');
    setTimeout(() => {
      el.classList.add('hidden');
      cb && cb();
    }, 4200);
  }

  /* ─── Dialogue ─── */
  showDialogue(speaker, icon, kuText, arText) {
    const b = this.dialogueBox;
    if (!b) return;
    b.classList.remove('hidden');
    this.dialogueSpeaker.textContent = speaker;
    this.dialoguePortrait.textContent = icon;
    this.dialogueText.textContent = kuText;
    this.dialogueArabic.textContent = arText || '';
    /* Determine voice profile from icon */
    const charType =
      icon === '👑' ? 'king' :
      icon === '👺' ? 'oppressor' :
      icon === '⚒️'  ? 'ironsmith' :
      icon === '🧓' || icon === '🧔' ? 'elder' : 'villager';
    this._typeText(this.dialogueText, kuText, charType);
    /* Cinematic letterbox during dialogue */
    this.showLetterbox();
  }

  hideDialogue() {
    if (this.dialogueBox) this.dialogueBox.classList.add('hidden');
    /* Remove cinematic bars when dialogue ends */
    this.hideLetterbox();
  }

  _typeText(el, text, charType = 'villager', speed = 28) {
    el.textContent = '';
    let i = 0, beepCount = 0;
    const interval = setInterval(() => {
      el.textContent += text[i++];
      beepCount++;
      /* Voice beep every 3 chars, skip spaces */
      if (beepCount >= 3 && text[i - 1] !== ' ' && text[i - 1] !== '\n') {
        beepCount = 0;
        window._audio && window._audio.playVoiceBeep(charType);
      }
      if (i >= text.length) clearInterval(interval);
    }, speed);
  }

  /* ─── Verse popup ─── */
  showVerse(ar, ku, ref, duration = 6000) {
    const vp = this.versePopup;
    if (!vp) return;
    this.$('verse-ar').textContent    = ar;
    this.$('verse-trans').textContent = ku;
    this.$('verse-ref-pop').textContent = ref;
    vp.classList.remove('hidden');
    clearTimeout(this._verseTimer);
    this._verseTimer = setTimeout(() => vp.classList.add('hidden'), duration);
  }

  /* ─── Interact prompt ─── */
  showInteract(label) {
    if (!this.interactPrompt) return;
    this.interactPrompt.textContent = label || '[ E ] چالاکی';
    this.interactPrompt.classList.remove('hidden');
  }
  hideInteract() {
    this.interactPrompt && this.interactPrompt.classList.add('hidden');
  }

  /* ─── Notification ─── */
  showNotification(msg, duration = 4000) {
    const el = this.notification;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  /* ─── Quest Tracker ─── */
  setQuests(quests) {
    const list = document.getElementById('qt-list');
    if (!list) return;
    list.innerHTML = '';
    quests.forEach(q => {
      const div = document.createElement('div');
      div.className = 'qt-item' + (q.done ? ' done' : q.active ? ' active' : '');
      div.textContent = q.text;
      list.appendChild(div);
    });
  }

  /* ─── Area Label ─── */
  showAreaLabel(text) {
    let el = document.getElementById('area-label');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    /* restart animation */
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
    clearTimeout(this._areaTimer);
    this._areaTimer = setTimeout(() => el.classList.add('hidden'), 3500);
  }

  /* ─── Stamina bar ─── */
  setStamina(pct) {
    const fill = document.getElementById('stamina-fill');
    const val  = document.getElementById('stamina-val');
    if (fill) fill.style.width = pct + '%';
    if (val)  val.textContent  = Math.round(pct);
  }

  /* ─── Pause menu ─── */
  showPause() { this.pauseMenu && this.pauseMenu.classList.remove('hidden'); }
  hidePause() { this.pauseMenu && this.pauseMenu.classList.add('hidden'); }

  /* ─── Minimap draw ─── */
  updateMinimap(playerPos, npcs, triggers, enemies) {
    const canvas = this.minimap.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 120, scale = 0.5;
    ctx.clearRect(0, 0, W, W);

    /* BG */
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(W/2, W/2, W/2, 0, Math.PI * 2);
    ctx.fill();

    const toMapX = x => W / 2 + (x - playerPos.x) * scale;
    const toMapY = z => W / 2 + (z - playerPos.z) * scale;

    /* Triggers */
    if (triggers) {
      triggers.forEach(t => {
        if (t.fired) return;
        const mx = toMapX(t.pos.x);
        const my = toMapY(t.pos.z);
        if (mx > 0 && mx < W && my > 0 && my < W) {
          ctx.strokeStyle = 'rgba(201,168,76,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(mx, my, t.radius * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    /* NPCs as gold dots */
    if (npcs) {
      npcs.forEach(n => {
        const mx = toMapX(n.mesh.position.x);
        const my = toMapY(n.mesh.position.z);
        if (mx > 0 && mx < W && my > 0 && my < W) {
          ctx.fillStyle = '#f0d080';
          ctx.beginPath();
          ctx.arc(mx, my, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    /* Enemies as red dots (pulsing if alive) */
    if (enemies) {
      const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.4;
      enemies.forEach(e => {
        if (!e.alive || !e.mesh.visible) return;
        const mx = toMapX(e.mesh.position.x);
        const my = toMapY(e.mesh.position.z);
        if (mx > 0 && mx < W && my > 0 && my < W) {
          ctx.fillStyle = `rgba(255,40,20,${pulse})`;
          ctx.beginPath();
          ctx.arc(mx, my, 4, 0, Math.PI * 2);
          ctx.fill();
          /* Aggro indicator ring if chasing */
          if (e.state === 'chase' || e.state === 'attack') {
            ctx.strokeStyle = `rgba(255,100,0,${pulse * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(mx, my, 7, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
    }

    /* Player dot */
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(W/2, W/2, 4, 0, Math.PI * 2);
    ctx.fill();
    /* Player direction indicator */
    if (window._game && window._game.player) {
      const yaw = window._game.player.yaw;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W/2, W/2);
      ctx.lineTo(W/2 - Math.sin(yaw) * 8, W/2 - Math.cos(yaw) * 8);
      ctx.stroke();
    }

    /* Clip to circle */
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(W/2, W/2, W/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ─── Loading bar ─── */
  setLoading(pct) {
    const fill = document.getElementById('loading-fill');
    if (fill) fill.style.width = pct + '%';
  }

  hideLoading() {
    const ov = document.getElementById('loading-overlay');
    if (ov) ov.classList.add('hidden');
  }

  /* ─── Iron counter (Ch3) ─── */
  showIronCounter(needed) {
    let el = document.getElementById('iron-counter');
    if (!el) {
      el = document.createElement('div');
      el.id = 'iron-counter';
      document.getElementById('hud').appendChild(el);
    }
    el.innerHTML = `<span class="iron-icon">⚒</span> <span id="iron-count">0</span> / ${needed}`;
    el.classList.remove('hidden');
  }

  setIronCount(n) {
    const el = document.getElementById('iron-count');
    if (el) el.textContent = n;
  }

  hideIronCounter() {
    const el = document.getElementById('iron-counter');
    if (el) el.classList.add('hidden');
  }

  /* ─── Crosshair hit flash ─── */
  flashCrosshair(type = 'hit') {
    const ch = document.getElementById('crosshair');
    if (!ch) return;
    ch.classList.remove('ch-hit', 'ch-kill');
    void ch.offsetWidth; // reflow
    ch.classList.add(type === 'kill' ? 'ch-kill' : 'ch-hit');
    clearTimeout(this._chFlashTimer);
    this._chFlashTimer = setTimeout(() => {
      ch.classList.remove('ch-hit', 'ch-kill');
    }, 350);
  }

  /* ─── Boss HP bar ─── */
  showBossBar(hp, maxHp) {
    const el   = document.getElementById('boss-bar');
    const fill = document.getElementById('boss-bar-fill');
    const val  = document.getElementById('boss-bar-val');
    if (!el) return;
    el.classList.remove('hidden');
    const pct = Math.max(0, Math.min(100, hp / maxHp * 100));
    if (fill) fill.style.width = pct + '%';
    if (val)  val.textContent  = `قایدی یاغوج — ${Math.ceil(hp)} / ${maxHp}`;
  }

  hideBossBar() {
    const el = document.getElementById('boss-bar');
    if (el) el.classList.add('hidden');
  }

  /* ─── Cinematic letterbox ─── */
  showLetterbox() {
    const t = document.getElementById('letterbox-top');
    const b = document.getElementById('letterbox-bottom');
    if (t) t.classList.add('active');
    if (b) b.classList.add('active');
  }

  hideLetterbox() {
    const t = document.getElementById('letterbox-top');
    const b = document.getElementById('letterbox-bottom');
    if (t) t.classList.remove('active');
    if (b) b.classList.remove('active');
  }

  /* ─── Kill streak banner ─── */
  showStreakBanner(n) {
    const el = document.getElementById('streak-banner');
    if (!el) return;
    const LABELS = ['','','دووکوژ 🔥','سێکوژ 🔥🔥','چوارکوژ ⚡','پێنجکوژ ⚡⚡','شەشکوژ 💀','حەوتکوژ 💀💀'];
    const label = LABELS[Math.min(n, LABELS.length - 1)] || `${n}× کوژگار`;
    el.textContent = `⚔ ${label}!`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._streakTimer);
    this._streakTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ─── Quest log panel (J key toggle) ─── */
  toggleQuestLog(quests, chapter) {
    const panel = document.getElementById('quest-log-panel');
    if (!panel) return;
    if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
    const chNames = {
      1: 'بەشی یەکەم — تاریکی ئاوبوون',
      2: 'بەشی دووەم — هەڵدانی خۆر',
      3: 'بەشی سێیەم — نێوان دو شاخ'
    };
    let html = `<div class="ql-title">📋 ئەرکەکان</div>`;
    html += `<div class="ql-chapter">${chNames[chapter] || ''}</div>`;
    html += `<ul class="ql-list">`;
    (quests || []).forEach(q => {
      const cls  = q.done ? 'done' : q.active ? 'active' : 'locked';
      const icon = q.done ? '✅' : q.active ? '▶' : '🔒';
      html += `<li class="ql-item ${cls}">${icon}  ${q.text}</li>`;
    });
    html += `</ul><div class="ql-hint">[ J ] داخستن</div>`;
    panel.innerHTML = html;
    panel.classList.add('open');
  }
}

window.UI = UI;
