/* ══════════════════════════════════════════════
   npc.js  —  ئاکتەرەکانی ژینگەیی
   ══════════════════════════════════════════════ */
'use strict';

class NPC {
  constructor(scene, spawnData) {
    this.scene    = scene;
    this.id       = spawnData.id;
    this.icon     = spawnData.icon;
    this.chKey    = spawnData.chKey;
    this.pos      = spawnData.pos.clone();
    this.talked   = false;

    this._buildMesh();
    this.mesh.position.copy(this.pos);
    this.scene.add(this.mesh);

    this._idleT = Math.random() * Math.PI * 2;
  }

  /* ─── Build a simple humanoid mesh ─── */
  _buildMesh() {
    const group = new THREE.Group();

    /* Body colour based on role */
    const bodyCol  = this.id.includes('oppressor') ? 0x5a1010 :
                     this.id.includes('elder')      ? 0x4a3a20 :
                     this.id.includes('verdict') || this.id.includes('refuse') || this.id.includes('assessment') ? 0x1e3460 :
                     this.id.includes('ironsmith')  ? 0x3a3a3a :
                     0x5a4a30;
    const skinCol  = 0xc8905c;

    /* Torso */
    const torsoGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.1, 10);
    const torsoMat = new THREE.MeshLambertMaterial({ color: bodyCol });
    const torso    = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.2;
    group.add(torso);

    /* Head */
    const headGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const headMat = new THREE.MeshLambertMaterial({ color: skinCol });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.05;
    group.add(head);

    /* Eyes */
    for (let s of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.035, 5, 5);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const eye    = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(s * 0.095, 2.1, 0.2);
      group.add(eye);
    }

    /* Headdress / turban for non-king */
    if (!this.id.includes('verdict') && !this.id.includes('refuse') && !this.id.includes('assessment')) {
      const turbGeo = new THREE.TorusGeometry(0.2, 0.07, 6, 16);
      const turbMat = new THREE.MeshLambertMaterial({ color: 0xd4b04a });
      const turban  = new THREE.Mesh(turbGeo, turbMat);
      turban.position.y = 2.18;
      turban.rotation.x = Math.PI / 2;
      group.add(turban);
    } else {
      /* Crown for king/Dhul Qarnayn */
      const crownGeo = new THREE.CylinderGeometry(0.23, 0.2, 0.22, 12);
      const crownMat = new THREE.MeshLambertMaterial({
        color: 0xc9a84c,
        emissive: new THREE.Color(0xc9a84c),
        emissiveIntensity: 0.3
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = 2.3;
      group.add(crown);

      /* Crown spikes */
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spkGeo = new THREE.CylinderGeometry(0.02, 0.05, 0.22, 5);
        const spk    = new THREE.Mesh(spkGeo, crownMat.clone());
        spk.position.set(Math.cos(angle) * 0.2, 2.52, Math.sin(angle) * 0.2);
        group.add(spk);
      }
    }

    /* Legs */
    const legMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(bodyCol).multiplyScalar(0.7) });
    for (let s of [-1, 1]) {
      const legGeo  = new THREE.CylinderGeometry(0.1, 0.09, 0.85, 7);
      const leg     = new THREE.Mesh(legGeo, legMat);
      leg.position.set(s * 0.13, 0.42, 0);
      group.add(leg);

      /* Foot */
      const footGeo = new THREE.BoxGeometry(0.14, 0.1, 0.28);
      const foot    = new THREE.Mesh(footGeo, legMat);
      foot.position.set(s * 0.13, 0.05, 0.06);
      group.add(foot);
    }

    /* Arms */
    for (let s of [-1, 1]) {
      const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.85, 7);
      const arm    = new THREE.Mesh(armGeo, new THREE.MeshLambertMaterial({ color: bodyCol }));
      arm.position.set(s * 0.4, 1.35, 0);
      arm.rotation.z = s * 0.25;
      group.add(arm);
    }

    /* Cape for king */
    if (this.id.includes('verdict') || this.id.includes('refuse') || this.id.includes('assessment')) {
      const capeGeo = new THREE.BoxGeometry(0.85, 1.6, 0.06);
      const capeMat = new THREE.MeshLambertMaterial({ color: 0x14295a, side: THREE.DoubleSide });
      const cape    = new THREE.Mesh(capeGeo, capeMat);
      cape.position.set(0, 1.3, -0.3);
      capeMat.transparent = true;
      capeMat.opacity = 0.88;
      group.add(cape);
    }

    /* Floating icon above head */
    this._floatSprite = this._makeFloatSprite(this.icon);
    this._floatSprite.position.y = 2.85;
    group.add(this._floatSprite);

    /* Shadow */
    group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

    this.mesh     = group;
    this._headRef = head;
  }

  _makeFloatSprite(icon) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(201,168,76,0.0)';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#fff';
    ctx.fillText(icon, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.8, 0.8, 0.8);
    return spr;
  }

  /* ─── Update idle animation ─── */
  update(dt, playerPos) {
    this._idleT += dt;
    const playerDist = this.mesh.position.distanceTo(playerPos);

    /* Smooth body turn to face player */
    const targetYaw = Math.atan2(
      playerPos.x - this.pos.x,
      playerPos.z - this.pos.z
    );
    this.mesh.rotation.y += (targetYaw + Math.sin(this._idleT * 0.6) * 0.08 - this.mesh.rotation.y) * 0.04;

    /* Head turn — looks slightly toward player when close */
    if (this._headRef) {
      if (playerDist < 9) {
        const relYaw = targetYaw - this.mesh.rotation.y;
        const clamp  = Math.max(-0.75, Math.min(0.75, relYaw));
        this._headRef.rotation.y += (clamp - this._headRef.rotation.y) * 0.06;
      } else {
        this._headRef.rotation.y *= 0.97; /* slowly return to neutral */
      }
      this._headRef.position.y = 2.05 + Math.sin(this._idleT * 1.2) * 0.02;
    }

    /* Float icon bob */
    if (this._floatSprite) {
      this._floatSprite.position.y = 2.85 + Math.sin(this._idleT * 2) * 0.07;
      this._floatSprite.material.opacity = playerDist < 8 ? 0.9 : 0;
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse(m => {
      if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); }
    });
  }
}

