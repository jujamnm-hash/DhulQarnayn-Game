/* ══════════════════════════════════════════════
   game.js  —  دەزگای سەرەکی یاری
   ══════════════════════════════════════════════ */
'use strict';

class Game {
  constructor() {
    this.canvas   = document.getElementById('game-canvas');
    this.renderer = null;
    this.scene    = null;
    this.camera   = null;
    this.player   = null;
    this.world    = null;
    this.effects  = null;
    this.npcMgr   = null;
    this.enemyMgr = null;
    this.audio    = null;
    this.ui       = null;
    this.dialogue = null;

    this.chapter  = 1;
    this.paused   = false;
    this.running  = false;

    this._clock   = { last: 0, delta: 0 };

    /* Quest state */
    this.questFlags = {};
    this.quests     = [];

    /* Chapter data */
    this.chData = null;

    /* Wall / iron progress (chapter 3) */
    this.wallProgress  = 0;
    this.wallTasks     = 0;   // iron pieces delivered
    this.ironCollected = 0;   // iron plates picked up
    this.ironNeeded    = 12;  // total iron plates needed

    window._game = this;
    this._timescale   = 1.0;   /* 1 = normal speed; <1 = slow-motion */
    this._slowmoUntil = 0;
    this._combatTimer = 0;
    window._settings = { sensitivity: 4, quality: 'medium', fov: 75, volume: 70 };

    /* Load saved data */
    this._loadSave();
  }

  /* ════════  INIT  ════════ */
  init() {
    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._bindPauseKey();
    this._bindPauseButtons();
    this._applySettings();
    this.audio = new AudioEngine();
    window._audio = this.audio;
  }

  /* ════════  SAVE / LOAD  ════════ */
  _loadSave() {
    try {
      const raw = localStorage.getItem('dq_save');
      if (!raw) return;
      const data = JSON.parse(raw);
      /* Unlock chapter cards */
      (data.unlockedChapters || []).forEach(n => {
        const cards = document.querySelectorAll('.chapter-card');
        if (cards[n - 1]) cards[n - 1].classList.remove('locked');
      });
      this._savedUnlocked = data.unlockedChapters || [1];
    } catch (e) {}
  }

