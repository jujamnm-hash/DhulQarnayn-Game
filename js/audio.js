/* ══════════════════════════════════════════════
   audio.js  —  دەنگەمووزیکی یاری (Web Audio API)
   ══════════════════════════════════════════════ */
'use strict';

class AudioEngine {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this._dead = true; return; }
    this.ctx         = new AC();
    this.masterGain  = this.ctx.createGain();
    this.masterGain.gain.value = 0.65;
    this.masterGain.connect(this.ctx.destination);
    this._loopNodes  = {};     // active looping sounds
    this._stepTimer  = 0;
    this._lastStep   = 0;
    this._dead       = false;
  }

  /* ── Ensure AudioContext is running (needs user gesture) ── */
  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /* ── Master volume (0-100) ── */
  setVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = v / 100;
  }

  /* ══════  ONE-SHOT SOUNDS  ══════ */
  play(name, options = {}) {
    if (this._dead) return;
    this._resume();
    const vol = options.volume !== undefined ? options.volume : 1.0;
    switch (name) {
      case 'sword_swing':   this._swordSwing(vol);   break;
      case 'sword_hit':     this._swordHit(vol);     break;
      case 'footstep':      this._footstep(vol);     break;
      case 'footstep_stone':this._footstepStone(vol);break;
      case 'iron_spark':    this._ironSpark(vol);    break;
      case 'iron_place':    this._ironPlace(vol);    break;
      case 'ui_click':      this._uiClick(vol);      break;
      case 'ui_pop':        this._uiPop(vol);        break;
      case 'player_hurt':   this._playerHurt(vol);  break;
      case 'enemy_hit':     this._enemyHit(vol);     break;
      case 'enemy_die':     this._enemyDie(vol);     break;
      case 'quest_done':    this._questDone(vol);    break;
      case 'verse_appear':  this._verseAppear(vol);  break;
      case 'fire_crackle':  this._fireCrackle(vol);  break;
      case 'chapter_fanfare':this._chapterFanfare(vol);break;
    }
  }

  /* ═══  Throttled footstep — call every frame with dt  ═══ */
  tickFootstep(dt, sprinting, isMoving, chapter = 1) {
    if (!isMoving || this._dead) return;
    const interval = sprinting ? 0.28 : 0.45;
    this._stepTimer += dt;
    if (this._stepTimer >= interval) {
      this._stepTimer = 0;
      /* Surface: sandy (ch1) vs rocky stone (ch2 roads, ch3 mountain) */
      const ground = chapter >= 2 ? 'footstep_stone' : 'footstep';
      this.play(sprinting ? 'footstep_stone' : ground, { volume: 0.35 });
    }
  }

  /* ══════  SOUND SYNTHESIS  ══════ */

  /* ── White-noise whoosh  ── */
  _swordSwing(vol) {
    const dur = 0.28;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const g = this._gain(vol * 0.55, 0, dur);
    src.connect(bp); bp.connect(g); g.connect(this.masterGain);
    src.start();
  }

  /* ── Metallic clank for sword hit ── */
  _swordHit(vol) {
    const osc  = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value  = 280;
    osc2.type= 'square';   osc2.frequency.value = 560;
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.18);
    const g = this._gain(vol * 0.45, 0, 0.25);
    osc.connect(g); osc2.connect(g); g.connect(this.masterGain);
    osc.start(); osc2.start();
    osc.stop(this.ctx.currentTime + 0.25);
    osc2.stop(this.ctx.currentTime + 0.18);
  }

  /* ── Dull thud footstep (sand) ── */
  _footstep(vol) {
    const dur = 0.12;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.5);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350;
    const g = this._gain(vol * 0.4, 0, dur);
    src.connect(lp); lp.connect(g); g.connect(this.masterGain);
    src.start();
  }

  /* ── Harder footstep (stone/rock) ── */
  _footstepStone(vol) {
    const dur = 0.1;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 800; lp.Q.value = 1.5;
    const g = this._gain(vol * 0.55, 0, dur);
    src.connect(lp); lp.connect(g); g.connect(this.masterGain);
    src.start();
  }

  /* ── Iron sparks (high crackle) ── */
  _ironSpark(vol) {
    const dur = 0.18;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.1 ? 1 : 0.1) * Math.pow(1 - i / d.length, 1.2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
    const g = this._gain(vol * 0.5, 0, dur);
    src.connect(hp); hp.connect(g); g.connect(this.masterGain);
    src.start();
  }

  /* ── Heavy iron placed on ground ── */
  _ironPlace(vol) {
    const dur = 0.35;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(Math.max(0, 1 - i / d.length * 2.5), 2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = this._gain(vol * 0.7, 0, dur);
    src.connect(lp); lp.connect(g); g.connect(this.masterGain);
    src.start();
  }

  /* ── Brief UI click ── */
  _uiClick(vol) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = 1200;
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.06);
    const g = this._gain(vol * 0.25, 0, 0.07);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.07);
  }

  /* ── Soft pop (dialogue advance) ── */
  _uiPop(vol) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = 440;
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.1);
    const g = this._gain(vol * 0.18, 0, 0.12);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.12);
  }

  /* ── Player hurt (grunt) ── */
  _playerHurt(vol) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value = 120;
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.3);
    const dist = this.ctx.createWaveShaper();
    dist.curve = this._makeDistortionCurve(80);
    const g = this._gain(vol * 0.5, 0, 0.4);
    osc.connect(dist); dist.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.4);
  }

  /* ── Enemy hit ── */
  _enemyHit(vol) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value = 200;
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);
    const g = this._gain(vol * 0.4, 0, 0.2);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.2);
  }

  /* ── Enemy death (descending thud) ── */
  _enemyDie(vol) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value = 160;
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.7);
    const g = this._gain(vol * 0.55, 0, 0.8);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.8);
  }

  /* ── Quest complete chime ── */
  _questDone(vol) {
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = f;
      const g = this._gain(vol * 0.2, 0, 0.5);
      osc.connect(g); g.connect(this.masterGain);
      const t0 = this.ctx.currentTime + i * 0.1;
      osc.start(t0); osc.stop(t0 + 0.45);
    });
  }

  /* ── Verse appear (mystical shimmer) ── */
  _verseAppear(vol) {
    const freqs = [220, 277, 330, 440, 554];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = f * 2;
      const g = this._gain(vol * 0.12, 0, 1.5);
      osc.connect(g); g.connect(this.masterGain);
      const t0 = this.ctx.currentTime + i * 0.06;
      osc.start(t0); osc.stop(t0 + 1.4);
    });
  }

  /* ── Fire crackle burst ── */
  _fireCrackle(vol) {
    const dur = 0.22;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.05 ? 1 : 0.05);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 1200; lp.Q.value = 0.8;
    const g = this._gain(vol * 0.3, 0, dur);
    src.connect(lp); lp.connect(g); g.connect(this.masterGain);
    src.start();
  }

  /* ── Chapter unlock fanfare ── */
  _chapterFanfare(vol) {
    const notes = [
      { f: 523, t: 0.0, dur: 0.4 },
      { f: 659, t: 0.15, dur: 0.4 },
      { f: 784, t: 0.30, dur: 0.4 },
      { f: 1047,t: 0.45, dur: 0.8 }
    ];
    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle'; osc.frequency.value = n.f;
      const g = this._gain(vol * 0.22, this.ctx.currentTime + n.t, n.dur);
      osc.connect(g); g.connect(this.masterGain);
      osc.start(this.ctx.currentTime + n.t);
      osc.stop(this.ctx.currentTime + n.t + n.dur);
    });
  }

  /* ─── Voice beeps per character type ───
     charType: 'elder' | 'king' | 'oppressor' | 'ironsmith' | 'villager'  */
  playVoiceBeep(charType) {
    if (this._dead) return;
    this._resume();
    const profiles = {
      king:      { f: 180, type: 'triangle', vol: 0.14, dur: 0.055 },
      elder:     { f: 220, type: 'sine',     vol: 0.11, dur: 0.065 },
      oppressor: { f: 110, type: 'sawtooth', vol: 0.16, dur: 0.06  },
      ironsmith: { f: 260, type: 'square',   vol: 0.09, dur: 0.05  },
      villager:  { f: 300, type: 'sine',     vol: 0.10, dur: 0.05  },
      default:   { f: 240, type: 'sine',     vol: 0.09, dur: 0.055 }
    };
    const p = profiles[charType] || profiles.default;
    const osc = this.ctx.createOscillator();
    osc.type = p.type;
    osc.frequency.value = p.f + (Math.random() - 0.5) * 30;
    const g = this._gain(p.vol, 0, p.dur);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + p.dur);
  }

  /* ══════  LOOPING AMBIENT SOUNDS  ══════ */
  startLoop(name) {
    if (this._dead || this._loopNodes[name]) return;
    this._resume();
    switch (name) {
      case 'wind':   this._loopNodes[name] = this._makeWindLoop(); break;
      case 'forge':  this._loopNodes[name] = this._makeForgeLoop(); break;
      case 'desert': this._loopNodes[name] = this._makeDesertLoop(); break;
    }
  }

  stopLoop(name) {
    if (!this._loopNodes[name]) return;
    const node = this._loopNodes[name];
    try { node.gain && node.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); }
    catch (e) {}
    setTimeout(() => { try { node.src && node.src.stop(); } catch(e){} }, 500);
    delete this._loopNodes[name];
  }

  stopAllLoops() {
    Object.keys(this._loopNodes).forEach(k => this.stopLoop(k));
  }

  _makeWindLoop() {
    const dur = 2;
    const sr  = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.3;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.15;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 100;
    lfo.connect(lfoG); lfoG.connect(bp.frequency);
    const gain = this.ctx.createGain(); gain.gain.value = 0.18;
    src.connect(bp); bp.connect(gain); gain.connect(this.masterGain);
    src.start(); lfo.start();
    return { src, gain };
  }

  _makeForgeLoop() {
    const dur = 1, sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.03 ? 1 : 0.08);
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp  = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
    const gain = this.ctx.createGain(); gain.gain.value = 0.22;
    src.connect(lp); lp.connect(gain); gain.connect(this.masterGain);
    src.start();
    return { src, gain };
  }

  _makeDesertLoop() {
    const dur = 3, sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const bp   = this.ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 2000;
    const gain = this.ctx.createGain(); gain.gain.value = 0.12;
    src.connect(bp); bp.connect(gain); gain.connect(this.masterGain);
    src.start();
    return { src, gain };
  }

  /* ══════  Helpers  ══════ */
  _gain(vol, startTime, dur) {
    const g = this.ctx.createGain();
    const t0 = (startTime || 0) + this.ctx.currentTime;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    return g;
  }

  _makeDistortionCurve(amount) {
    const samples = 256, curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
}

window.AudioEngine = AudioEngine;