/* ─── NPC Manager ─── */
class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.npcs  = [];
  }

  spawn(spawnList) {
    this.npcs.forEach(n => n.dispose());
    this.npcs = [];
    spawnList.forEach(s => {
      this.npcs.push(new NPC(this.scene, s));
    });
  }

  update(dt, playerPos) {
    this.npcs.forEach(n => n.update(dt, playerPos));
  }

  getNearby(playerPos, range = 5) {
    return this.npcs.find(n =>
      n.mesh.position.distanceTo(playerPos) < range && !n.talked
    ) || null;
  }

  getById(id) { return this.npcs.find(n => n.id === id) || null; }

  dispose() {
    this.npcs.forEach(n => n.dispose());
    this.npcs = [];
  }
}

/* ══════════════════════════════════════════════
   Enemy  —  یاغوج و ماجوج
   ══════════════════════════════════════════════ */
class Enemy {
  constructor(scene, pos, id, waypoints) {
    this.scene   = scene;
    this.id      = id;
    this.pos     = pos.clone();
    this.health  = 80;
    this.maxHealth = 80;
    this.alive   = true;
    this.state   = 'patrol';   // patrol | chase | attack | dead
    this._attackCooldown = 0;
    this._waypoints = waypoints || [
      pos.clone(),
      pos.clone().add(new THREE.Vector3(12, 0, 0)),
      pos.clone().add(new THREE.Vector3(12, 0, 12)),
      pos.clone().add(new THREE.Vector3(0, 0, 12))
    ];
    this._wpIdx = 0;
    this._aggroT = 0;
    this._deathT = 0;
    this._buildMesh();
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  _buildMesh() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a1208 });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x5a2810 });
    const eyeMat  = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const weapMat = new THREE.MeshLambertMaterial({ color: 0x3a3020 });

    /* Torso — hunched, wider */
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.0, 8), bodyMat);
    torso.position.y = 1.1;
    torso.rotation.x = 0.15;
    g.add(torso);

    /* Head — primitive */
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), skinMat);
    head.position.y = 1.95;
    g.add(head);
    this._headRef = head;

    /* Glowing red eyes */
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), eyeMat);
      eye.position.set(s * 0.1, 2.0, 0.24);
      g.add(eye);
    }

    /* Crude horns */
    for (const s of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.07, 0.4, 5);
      const horn    = new THREE.Mesh(hornGeo, weapMat);
      horn.position.set(s * 0.18, 2.28, 0);
      horn.rotation.z = s * 0.5;
      g.add(horn);
    }

    /* Arms — long */
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 1.0, 6), bodyMat);
      arm.position.set(s * 0.47, 1.2, 0);
      arm.rotation.z = s * 0.35;
      g.add(arm);
    }

    /* Legs */
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.9, 6), bodyMat);
      leg.position.set(s * 0.15, 0.45, 0);
      g.add(leg);
    }

    /* Club weapon in right hand */
    const clubGeo = new THREE.CylinderGeometry(0.04, 0.12, 0.9, 6);
    const club    = new THREE.Mesh(clubGeo, weapMat);
    club.position.set(0.8, 1.2, 0.15);
    club.rotation.z = -0.6;
    g.add(club);
    this.clubMesh = club;

    /* Health bar sprite above head */
    this._hpCanvas = document.createElement('canvas');
    this._hpCanvas.width = 128; this._hpCanvas.height = 20;
    this._hpTex = new THREE.CanvasTexture(this._hpCanvas);
    const hpMat = new THREE.SpriteMaterial({ map: this._hpTex, transparent: true, depthTest: false });
    this._hpSprite = new THREE.Sprite(hpMat);
    this._hpSprite.scale.set(1.4, 0.22, 1);
    this._hpSprite.position.y = 2.6;
    g.add(this._hpSprite);
    this._updateHPBar();

    /* Alert “!” sprite — shown when enemy first spots player */
    const alertCanvas = document.createElement('canvas');
    alertCanvas.width = alertCanvas.height = 64;
    const actx = alertCanvas.getContext('2d');
    actx.font = 'bold 52px sans-serif';
    actx.textAlign = 'center'; actx.textBaseline = 'middle';
    actx.fillStyle = '#ffee00';
    actx.fillText('!', 32, 32);
    const alertTex = new THREE.CanvasTexture(alertCanvas);
    const alertMat = new THREE.SpriteMaterial({ map: alertTex, transparent: true, opacity: 0, depthTest: false });
    this._alertSprite = new THREE.Sprite(alertMat);
    this._alertSprite.scale.set(0.55, 0.55, 0.55);
    this._alertSprite.position.set(0, 2.78, 0);
    g.add(this._alertSprite);
    this._alertT   = 0;
    this._alerted  = false;

    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.mesh = g;
  }

  _updateHPBar() {
    if (!this._hpCanvas) return;
    const ctx = this._hpCanvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 128, 20);
    const pct = this.health / this.maxHealth;
    ctx.fillStyle = pct > 0.5 ? '#e84' : pct > 0.25 ? '#ea4' : '#e44';
    ctx.fillRect(2, 3, (124 * pct), 14);
    if (this._hpTex) this._hpTex.needsUpdate = true;
  }

  update(dt, playerPos) {
    /* ── Ragdoll death animation (runs even when !alive) ── */
    if (this._ragdollActive) {
      this._ragdollT = Math.min(1, this._ragdollT + dt * 2.8);
      const ease = 1 - Math.pow(1 - this._ragdollT, 3);
      this.mesh.rotation.x = (Math.PI / 2) * ease;
      this.mesh.position.y = -0.35 * ease;
      if (this._ragdollT >= 1) this._ragdollActive = false;
      return;
    }
    if (!this.alive) return;
    const dist = this.mesh.position.distanceTo(playerPos);

    /* State transitions */
    const _prevState = this.state;
    if      (dist < 2.8)  this.state = 'attack';
    else if (dist < 28)   this.state = 'chase';
    else                  this.state = 'patrol';

    /* Alert “!” when first spotting player */
    if (this._alertSprite) {
      if (!this._alerted && _prevState === 'patrol' &&
          (this.state === 'chase' || this.state === 'attack')) {
        this._alerted = true;
        this._alertT  = 1.4;
      }
      if (this._alertT > 0) {
        this._alertT -= dt;
        this._alertSprite.position.y = 2.78 + Math.sin(Date.now() * 0.012) * 0.06;
        this._alertSprite.material.opacity = Math.min(1, this._alertT * 3);
      } else {
        this._alertSprite.material.opacity = 0;
      }
    }

    if (this.state === 'patrol') {
      const wp  = this._waypoints[this._wpIdx];
      const dir = new THREE.Vector3().subVectors(wp, this.mesh.position);
      dir.y = 0;
      if (dir.length() > 0.8) {
        dir.normalize();
        this.mesh.position.addScaledVector(dir, 2.5 * dt);
        this.mesh.position.y = 0;
        this.mesh.lookAt(this.mesh.position.clone().add(dir));
      } else {
        this._wpIdx = (this._wpIdx + 1) % this._waypoints.length;
      }
    }

    if (this.state === 'chase') {
      const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
      dir.y = 0; dir.normalize();
      this.mesh.position.addScaledVector(dir, 5 * dt);
      this.mesh.position.y = 0;
      this.mesh.lookAt(playerPos);
      /* aggro sound tick */
      this._aggroT += dt;
      if (this._aggroT > 4) {
        this._aggroT = 0;
        window._game && window._game.audio && window._game.audio.play('fire_crackle', { volume: 0.3 });
      }
    }

    if (this.state === 'attack') {
      this._attackCooldown -= dt;
      this.mesh.lookAt(playerPos);
      /* Club swing animation */
      this.clubMesh && (this.clubMesh.rotation.z = -0.6 + Math.sin(Date.now() * 0.01) * 0.6);

      if (this._attackCooldown <= 0) {
        this._attackCooldown = 1.8;
        window._game && window._game.player && window._game.player.takeDamage(12);
        window._game && window._game.audio  && window._game.audio.play('player_hurt', { volume: 0.6 });
      }
    }

    /* Idle head bob */
    if (this._headRef) {
      this._headRef.position.y = 1.95 + Math.sin(Date.now() * 0.003) * 0.025;
    }

    /* HP bar always faces camera */
    const dist2 = this.mesh.position.distanceTo(playerPos);
    this._hpSprite.material.opacity = dist2 < 22 && this.health < this.maxHealth ? 1 : 0;
  }

  takeDamage(amt) {
    if (!this.alive) return;
    this.health -= amt;
    this._updateHPBar();
    window._game && window._game.audio && window._game.audio.play('enemy_hit', { volume: 0.55 });
    /* Flash red */
    this.mesh.traverse(m => {
      if (m.isMesh && m.material && m.material.color) {
        const orig = m.material.color.clone();
        m.material.emissive = new THREE.Color(0xff0000);
        m.material.emissiveIntensity = 0.6;
        setTimeout(() => { m.material.emissive = new THREE.Color(0x000000); m.material.emissiveIntensity = 0; }, 120);
      }
    });
    if (this.health <= 0) this._die();
  }

  _die() {
    this.alive = false;
    this.state = 'dead';
    window._game && window._game.audio && window._game.audio.play('enemy_die', { volume: 0.7 });
    /* Animated ragdoll collapse over ~0.45s */
    this._ragdollT      = 0;
    this._ragdollActive = true;
    /* Fade out after 3s */
    setTimeout(() => { this.mesh.visible = false; }, 3000);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
  }
}