  _saveProgress(chapterNum) {
    try {
      const existing = JSON.parse(localStorage.getItem('dq_save') || '{"unlockedChapters":[1]}');
      if (!existing.unlockedChapters.includes(chapterNum))
        existing.unlockedChapters.push(chapterNum);
      localStorage.setItem('dq_save', JSON.stringify(existing));
    } catch (e) {}
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: window._settings.quality !== 'low',
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.camera) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      }
    });
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x8a7a5a, 0.008);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      window._settings.fov,
      window.innerWidth / window.innerHeight,
      0.05, 550
    );
    this.camera.position.set(0, 1.75, 0);
  }

  _applySettings() {
    const s = window._settings;
    const sens = document.getElementById('setting-sensitivity');
    const vol  = document.getElementById('setting-volume');
    const fov  = document.getElementById('setting-fov');
    if (sens) { sens.addEventListener('input', () => { s.sensitivity = +sens.value; }); }
    if (vol)  { vol.addEventListener('input',  () => { s.volume = +vol.value; if (window.Howler) Howler.volume(s.volume / 100); }); }
    if (fov)  { fov.addEventListener('input',  () => { s.fov = +fov.value; if (this.camera) { this.camera.fov = s.fov; this.camera.updateProjectionMatrix(); } }); }
  }

  _bindPauseKey() {
    document.addEventListener('keydown', e => {
      if (!this.running) return;
      if (e.code === 'Escape') {
        this.paused ? this.resume() : this.pause();
      }
      /* J — toggle quest log panel */
      if (e.code === 'KeyJ' && !this.paused) {
        this.ui.toggleQuestLog(this.quests, this.chapter);
      }
    });
  }

  _bindPauseButtons() {
    const resume  = document.getElementById('btn-resume');
    const toMenu  = document.getElementById('btn-to-menu');
    resume && resume.addEventListener('click', () => this.resume());
    toMenu && toMenu.addEventListener('click', () => {
      this.pause();
      this.stopLevel();
      showScreen('main-menu');
    });
  }

  /* ════════  LOAD CHAPTER  ════════ */
  loadChapter(num) {
    this.chapter  = num;
    this.chData   = NARRATIVE['ch' + num];
    this.questFlags = {};
    this.wallProgress = 0;
    this.wallTasks    = 0;

    /* Remove death screen if present */
    const ds = document.getElementById('death-screen');
    if (ds) ds.remove();

    /* Show loading overlay */
    const loadOv = document.getElementById('loading-overlay');
    if (loadOv) loadOv.classList.remove('hidden');
    const lockOv = document.getElementById('lock-overlay');
    if (lockOv) lockOv.classList.add('hidden');

    /* Cycle verse quotes during loading */
    const verses = (NARRATIVE['ch' + num] || {}).verses || [];
    let vIdx = 0;
    const verseEl = document.getElementById('loading-verse');
    const showLoadVerse = () => {
      if (!verseEl || !verses.length) return;
      const v = verses[vIdx % verses.length];
      verseEl.textContent = v.ar + '\n' + v.ref;
      vIdx++;
    };
    showLoadVerse();
    const verseInterval = setInterval(showLoadVerse, 1800);

    /* Simulated loading */
    let pct = 0;
    const ui = this.ui;
    ui.setLoading(0);
    const loadInterval = setInterval(() => {
      pct += Math.random() * 18;
      ui.setLoading(Math.min(pct, 95));
      if (pct >= 95) {
        clearInterval(loadInterval);
        clearInterval(verseInterval);
        this._buildLevel(num);
        ui.setLoading(100);
        setTimeout(() => {
          ui.hideLoading();
          this._startChapterIntro();
        }, 400);
      }
    }, 120);
  }

  _buildLevel(num) {
    /* Clear old */
    if (this.world)   { this.world.dispose();   this.world   = null; }
    if (this.effects) { /* already disposed */  this.effects = null; }
    if (this.npcMgr)  { this.npcMgr.dispose();  this.npcMgr  = null; }

    /* Recreate scene fog per chapter */
    const fogColors = { 1: 0x8a5a2a, 2: 0xd4c090, 3: 0x444454 };
    const fogDens   = { 1: 0.007,    2: 0.006,    3: 0.009 };
    this.scene.fog = new THREE.FogExp2(fogColors[num] || 0x888888, fogDens[num] || 0.007);

    while (this.scene.children.length > 0) this.scene.remove(this.scene.children[0]);

    /* Chapter-specific lighting */
    const ambColors   = { 1: 0x8a6040, 2: 0xd4c090, 3: 0x303040 };
    const ambIntens   = { 1: 0.6,      2: 0.9,      3: 0.4 };
    const dirColors   = { 1: 0xff8844, 2: 0xffd080, 3: 0x6688cc };
    const dirIntens   = { 1: 1.2,      2: 1.4,      3: 0.8 };
    const dirPos      = { 1: [-60, 80, -20], 2: [60, 120, -30], 3: [0, 40, 20] };
    const ambient = new THREE.AmbientLight(ambColors[num] || 0x888888, ambIntens[num] || 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(dirColors[num] || 0xffffff, dirIntens[num] || 1.0);
    const dp = dirPos[num] || [0, 80, 0];
    dirLight.position.set(dp[0], dp[1], dp[2]);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far  = 400;
    dirLight.shadow.camera.left = dirLight.shadow.camera.bottom = -150;
    dirLight.shadow.camera.right = dirLight.shadow.camera.top   =  150;
    this.scene.add(dirLight);
    this._dirLight = dirLight;

    /* Per-chapter canvas color grade */
    const chFilters = {
      1: 'saturate(1.25) sepia(0.20) brightness(0.92)',
      2: 'saturate(0.65) brightness(1.18) contrast(1.08)',
      3: 'saturate(0.75) hue-rotate(195deg) brightness(0.88) contrast(1.05)'
    };
    if (this.canvas) this.canvas.style.filter = chFilters[num] || '';

    this.effects = new Effects(this.scene);
    this.world   = createWorld(num, this.scene, this.effects);
    this.npcMgr  = new NPCManager(this.scene);
    this.npcMgr.spawn(this.world.npcSpawns || []);

    /* Enemy manager (always create; enemies spawned in triggers) */
    if (this.enemyMgr) { this.enemyMgr.dispose(); }
    this.enemyMgr = new EnemyManager(this.scene);

    /* Iron reset */
    this.ironCollected = 0;
    this.wallTasks     = 0;
    /* Wave system reset */
    this._waveCount    = 0;
    this._waveCooldown = 6;

    /* Chapter-specific ambient audio */
    if (this.audio) {
      this.audio.stopAllLoops();
      if (num === 3) this.audio.startLoop('forge');
      else if (num === 2) this.audio.startLoop('desert');
      else this.audio.startLoop('wind');
    }

    /* Chapter-specific weather */
    if (this.effects) {
      if      (num === 1) this.effects.createWeather('sandstorm');
      else if (num === 2) this.effects.createWeather('ash');
      else                this.effects.createWeather(null); /* None for ch3 indoor */
    }

    /* Iron counter HUD */
    if (num === 3) {
      this.ui.showIronCounter(this.ironNeeded);
    } else {
      this.ui.hideIronCounter && this.ui.hideIronCounter();
    }

    /* Reset player position + health */
    if (this.player) {
      this.camera.position.set(0, 1.75, 10);
      this.player.health  = 100;
      this.player.stamina = 100;
      this.player.alive   = true;
      const fill = document.getElementById('health-fill');
      const val  = document.getElementById('health-val');
      if (fill) fill.style.width = '100%';
      if (val)  val.textContent  = '100';
    } else {
      this.player = new Player(this.camera, this.canvas);
    }

    /* Re-add camera to scene */
    this.scene.add(this.camera);

    /* UI chapter label */
    this.ui.setChapter(num, this.chData.title);
    this.ui.setObjective(this.chData.objective);
    this._initQuests(num);

    /* Dialogue engine */
    this.dialogue = new DialogueEngine(this.ui);
  }

  _startChapterIntro() {
    this.ui.showChapterIntro(
      this.chData.numeral,
      this.chData.title + ' — ' + this.chData.titleAr,
      this.chData.desc,
      () => {
        /* Show opening verse */
        const v = this.chData.verses[0];
        if (v) this._showVerse(v.ar, v.ku, v.ref, 7000);
        this.running = true;
        this.paused  = false;
        /* Show lock overlay only on desktop (touch devices bypass pointer lock) */
        if (!('ontouchstart' in window)) {
          document.getElementById('lock-overlay') &&
            document.getElementById('lock-overlay').classList.remove('hidden');
        }
      }
    );
  }

  /* ════════  TRIGGERS  ════════ */
  onTrigger(id) {
    if (this.questFlags[id]) return;
    this.questFlags[id] = true;

    const ch = this.chData;
    const verse = ch.verses.find(v => v.trigger === id);
    if (verse) {
      this.ui.showVerse(verse.ar, verse.ku, verse.ref, 8000);
      this._collectVerse(verse.ar, verse.ku, verse.ref);
      this.audio && this.audio.play('verse_appear', { volume: 0.8 });
    }

    /* Chapter-specific logic */
    switch (id) {
      case 'arrive_west':
        this.ui.setObjective('بچۆ بۆ ناو شارستانەکە');
        this.ui.showNotification('● کەوری تاریکی ئاوبونی خۆر دیت');
        this.ui.showAreaLabel('📍 کەوری تاریک — عین حمئة');
        this._completeQuest('reach_west');
        this.quests.find(q => q.id === 'enter_city') && (this.quests.find(q => q.id === 'enter_city').active = true);
        this._updateQuestUI();
        break;
      case 'enter_city':
        this.ui.setObjective('پیری باجاریەکە بدۆزەرەوە');
        this.ui.showAreaLabel('🏛 شارستانی کۆن');
        this._completeQuest('enter_city');
        this.dialogue.start('ch1_elder', 'ch1', () => {
          this._completeQuest('meet_elder');
          setTimeout(() => this.dialogue.start('ch1_oppressor', 'ch1', () => {
            this.quests.find(q => q.id === 'verdict') && (this.quests.find(q => q.id === 'verdict').active = true);
            this._updateQuestUI();
            setTimeout(() => this.dialogue.start('ch1_verdict', 'ch1', () => {
              this._completeQuest('verdict');
              this.ui.setObjective('بۆ بەشی دوویەم خۆت ئامادەبکە');
              this._unlockChapter(2);
            }), 2000);
          }), 2000);
        });
        break;
      case 'arrive_east':
        this.ui.setObjective('گوندییەکانی بێ سایبان دیت — پیشکەوتویی بخشە');
        this.ui.showNotification('● خۆری داوەر — خەڵکی بێ شوشە');
        this.ui.showAreaLabel('☀ زەوی هەڵدانی خۆر');
        this._completeQuest('reach_east');
        break;
      case 'meet_villagers':
        this._completeQuest('reach_east');
        this.ui.showAreaLabel('🏡 گوندی بێ سایبان');
        this.dialogue.start('ch2_villager', 'ch2', () => {
          this._completeQuest('meet_east');
          setTimeout(() => this.dialogue.start('ch2_assessment', 'ch2', () => {
            this._completeQuest('assess_east');
            this.ui.setObjective('بۆ بەشی سێیەم خۆت ئامادەبکە');
            this._unlockChapter(3);
          }), 2000);
        });
        break;
      case 'arrive_valley':
        this.ui.setObjective('گفتوگۆ لەگەڵ بەزمئاغا');
        this.ui.showAreaLabel('⛰ نێوان دو شاخ — سدّ');
        this._completeQuest('reach_valley');
        break;
      case 'approach_forge':
        this._completeQuest('meet_tribe');
        this.dialogue.start('ch3_elder', 'ch3', () => {
          setTimeout(() => this.dialogue.start('ch3_refuse', 'ch3', () => {
            this._completeQuest('refuse_money');
            this.ui.setObjective(`ئایرۆن کۆبکەرەوە — 0/${this.ironNeeded} پارچە`);
            this.quests.find(q => q.id === 'build_wall') && (this.quests.find(q => q.id === 'build_wall').active = true);
            this._updateQuestUI();
            /* Spawn Gog/Magog enemies behind the wall gap */
            if (this.world && this.world.enemySpawns) {
              this.enemyMgr.spawn(this.world.enemySpawns);
              this.ui.showNotification('⚠ یاغوج و ماجوج دەرکەوتن — ئاگاداربە!');
            }
            this._startIronMission();
          }), 2000);
        });
        break;
      case 'see_ruins':
        this.ui.showNotification('📜 شوێنی کۆنی شارستانیەکی پێشووتر');
        this.ui.showAreaLabel('🏚 خەرابەی کۆن');
        break;
      case 'wall_complete':
        this._completeQuest('build_wall');
        this._completeQuest('complete_wall');
        this.dialogue.start('ch3_done', 'ch3', () => {
          const v = ch.verses.find(v => v.trigger === 'after_wall');
          if (v) this._showVerse(v.ar, v.ku, v.ref, 9000);
          this.ui.showNotification('🏆 ئەرکی تەواو بوو — دیواری ئایرۆنی دامەزراند');
          setTimeout(() => this._showEndScreen(), 12000);
        });
        break;
    }
  }

  /* ════════  INTERACTION  ════════ */
  onInteract() {
    if (!this.running || this.paused) return;

    this.audio && this.audio.play('ui_pop', { volume: 0.5 });

    /* Advance dialogue */
    if (this.dialogue && this.dialogue.active) {
      this.dialogue.advance();
      return;
    }

    /* Ch3: pick up iron plates */
    if (this.chapter === 3 && this.questFlags['approach_forge']) {
      const playerPos = this.player.getPosition();
      if (this.world && this.world.nearestIronPickup &&
          this.world.nearestIronPickup(playerPos, 3.5) >= 0 &&
          this.ironCollected < this.ironNeeded) {
        this._tryCollectIron();
        return;
      }
    }

    /* Talk to NPC */
    const npc = this.npcMgr && this.npcMgr.getNearby(this.player.getPosition(), 5);
    if (npc) {
      /* Heal if elder/king and player HP < 100 */
      if (!npc.talked && this.player.health < 90 &&
          (npc.icon === '🧓' || npc.icon === '👑' || npc.icon === '🧔')) {
        const healAmt = Math.min(30, 100 - this.player.health);
        this.player.heal(healAmt);
        this.effects && this.effects.spawnHeal(npc.mesh.position);
        this.audio   && this.audio.play('verse_appear', { volume: 0.5 });
        this.ui.showNotification(`♥ درمان کرای +${healAmt} HP`);
      }
      npc.talked = true;
      this.dialogue.start(npc.id, npc.chKey);
    }
  }

  /* ════════  ATTACK  ════════ */
  onAttack() {
    if (!this.running || this.paused) return;

    this.audio && this.audio.play('sword_swing', { volume: 0.75 });

    /* Spawn ember effect at hand position */
    const handWorld = new THREE.Vector3();
    this.camera.getWorldPosition(handWorld);
    handWorld.y -= 0.5;
    handWorld.addScaledVector(
      new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw)),
      1.2
    );
    this.effects.spawnEmbers(handWorld, 20);

    /* Hit nearest enemy within 3.5m */
    const playerPos = this.player.getPosition();
    const enemy = this.enemyMgr && this.enemyMgr.getNearest(playerPos, 3.5);
    if (enemy) {
      enemy.takeDamage(35);
      /* Slow-motion on combo finisher step 2 */
      if (this.player._swingStep === 2 && !this._slowmoUntil) {
        this._timescale   = 0.22;
        this._slowmoUntil = Date.now() + 520; /* 520 real ms */
      }
      this.audio && this.audio.play('sword_hit', { volume: 0.6 });
      /* Blood splash at enemy position */
      this.effects && this.effects.spawnBlood(enemy.mesh.position);
      /* Crosshair flash */
      if (enemy.alive) {
        this.ui.flashCrosshair('hit');
        this.ui.showNotification(`⚔ یاغوج زیانی دید — ${Math.max(0, enemy.health)} HP`);
      } else {
        this.ui.flashCrosshair('kill');
        this.ui.showNotification('⚔ یاغوج کشدرای');
        /* Kill streak */
        this._killStreak = (this._killStreak || 0) + 1;
        this._killTimer  = 5.5;
        if (this._killStreak >= 2) this.ui.showStreakBanner(this._killStreak);
        /* Check all dead */
        if (this.enemyMgr.allDefeated()) {
          this.ui.showNotification('✅ هەموو یاغوج و ماجوج تێکشکاند، مەوجی دیکە دێتێ!');
        }
      }
    }
  }

  /* ════════  VERSE COLLECTION  ════════ */
  _showVerse(ar, ku, ref, dur) {
    this.ui.showVerse(ar, ku, ref, dur);
    this._collectVerse(ar, ku, ref);
  }

  _collectVerse(ar, ku, ref) {
    try {
      const verses = JSON.parse(localStorage.getItem('dq_verses') || '[]');
      if (!verses.find(v => v.ref === ref)) {
        verses.push({ ar, ku, ref });
        localStorage.setItem('dq_verses', JSON.stringify(verses));
        this.ui.showNotification(`📜 ئایەتی نوی کۆڵکرای: ${ref}`);
      }
    } catch (e) { /* ignore */ }
  }

  /* ════════  IRON COLLECT MISSION (CH3)  ════════ */
  _startIronMission() {
    /* Iron is collected manually via E key near iron pickups */
    /* Wall sections build automatically as iron is collected */
  }

  /* Called from onInteract when player is near an iron pickup */
  _tryCollectIron() {
    if (!this.world || !this.world.nearestIronPickup) return;
    const playerPos = this.player.getPosition();
    const idx = this.world.nearestIronPickup(playerPos, 3.5);
    if (idx < 0) return;
    if (this.world.collectIron(idx)) {
      this.ironCollected++;
      this.ui.setIronCount(this.ironCollected);
      this.audio && this.audio.play('iron_place', { volume: 0.7 });
      const pct = Math.round((this.ironCollected / this.ironNeeded) * 100);
      this.ui.showNotification(`⚒ ئایرۆن کۆکرایەوە ${this.ironCollected}/${this.ironNeeded}`);
      this.ui.setObjective(`ئایرۆن کۆبکەرەوە — ${this.ironCollected}/${this.ironNeeded} پارچە`);
      /* Update wall visually */
      this.world.buildWallSection(this.ironCollected / this.ironNeeded);
      this.effects.spawnIronSparks(new THREE.Vector3(0, 16, 0), 40);
      this.audio && this.audio.play('iron_spark', { volume: 0.5 });
      /* Complete quest if done */
      if (this.ironCollected >= this.ironNeeded) {
        this._completeQuest('build_wall');
        this.ui.setObjective('دیوار تەواو بوو — لەگەڵ دەمارگووشا قسەبکە');
        this.dialogue.start('ch3_ironsmith', 'ch3', () => {
          this.onTrigger('wall_complete');
        });
      }
    }
  }

  /* ════════  UNLOCK CHAPTER  ════════ */
  _unlockChapter(toNum) {
    /* Persist unlock */
    this._saveProgress(toNum);

    /* Unlock card in chapter-select UI */
    const cards = document.querySelectorAll('.chapter-card');
    if (cards[toNum - 1]) cards[toNum - 1].classList.remove('locked');

    this.audio && this.audio.play('chapter_fanfare', { volume: 0.9 });

    /* Pause gameplay */
    this.running = false;

    /* Closing verse for current chapter */
    const curVerses = this.chData.verses;
    const lastVerse = curVerses[curVerses.length - 1];

    /* Show transition screen */
    const tEl = document.getElementById('chapter-transition');
    const vEl = document.getElementById('ct-verse');
    const mEl = document.getElementById('ct-msg');
    if (tEl && vEl && mEl) {
      vEl.textContent = (lastVerse ? lastVerse.ar + '\n— ' + lastVerse.ref : '');
      mEl.textContent = `بەش ${['I','II','III'][this.chapter - 1]} تەواو بوو. ئایا ئامادەی بەشی ${['I','II','III'][toNum - 1]}ی؟`;
      tEl.classList.remove('hidden');
    }

    /* Buttons — use onclick to avoid accumulating listeners */
    const btnNext = document.getElementById('ct-next');
    const btnMenu = document.getElementById('ct-menu');
    const cleanup = () => { tEl && tEl.classList.add('hidden'); };

    if (btnNext) {
      btnNext.onclick = () => {
        btnNext.onclick = null;
        cleanup();
        this.loadChapter(toNum);
      };
    }
    if (btnMenu) {
      btnMenu.onclick = () => {
        btnMenu.onclick = null;
        cleanup();
        this.stopLevel();
        showScreen('main-menu');
      };
    }
  }

  /* ════════  QUEST SYSTEM  ════════ */
  _initQuests(num) {
    const q1 = [
      { id: 'reach_west',   text: 'بچۆ بۆ کەوری تاریکی ئاوبوون', done: false, active: true },
      { id: 'enter_city',   text: 'داخڵ شارستانەکە بە',           done: false, active: false },
      { id: 'meet_elder',   text: 'پیرەکە بدۆزەرەوە',             done: false, active: false },
      { id: 'verdict',      text: 'دادپەروەری ئەنجام بدە',        done: false, active: false }
    ];
    const q2 = [
      { id: 'reach_east',   text: 'بچۆ بۆ هەڵدانی خۆر',          done: false, active: true },
      { id: 'meet_east',    text: 'بازاوەشیەکان بدۆزەرەوە',       done: false, active: false },
      { id: 'assess_east',  text: 'ئارەزووی خەڵکەکان بزانە',      done: false, active: false }
    ];
    const q3 = [
      { id: 'reach_valley', text: 'دەستبگە بۆ نیوان دو شاخ',      done: false, active: true },
      { id: 'meet_tribe',   text: 'بەزمئاغا بدۆزەرەوە',            done: false, active: false },
      { id: 'refuse_money', text: 'خزمەت بکە بەبێ مزد',            done: false, active: false },
      { id: 'build_wall',   text: 'دیوارەکە بنیاد بنێ',            done: false, active: false },
      { id: 'complete_wall',text: 'دیواری ئایرۆن تەمام بکە',       done: false, active: false }
    ];
    this.quests = [q1, q2, q3][num - 1] || q1;
    this._updateQuestUI();
  }

  _completeQuest(id) {
    const q = this.quests.find(q => q.id === id);
    if (!q || q.done) return;
    q.done = true;
    /* Activate next */
    const idx = this.quests.indexOf(q);
    if (this.quests[idx + 1]) {
      this.quests[idx + 1].active = true;
    }
    this._updateQuestUI();
    this.audio && this.audio.play('quest_done', { volume: 0.7 });
  }

  _updateQuestUI() {
    if (this.ui) this.ui.setQuests(this.quests);
  }

  /* ════════  END SCREEN  ════════ */
  _showEndScreen() {
    this.running = false;
    /* Simple overlay */
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.92);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      z-index:999;font-family:'Amiri',serif;direction:rtl;gap:1.5rem;
    `;
    overlay.innerHTML = `
      <div style="font-size:4rem;color:#c9a84c;text-shadow:0 0 40px rgba(201,168,76,.8)">ذو القرنين</div>
      <div style="font-size:1.5rem;color:#f0d080">دەمەکانی دیوارەکە تەواو بوو</div>
      <div style="max-width:600px;text-align:center;color:rgba(255,255,255,.7);font-size:1rem;line-height:2">
        ئەو کاری کرد بۆ دادپەروەری، ئازادی، و پاراستنی خەڵک. نە بۆ مال، نە بۆ شۆهرەت, بەڵکو بۆ باری خوای گەورە.
      </div>
      <div style="font-family:'Amiri',serif;font-size:1.4rem;color:#c9a84c;margin-top:1rem;border:1px solid rgba(201,168,76,.4);padding:1rem 2rem;border-radius:8px">
        « قَالَ هَٰذَا رَحْمَةٌ مِّن رَّبِّي »
      </div>
      <button onclick="this.parentElement.remove();showScreen('main-menu')"
              style="margin-top:1.5rem;padding:.8rem 2rem;background:rgba(201,168,76,.15);
              border:1px solid #c9a84c;border-radius:4px;color:#f0d080;
              font-family:'Cairo',sans-serif;font-size:1rem;cursor:pointer">
        ↩ گەڕانەوە بۆ منیو
      </button>
    `;
    document.body.appendChild(overlay);
  }

  /* ════════  PAUSE / RESUME  ════════ */
  pause() {
    this.paused = true;
    this.ui.showPause();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    this.paused = false;
    this.ui.hidePause();
    this.canvas.requestPointerLock();
  }

  stopLevel() {
    this.running = false;
    this.paused  = false;
    if (this._wallBuildInterval) clearInterval(this._wallBuildInterval);
    if (this.npcMgr)   this.npcMgr.dispose();
    if (this.enemyMgr) { this.enemyMgr.dispose(); this.enemyMgr = null; }
    if (this.world)    this.world.dispose();
    if (this.audio)    this.audio.stopAllLoops();
    while (this.scene && this.scene.children.length > 0)
      this.scene.remove(this.scene.children[0]);
    /* Remove death screen if open */
    const ds = document.getElementById('death-screen');
    if (ds) ds.remove();
    /* Heal player for next chapter */
    if (this.player) { this.player.health = 100; this.player.stamina = 100; this.player.alive = true; }
    /* hide in-game overlays */
    ['lock-overlay','loading-overlay','chapter-transition','chapter-intro','verse-popup','dialogue-box']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    document.getElementById('loading-fill') &&
      (document.getElementById('loading-fill').style.width = '0');
    /* Reset canvas colour grade */
    if (this.canvas) this.canvas.style.filter = '';
  }

  /* ════════  GAME LOOP  ════════ */
  start() {
    const loop = (timestamp) => {
      requestAnimationFrame(loop);
      /* Slow-motion timer (real-time based so the 500ms always feels the same) */
      if (this._slowmoUntil && Date.now() > this._slowmoUntil) {
        this._timescale   = 1.0;
        this._slowmoUntil = 0;
      }
      const dt = Math.min((timestamp - (this._clock.last || timestamp)) / 1000, 0.05) * (this._timescale || 1);
      this._clock.last = timestamp;

      if (this.running && !this.paused) {
        /* Update subsystems */
        this.player  && this.player.update(dt);
        this.effects && this.effects.update(dt);
        this.world   && this.world.update(dt, this.player.getPosition());
        this.npcMgr  && this.npcMgr.update(dt, this.player.getPosition());
        const promptHandled = this._loopExtras(dt);

        /* Interact prompt (if not overridden by extra logic) */
        if (!promptHandled) {
          const nearNPC = this.npcMgr &&
            this.npcMgr.getNearby(this.player.getPosition(), 5);
          if (this.dialogue && this.dialogue.active) {
            this.ui.showInteract('[ E ]  بەردەوامبوون');
          } else if (nearNPC) {
            this.ui.showInteract(`[ E ]  قسەبکە لەگەڵ ${nearNPC.icon}`);
          } else {
            this.ui.hideInteract();
          }
        }

        /* Minimap — include enemies */
        this.ui.updateMinimap(
          this.player.getPosition(),
          this.npcMgr ? this.npcMgr.npcs : [],
          this.world  ? this.world.triggers : [],
          this.enemyMgr ? this.enemyMgr.enemies : []
        );
      }

      /* Always render */
      if (this.renderer && this.scene && this.camera)
        this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }

  /* ════════  GAME LOOP extras  ════════ */
  _loopExtras(dt) {
    /* Footsteps (chapter-aware surface sound) */
    if (this.audio && this.player) {
      const moving = this.player.move.f || this.player.move.b ||
                     this.player.move.l || this.player.move.r;
      this.audio.tickFootstep(dt, this.player.move.sprint && moving, moving, this.chapter);
    }

    /* Kill streak timer */
    if (this._killTimer > 0) {
      this._killTimer -= dt;
      if (this._killTimer <= 0) {
        this._killStreak = 0;
        const sb = document.getElementById('streak-banner');
        if (sb) sb.classList.remove('show');
      }
    }

    /* Enemy update */
    if (this.enemyMgr && this.player) {
      this.enemyMgr.update(dt, this.player.getPosition());
    }

    /* Death check */
    if (this.player && !this.player.alive && this.running) {
      this.running = false;
      this._showDeathScreen();
    }

    /* Ch3 iron interact hint — returns true to suppress NPC prompt */
    if (this.chapter === 3 && this.world && this.world.nearestIronPickup && this.player &&
        this.questFlags['approach_forge'] && this.ironCollected < this.ironNeeded) {
      const pp  = this.player.getPosition();
      const idx = this.world.nearestIronPickup(pp, 3.5);
      if (idx >= 0) {
        this.ui.showInteract(`[ E ]  ئایرۆن هەڵبگرە (${this.ironCollected}/${this.ironNeeded})`);
        return true;
      }
    }

    /* Ch3 wave system — after forge quest triggers, spawn waves */
    if (this.chapter === 3 && this.questFlags['approach_forge']) {
      this._updateWaves(dt);
    }

    /* Boss HP bar */
    const boss = this.enemyMgr && this.enemyMgr.enemies.find(e => e.isBoss && e.alive);
    if (boss) this.ui.showBossBar(boss.health, boss.maxHealth);
    else      this.ui.hideBossBar();

    /* Out-of-combat health regeneration (regen up to 60 HP when safe) */
    const inCombat = this.enemyMgr && this.enemyMgr.enemies.some(
      e => e.alive && (e.state === 'chase' || e.state === 'attack')
    );
    if (inCombat) {
      this._combatTimer = 6.0;
    } else {
      this._combatTimer = Math.max(0, (this._combatTimer || 0) - dt);
      if (this._combatTimer <= 0 && this.player && this.player.alive &&
          this.player.health > 0 && this.player.health < 60) {
        this.player.heal(2.5 * dt);
      }
    }

    return false;
  }

  /* ════════  WAVE SYSTEM (CH3)  ════════ */
  _updateWaves(dt) {
    if (!this.enemyMgr) return;

    const TOTAL_WAVES = 3;
    if (this._waveCount === undefined) this._waveCount = 0;
    if (this._waveCooldown === undefined) this._waveCooldown = 6; /* first wave in 6s */

    /* Countdown to next wave */
    if (this._waveCount < TOTAL_WAVES) {
      this._waveCooldown -= dt;
      /* First wave: just wait cooldown; subsequent waves: also need current wave cleared */
      const readyToSpawn = this._waveCooldown <= 0 &&
        (this._waveCount === 0 || this.enemyMgr.allDefeated());
      if (readyToSpawn) {
        this._waveCount++;
        /* Wave 3 = boss wave: 1 BossEnemy + 2 normal */
        const spawns = this.world && this.world.enemySpawns ? this.world.enemySpawns : [];
        if (this._waveCount === TOTAL_WAVES) {
          /* BOSS WAVE */
          const bossSpawn = spawns[0] || { pos: new THREE.Vector3(0, 0, -90), waypoints: [] };
          this.enemyMgr.spawnBoss(bossSpawn);
          for (let i = 1; i <= 2; i++) {
            const sp = spawns[i % spawns.length] || bossSpawn;
            this.enemyMgr.spawnOne(sp);
          }
          this.ui.showNotification('⚡ قایدی یاغوج دەرکەتەوە! باوێش یانگرترە!');
        } else {
          /* Normal wave */
          const waveSize = 2 + this._waveCount;
          for (let i = 0; i < waveSize; i++) {
            const sp = spawns[i % spawns.length] || { pos: { x: 0, y: 0, z: -80 }, waypoints: [] };
            this.enemyMgr.spawnOne(sp);
          }
        }
        this._waveCooldown = 20 + this._waveCount * 5;
        this.ui.showNotification(`⚠️ مەوجی یاغوج ${this._waveCount}/${TOTAL_WAVES} — دافەبێکەرەوە!`);
      }
    }
  }

  /* ════════  DEATH SCREEN  ════════ */
  _showDeathScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'death-screen';
    overlay.innerHTML = `
      <div class="death-icon">✝</div>
      <div class="death-title">کەوتیتەوە</div>
      <div class="death-sub">بەردار بە — ئەرکەکەت تەواو نەبووە</div>
      <div class="death-verse">« إِنَّ اللَّهَ مَعَ الصَّابِرِينَ »</div>
      <div style="display:flex;gap:1rem;margin-top:1.8rem">
        <button class="death-btn" onclick="window._game.loadChapter(window._game.chapter)">↺ دووبارەیەک هەوڵبدەرەوە</button>
        <button class="death-btn secondary" onclick="document.getElementById('death-screen').remove();window._game.stopLevel();showScreen('main-menu')">↩ مەنیوو</button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.audio && this.audio.play('player_hurt', { volume: 1.0 });
  }
}

window.Game = Game;
