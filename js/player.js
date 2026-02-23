/* ══════════════════════════════════════════════
   player.js  —  FPS کۆنترۆل + دەستی ئاشکرا
   ══════════════════════════════════════════════ */
'use strict';

class Player {
  constructor(camera, canvas) {
    this.camera   = camera;
    this.canvas   = canvas;

    /* Movement state */
    this.vel      = new THREE.Vector3();
    this.move     = { f: false, b: false, l: false, r: false, sprint: false };
    this.onGround = true;
    this.height   = 1.75;
    this.speed    = 7;
    this.sprintMul= 1.8;
    this.gravity  = -22;
    this.jumpV    = 8;

    /* Look (Euler from mouse) */
    this.yaw   = 0;
    this.pitch = 0;
    this.sensitivity = 0.0018;

    /* Health */
    this.health  = 100;
    this.stamina = 100;
    this.alive   = true;

    /* Pointer lock */
    this.locked = false;

    /* Hand meshes */
    this.handGroup = new THREE.Group();
    this._buildHands();
    camera.add(this.handGroup);

    /* Bob */
    this.bob      = 0;
    this.bobAmp   = 0.045;
    /* Screen shake */
    this._shakeAmt = 0;

    /* Interaction range */
    this.interactRange = 5;
    this.raycaster = new THREE.Raycaster();

    /* Bind events */
    this._bindKeys();
    this._bindMouse();
    this._bindPointerLock();
    this._bindTouch();
  }