/* ══════════════════════════════════════════════
   BossEnemy  —  قایدی یاغوج  (باشی مەزن)
   ══════════════════════════════════════════════ */
class BossEnemy extends Enemy {
  constructor(scene, pos, id, waypoints) {
    super(scene, pos, id, waypoints);
    this.isBoss    = true;
    this.health    = 200;
    this.maxHealth = 200;

    /* Scale up and recolour */
    this.mesh.scale.set(1.9, 1.9, 1.9);
    this.mesh.traverse(m => {
      if (!m.isMesh || !m.material || !m.material.color) return;
      const hex = m.material.color.getHex();
      if (hex === 0x2a1208) m.material.color.set(0x5a0808);
      if (hex === 0x5a2810) m.material.color.set(0x8a2808);
      if (hex === 0x3a3020) m.material.color.set(0x2a1200);
    });

    /* Crown of 5 extra horns */
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x1a0000 });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.38, 5), hornMat);
      h.position.set(Math.cos(angle) * 0.2, 2.5, Math.sin(angle) * 0.2);
      h.rotation.z = Math.cos(angle) * 0.55;
      h.rotation.x = Math.sin(angle) * 0.55;
      this.mesh.add(h);
    }

    /* Red aura point-light */
    this._bossLight = new THREE.PointLight(0xff2200, 2.5, 14);
    this._bossLight.position.set(0, 0.6, 0);
    this.mesh.add(this._bossLight);

    this._updateHPBar();
  }

  update(dt, playerPos) {
    /* Track cooldown before parent update to detect when attack fires */
    const preCooldown = this._attackCooldown;
    super.update(dt, playerPos);

    /* Boss deals DOUBLE damage: parent already called takeDamage(12), we add 12 more = 24 total */
    if (preCooldown <= 0 && this._attackCooldown > 1.0) {
      window._game && window._game.player && window._game.player.takeDamage(12);
    }

    /* Pulse aura */
    if (this._bossLight) {
      this._bossLight.intensity = 2.0 + Math.sin(Date.now() * 0.004) * 0.9;
    }
    /* Boss chases faster than base: add extra velocity when chasing */
    if (this.state === 'chase') {
      const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
      dir.y = 0;
      if (dir.length() > 0.1) {
        dir.normalize();
        this.mesh.position.addScaledVector(dir, 1.6 * dt);
      }
    }
  }

  dispose() {
    if (this._bossLight) this.mesh.remove(this._bossLight);
    super.dispose();
  }
}

/* ─── Enemy Manager ─── */
class EnemyManager {
  constructor(scene) {
    this.scene   = scene;
    this.enemies = [];
    this.killCount = 0;
  }

  spawn(spawnList) {
    this.enemies.forEach(e => e.dispose());
    this.enemies = [];
    spawnList.forEach(s => {
      this.enemies.push(new Enemy(this.scene, s.pos, s.id, s.waypoints));
    });
  }

  update(dt, playerPos) {
    this.enemies.forEach(e => e.update(dt, playerPos));
  }

  getNearest(playerPos, range = 3) {
    return this.enemies
      .filter(e => e.alive && e.mesh.position.distanceTo(playerPos) < range)
      .sort((a, b) => a.mesh.position.distanceTo(playerPos) - b.mesh.position.distanceTo(playerPos))[0] || null;
  }

  allDefeated() {
    return this.enemies.length > 0 && this.enemies.every(e => !e.alive);
  }

  /* Spawn a single enemy (used by wave system) */
  spawnOne(spawnData) {
    /* Remove dead enemies to keep array clean */
    this.enemies = this.enemies.filter(e => e.alive);
    const pos = spawnData.pos instanceof THREE.Vector3
      ? spawnData.pos.clone()
      : new THREE.Vector3(spawnData.pos.x, spawnData.pos.y || 0, spawnData.pos.z);
    const e = new Enemy(this.scene, pos, spawnData.id || ('w' + Date.now()), spawnData.waypoints || []);
    this.enemies.push(e);
  }

  /* Spawn the boss enemy (wave 3) */
  spawnBoss(spawnData) {
    this.enemies = this.enemies.filter(e => e.alive);
    const pos = spawnData.pos instanceof THREE.Vector3
      ? spawnData.pos.clone()
      : new THREE.Vector3(spawnData.pos.x, spawnData.pos.y || 0, spawnData.pos.z);
    const boss = new BossEnemy(this.scene, pos, 'boss_' + Date.now(), spawnData.waypoints || []);
    this.enemies.push(boss);
  }

  dispose() {
    this.enemies.forEach(e => e.dispose());
    this.enemies = [];
  }
}

window.NPC          = NPC;
window.NPCManager   = NPCManager;
window.Enemy        = Enemy;
window.BossEnemy    = BossEnemy;
window.EnemyManager = EnemyManager;