  /* ─── Build visible hands ─── */
  _buildHands() {
    const HG = this.handGroup;

    /* ── RIGHT HAND (weapon/staff hand) ── */
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xc8905c });   // skin tone
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x8a6030 });   // glove/armour

    // Forearm
    const forearmGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.55, 8);
    const forearm_R  = new THREE.Mesh(forearmGeo, skinMat);
    forearm_R.position.set(0.3, -0.28, -0.45);
    forearm_R.rotation.z = Math.PI / 2 - 0.35;
    forearm_R.rotation.y = -0.18;
    HG.add(forearm_R);

    // Hand/palm
    const palmGeo  = new THREE.BoxGeometry(0.11, 0.14, 0.1);
    const palm_R   = new THREE.Mesh(palmGeo, skinMat);
    palm_R.position.set(0.32, -0.22, -0.55);
    HG.add(palm_R);

    // Fingers (4 stubs)
    for (let i = 0; i < 4; i++) {
      const fGeo = new THREE.CylinderGeometry(0.016, 0.013, 0.07, 5);
      const f    = new THREE.Mesh(fGeo, skinMat);
      f.position.set(0.28 + i * 0.024, -0.19, -0.59);
      f.rotation.z = 0.2;
      HG.add(f);
    }
    // Thumb
    const thumbGeo = new THREE.CylinderGeometry(0.018, 0.016, 0.065, 5);
    const thumb_R  = new THREE.Mesh(thumbGeo, skinMat);
    thumb_R.position.set(0.27, -0.21, -0.52);
    thumb_R.rotation.z = 1.1;
    HG.add(thumb_R);

    // Bracer / armour on forearm
    const bracerGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.22, 8);
    const bracer    = new THREE.Mesh(bracerGeo, darkMat);
    bracer.position.set(0.31, -0.3, -0.42);
    bracer.rotation.z = Math.PI / 2 - 0.35;
    bracer.rotation.y = -0.18;
    HG.add(bracer);

    /* ── SWORD / STAFF ── */
    this._buildSword(HG);

    /* ── LEFT HAND (offhand / shield arm) ── */
    const forearm_L = new THREE.Mesh(forearmGeo, skinMat);
    forearm_L.position.set(-0.3, -0.3, -0.48);
    forearm_L.rotation.z = -(Math.PI / 2 - 0.35);
    forearm_L.rotation.y = 0.18;
    HG.add(forearm_L);

    const palm_L = new THREE.Mesh(palmGeo, skinMat);
    palm_L.position.set(-0.32, -0.24, -0.58);
    HG.add(palm_L);

    // Shield
    this._buildShield(HG);

    // Cloak sleeve (left)
    const sleeveGeo = new THREE.CylinderGeometry(0.10, 0.12, 0.4, 10);
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
    const sleeve_L  = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve_L.position.set(-0.3, -0.28, -0.35);
    sleeve_L.rotation.z = -(Math.PI / 2 - 0.3);
    HG.add(sleeve_L);

    const sleeve_R = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve_R.position.set(0.3, -0.26, -0.32);
    sleeve_R.rotation.z = Math.PI / 2 - 0.3;
    HG.add(sleeve_R);

    /* Store refs for animation */
    this.forearm_R = forearm_R;
    this.palm_R    = palm_R;
  }

  _buildSword(parent) {
    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.045, 0.72, 0.015);
    const bladeMat = new THREE.MeshLambertMaterial({
      color: 0xd8d8e8,
      emissive: new THREE.Color(0xaaaacc),
      emissiveIntensity: 0.15
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0.36, 0.08, -0.60);
    parent.add(blade);

    // Guard
    const guardGeo = new THREE.BoxGeometry(0.18, 0.03, 0.04);
    const guardMat = new THREE.MeshLambertMaterial({ color: 0xc9a84c });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0.36, -0.27, -0.60);
    parent.add(guard);

    // Grip
    const gripGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.2, 7);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x2a1800 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0.36, -0.36, -0.60);
    parent.add(grip);

    // Pommel
    const pomGeo = new THREE.SphereGeometry(0.032, 7, 7);
    const pom = new THREE.Mesh(pomGeo, guardMat.clone());
    pom.position.set(0.36, -0.47, -0.60);
    parent.add(pom);

    this.sword = blade;
  }

  _buildShield(parent) {
    /* All shield pieces grouped so we can animate them together */
    const sg = new THREE.Group();
    sg.position.set(-0.44, -0.18, -0.62);
    parent.add(sg);
    this.shieldGroup = sg;

    // Shield body (round)
    const shieldGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.04, 20);
    const shieldMat = new THREE.MeshLambertMaterial({ color: 0x1e3460 });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.z = Math.PI / 2;
    shield.rotation.y = 0.3;
    sg.add(shield);

    // Shield emboss
    const emblGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6);
    const emblMat = new THREE.MeshLambertMaterial({ color: 0xc9a84c });
    const embl = new THREE.Mesh(emblGeo, emblMat);
    embl.rotation.z = Math.PI / 2;
    embl.rotation.y = 0.3;
    embl.position.set(-0.03, 0, 0);
    sg.add(embl);

    // Rim
    const rimGeo = new THREE.TorusGeometry(0.23, 0.018, 8, 24);
    const rim    = new THREE.Mesh(rimGeo, new THREE.MeshLambertMaterial({ color: 0xc9a84c }));
    rim.rotation.y = Math.PI / 2 + 0.3;
    sg.add(rim);
  }

  /* ─── Key bindings ─── */
  _bindKeys() {
    const m = this.move;
    document.addEventListener('keydown', e => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    m.f = true;  break;
        case 'KeyS': case 'ArrowDown':  m.b = true;  break;
        case 'KeyA': case 'ArrowLeft':  m.l = true;  break;
        case 'KeyD': case 'ArrowRight': m.r = true;  break;
        case 'ShiftLeft': m.sprint = true; break;
        case 'Space': if (this.onGround) { this.vel.y = this.jumpV; this.onGround = false; } break;
        case 'KeyE': window._game && window._game.onInteract(); break;
        case 'Escape': break; // handled elsewhere
      }
    });
    document.addEventListener('keyup', e => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    m.f = false; break;
        case 'KeyS': case 'ArrowDown':  m.b = false; break;
        case 'KeyA': case 'ArrowLeft':  m.l = false; break;
        case 'KeyD': case 'ArrowRight': m.r = false; break;
        case 'ShiftLeft': m.sprint = false; break;
      }
    });
  }

  /* ─── Mouse look ─── */
  _bindMouse() {
    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      const sens = window._settings ? window._settings.sensitivity * 0.0006 : this.sensitivity;
      this.yaw   -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    });
    document.addEventListener('mousedown', e => {
      if (!this.locked) return;
      if (e.button === 0) this._attack();
      if (e.button === 2) this._startBlock();
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 2) this._endBlock();
    });
    /* Suppress browser context menu while in game */
    document.addEventListener('contextmenu', e => {
      if (this.locked) e.preventDefault();
    });
  }

  /* ─── Pointer lock ─── */
  _bindPointerLock() {
    /* On touch devices skip pointer lock entirely — _bindTouch() handles everything */
    if ('ontouchstart' in window) return;
    const lockOverlay = document.getElementById('lock-overlay');
    this.canvas.addEventListener('click', () => {
      if (!this.locked) this.canvas.requestPointerLock();
    });
    lockOverlay && lockOverlay.addEventListener('click', () => {
      this.canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      lockOverlay && lockOverlay.classList.toggle('hidden', this.locked);
    });
  }

  /* ─── Mobile touch controls ─── */
  _bindTouch() {
    if (!('ontouchstart' in window)) return;

    /* Mobile: bypass pointer lock, always treat as locked */
    this.locked = true;
    const lockOv = document.getElementById('lock-overlay');
    if (lockOv) lockOv.classList.add('hidden');

    /* Show touch overlay */
    const tc = document.getElementById('touch-controls');
    if (tc) tc.classList.remove('hidden');

    /* Hide desktop hints */
    const kh = document.getElementById('key-hints');
    if (kh) kh.style.display = 'none';

    const m  = this.move;
    const JR = 55; // joystick max radius
    let jOrigin = null;

    const jZone = document.getElementById('joystick-zone');
    const jKnob = document.getElementById('joystick-knob');

    const _updateJoy = (cx, cy) => {
      if (!jOrigin) return;
      const dx = cx - jOrigin.x;
      const dy = cy - jOrigin.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const cl  = Math.min(len, JR);
      const nx  = len > 0 ? dx / len : 0;
      const ny  = len > 0 ? dy / len : 0;
      if (jKnob) jKnob.style.transform = `translate(${nx * cl}px,${ny * cl}px)`;
      const thr = 0.28;
      m.f = ny < -thr;
      m.b = ny >  thr;
      m.l = nx < -thr;
      m.r = nx >  thr;
      m.sprint = cl > JR * 0.78;
    };

    const _resetJoy = () => {
      jOrigin = null;
      m.f = m.b = m.l = m.r = m.sprint = false;
      if (jKnob) jKnob.style.transform = 'translate(0,0)';
    };

    if (jZone) {
      jZone.addEventListener('touchstart',  e => { e.preventDefault(); const t = e.changedTouches[0]; jOrigin = { x: t.clientX, y: t.clientY, id: t.identifier }; }, { passive: false });
      jZone.addEventListener('touchmove',   e => { e.preventDefault(); for (const t of e.changedTouches) if (jOrigin && t.identifier === jOrigin.id) _updateJoy(t.clientX, t.clientY); }, { passive: false });
      jZone.addEventListener('touchend',    e => { e.preventDefault(); _resetJoy(); }, { passive: false });
      jZone.addEventListener('touchcancel', ()  => _resetJoy());
    }

    /* Right half = camera look (swipe) */
    const lookZone = document.getElementById('touch-look');
    let lastLook = null;
    if (lookZone) {
      lookZone.addEventListener('touchstart',  e => { e.preventDefault(); const t = e.changedTouches[0]; lastLook = { x: t.clientX, y: t.clientY, id: t.identifier }; }, { passive: false });
      lookZone.addEventListener('touchmove',   e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
          if (lastLook && t.identifier === lastLook.id) {
            const sens = window._settings ? window._settings.sensitivity * 0.0028 : 0.0075;
            this.yaw   -= (t.clientX - lastLook.x) * sens;
            this.pitch -= (t.clientY - lastLook.y) * sens;
            this.pitch  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
            lastLook.x  = t.clientX;
            lastLook.y  = t.clientY;
          }
        }
      }, { passive: false });
      lookZone.addEventListener('touchend',    e => { lastLook = null; }, { passive: false });
      lookZone.addEventListener('touchcancel', ()  => { lastLook = null; });
    }

    /* Action buttons */
    const _btn = (id, down, up) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart',  e => { e.preventDefault(); down && down(); }, { passive: false });
      el.addEventListener('touchend',    e => { e.preventDefault(); up   && up();   }, { passive: false });
      el.addEventListener('touchcancel', ()  => up && up());
    };
    _btn('tbtn-attack',   () => this._attack(), null);
    _btn('tbtn-interact', () => { window._game && window._game.onInteract(); }, null);
    _btn('tbtn-jump',     () => { if (this.onGround) { this.vel.y = this.jumpV; this.onGround = false; } }, null);
    _btn('tbtn-block',    () => this._startBlock(), () => this._endBlock());
  }

  /* ─── Combo attack (3-hit chain) ─── */
  _attack() {
    if (this._swinging) return;
    /* Combo timing: reset chain if > 1.1s since last swing */
    const now = Date.now();
    if (!this._comboTimer || now - this._comboTimer > 1100) this._comboCount = 0;
    this._comboTimer = now;
    this._swingStep  = (this._comboCount || 0) % 3;
    this._comboCount = this._swingStep + 1;
    this._swinging   = true;
    this._swingT     = 0;
    /* Show combo indicator */
    this._updateComboHUD();
    if (window._game) window._game.onAttack(this._swingStep);
  }

  _updateComboHUD() {
    let el = document.getElementById('combo-indicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'combo-indicator';
      const gs = document.getElementById('game-screen');
      if (gs) gs.appendChild(el);
    }
    const step = this._swingStep || 0;
    const labels = ['◆', '◆◆', '◆◆◆ فینیشەر!'];
    el.textContent = labels[step];
    el.className = 'combo-indicator step' + (step + 1);
    clearTimeout(this._comboHudTimer);
    this._comboHudTimer = setTimeout(() => { el.style.opacity = '0'; }, 900);
    el.style.opacity = '1';
  }

  /* ─── Shield block (right-click) ─── */
  _startBlock() {
    if (this._blocking) return;
    this._blocking = true;
    if (this.shieldGroup) {
      /* Raise shield in front of view */
      this.shieldGroup.position.set(0.0, 0.15, -0.1);
      this.shieldGroup.rotation.x = -0.85;
    }
    window._game && window._game.ui && window._game.ui.showNotification('🛡 پەناخەر');
  }

  _endBlock() {
    this._blocking = false;
    if (this.shieldGroup) {
      this.shieldGroup.position.set(0, 0, 0);
      this.shieldGroup.rotation.x = 0;
    }
  }

  /* ─── Update ─── */
  update(dt) {
    if (!this.alive) return;

    /* ── Camera rotation ── */
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    /* ── Screen shake ── */
    if (this._shakeAmt > 0.002) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmt * 0.55;
      this._shakeAmt *= 0.76;
    } else {
      this._shakeAmt = 0;
    }

    /* ── Sprint FOV boost ── */
    const isSprinting = this.move.sprint && this.stamina > 5 &&
      (this.move.f || this.move.b || this.move.l || this.move.r);
    const baseFov = window._settings ? (window._settings.fov || 75) : 75;
    const targetFov = isSprinting ? baseFov + 8 : baseFov;
    this.camera.fov += (targetFov - this.camera.fov) * 0.10;
    this.camera.updateProjectionMatrix();

    /* ── Low-HP vignette ── */
    const vigEl = document.getElementById('hp-vignette');
    if (vigEl) {
      if (this.health < 30) {
        const pulse = 0.3 + Math.sin(Date.now() * 0.004) * 0.25;
        vigEl.style.opacity = String(Math.min(0.9, pulse + (30 - this.health) / 30 * 0.5));
      } else {
        vigEl.style.opacity = '0';
      }
    }

    /* ── Dynamic crosshair spread ── */
    const chEl = document.getElementById('crosshair');
    if (chEl) {
      const isMoving = this.move.f || this.move.b || this.move.l || this.move.r;
      const targetGap = !this.onGround ? 14 : isSprinting ? 11 : isMoving ? 7 : 3;
      this._chGap = (this._chGap !== undefined) ? this._chGap : 3;
      this._chGap += (targetGap - this._chGap) * 0.12;
      const g = Math.round(this._chGap);
      const chH = chEl.querySelector('.ch-h');
      const chV = chEl.querySelector('.ch-v');
      if (chH) chH.style.clipPath = `inset(0 ${g}px)`;
      if (chV) chV.style.clipPath = `inset(${g}px 0)`;
    }

    /* ── Movement ── */
    const sprinting = this.move.sprint && this.stamina > 0;
    const speed  = this.speed * (sprinting ? this.sprintMul : 1.0);
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right   = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const delta   = new THREE.Vector3();
    if (this.move.f) delta.addScaledVector(forward, speed * dt);
    if (this.move.b) delta.addScaledVector(forward, -speed * dt);
    if (this.move.l) delta.addScaledVector(right,   -speed * dt);
    if (this.move.r) delta.addScaledVector(right,    speed * dt);

    this.camera.position.add(delta);

    /* gravity */
    if (!this.onGround) this.vel.y += this.gravity * dt;
    this.camera.position.y += this.vel.y * dt;
    if (this.camera.position.y <= this.height) {
      this.camera.position.y = this.height;
      this.vel.y = 0;
      this.onGround = true;
    }

    /* Boundary clamp */
    this.camera.position.x = Math.max(-290, Math.min(290, this.camera.position.x));
    this.camera.position.z = Math.max(-390, Math.min(390, this.camera.position.z));

    /* ── Head bob ── */
    const moving = this.move.f || this.move.b || this.move.l || this.move.r;

    /* ── Stamina ── */
    const sprinting2 = this.move.sprint && moving && this.stamina > 0;
    if (sprinting2) {
      this.stamina = Math.max(0, this.stamina - 22 * dt);
    } else {
      this.stamina = Math.min(100, this.stamina + 12 * dt);
    }
    if (window._game && window._game.ui) window._game.ui.setStamina(this.stamina);
    if (moving && this.onGround) {
      this.bob += dt * 9 * (this.move.sprint ? 1.5 : 1.0);
      const bobY = Math.sin(this.bob) * this.bobAmp;
      const bobX = Math.cos(this.bob * 0.5) * this.bobAmp * 0.4;
      this.handGroup.position.y = bobY;
      this.handGroup.position.x = bobX;
    } else {
      this.handGroup.position.y *= 0.93;
      this.handGroup.position.x *= 0.93;
    }

    /* ── Sword swing (combo-aware) ── */
    if (this._swinging) {
      const step = this._swingStep || 0;
      /* Finisher is faster, first two are normal speed */
      this._swingT += dt * (step === 2 ? 7 : 5);
      const t = this._swingT;
      /* Different animation per combo step */
      if (this.sword) {
        const HG = this.handGroup;
        if (step === 0) {
          /* Horizontal slash left-to-right */
          HG.rotation.x = -Math.sin(t) * 0.70;
          HG.rotation.z =  Math.sin(t * 0.5) * 0.35;
        } else if (step === 1) {
          /* Overhead downward strike */
          HG.rotation.x = -Math.sin(t) * 1.10;
          HG.rotation.y =  Math.sin(t * 0.35) * 0.30;
        } else {
          /* Spinning finisher */
          HG.rotation.x = -Math.sin(t) * 0.85;
          HG.rotation.z = -Math.sin(t * 1.6) * 0.50;
          HG.rotation.y =  Math.sin(t * 0.55) * 0.45;
        }
      }
      if (t > Math.PI) {
        this._swinging = false;
        const HG = this.handGroup;
        HG.rotation.set(0, 0, 0);
      }
    }

    /* ── Idle sway ── */
    const t = Date.now() * 0.001;
    if (!this._swinging) {
      this.handGroup.rotation.z = Math.sin(t * 0.7) * 0.012;
      this.handGroup.rotation.x = Math.sin(t * 0.5) * 0.008;
    }

    /* ── Compass ── */
    const compassEl = document.getElementById('compass-needle');
    if (compassEl) {
      const dirs = ['N','NW','W','SW','S','SE','E','NE'];
      const deg  = ((this.yaw * 180 / Math.PI) % 360 + 360) % 360;
      compassEl.textContent = dirs[Math.round(deg / 45) % 8];
    }
  }

  /* ─── Raycast to find nearby interactable ─── */
  getNearestInteractable(npcs) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    for (const npc of npcs) {
      const d = npc.mesh.position.distanceTo(this.camera.position);
      if (d < this.interactRange) return npc;
    }
    return null;
  }

  takeDamage(amt) {
    let actual = amt;
    if (this._blocking) {
      /* Block absorbs 80% of damage, minimum 1 */
      actual = Math.max(1, Math.round(amt * 0.20));
      window._audio && window._audio.play('iron_spark', { volume: 0.9 });
      /* Blue tint for block vs red for hit */
      const flash = document.getElementById('hit-flash');
      if (flash) {
        flash.style.boxShadow = 'inset 0 0 80px rgba(80,140,255,0.35)';
        flash.classList.add('active');
        setTimeout(() => { flash.classList.remove('active'); flash.style.boxShadow = ''; }, 180);
      }
    } else {
      const flash = document.getElementById('hit-flash');
      if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 200); }
    }
    this.health = Math.max(0, this.health - actual);
    /* Camera shake proportional to damage taken */
    this._shakeAmt = Math.min(0.42, actual * 0.018);
    const fill = document.getElementById('health-fill');
    const val  = document.getElementById('health-val');
    if (fill) fill.style.width = this.health + '%';
    if (val)  val.textContent  = Math.round(this.health);
    if (this.health <= 0) this.alive = false;
  }

  heal(amt) {
    this.health = Math.min(100, this.health + amt);
    const fill = document.getElementById('health-fill');
    const val  = document.getElementById('health-val');
    if (fill) fill.style.width = this.health + '%';
    if (val)  val.textContent  = Math.round(this.health);
  }

  getPosition() { return this.camera.position.clone(); }
}

window.Player = Player;
