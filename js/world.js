/* ══════════════════════════════════════════════
   world.js  —  جیهانەکانی سێ بەش
   ══════════════════════════════════════════════ */
'use strict';

/* ─── Shared materials ─── */
const MAT = {
  sand:   () => new THREE.MeshLambertMaterial({ color: 0xc8a96a }),
  rock:   () => new THREE.MeshLambertMaterial({ color: 0x5a4a32 }),
  stone:  () => new THREE.MeshLambertMaterial({ color: 0x7a6a50 }),
  iron:   () => new THREE.MeshLambertMaterial({ color: 0x4a4a5a, emissive: new THREE.Color(0xff2200), emissiveIntensity: 0 }),
  copper: () => new THREE.MeshLambertMaterial({ color: 0x8a5a2a }),
  water:  () => new THREE.MeshLambertMaterial({ color: 0x223355, transparent: true, opacity: 0.7 }),
  mud:    () => new THREE.MeshLambertMaterial({ color: 0x3a3020 }),
  grass:  () => new THREE.MeshLambertMaterial({ color: 0x4a6a2a }),
  wood:   () => new THREE.MeshLambertMaterial({ color: 0x6a4010 }),
  gold:   () => new THREE.MeshLambertMaterial({ color: 0xc9a84c, emissive: new THREE.Color(0xc9a84c), emissiveIntensity: 0.15 })
};

function geo(g) { return g; }

/* ══════════  CHAPTER 1 — THE WEST  ══════════ */
class WorldWest {
  constructor(scene, effects) {
    this.scene   = scene;
    this.effects = effects;
    this.objects = [];
    this.npcs    = [];
    this.triggers = [];
    this._build();
  }

  _build() {
    const S = this.scene;

    /* Ground — vast sandy plain */
    const groundGeo = new THREE.PlaneGeometry(600, 600, 60, 60);
    this._perturbTerrain(groundGeo, 0.8);
    const ground = new THREE.Mesh(groundGeo, MAT.sand());
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    S.add(ground); this.objects.push(ground);

    /* Muddy pool (the عين حمئة) */
    const poolGeo = new THREE.CircleGeometry(22, 40);
    const pool    = new THREE.Mesh(poolGeo, MAT.mud());
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-60, 0.05, -80);
    pool.receiveShadow = true;
    S.add(pool);

    /* Water shimmering on the pool */
    const waterGeo = new THREE.CircleGeometry(21.5, 40);
    const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({
      color: 0x4a3a20, transparent: true, opacity: 0.6 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(-60, 0.08, -80);
    S.add(water);
    this.waterMesh = water;

    /* Rocky ridges on horizon */
    this._buildRockLine(-160, -120, 20, 18, 0xa08060);
    this._buildRockLine(140,  -100, 16, 15, 0x907050);

    /* Ancient city ruins */
    this._buildCity(30, 0, 20);

    /* Sunset lighting */
    const ambient = new THREE.AmbientLight(0xff8844, 0.45);
    S.add(ambient);
    const sun = new THREE.DirectionalLight(0xff6600, 1.4);
    sun.position.set(-200, 60, -200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    S.add(sun);

    /* Sky + sun disk */
    this.effects.createSkyDome('west');
    this.effects.createSun(new THREE.Vector3(-200, 30, -300), false);
    this.effects.createDustSystem(300, 600);

    /* God rays in west direction */
    this.effects.godRays.forEach(r => { r.position.set(-160, 40, -220); });

    /* Torches in city */
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      this.effects.createTorch(new THREE.Vector3(
        30 + Math.cos(angle) * 40,
        0,
        20 + Math.sin(angle) * 40
      ));
    }

    /* Trigger zones */
    this.triggers.push(
      { pos: new THREE.Vector3(-60, 0, -80), radius: 10, id: 'arrive_west', fired: false },
      { pos: new THREE.Vector3(30,  0, 20),  radius: 12, id: 'enter_city',  fired: false }
    );

    /* NPC spawn points */
    this.npcSpawns = [
      { pos: new THREE.Vector3(35, 0, 25),  id: 'ch1_elder',     icon: '🧓', chKey: 'ch1' },
      { pos: new THREE.Vector3(20, 0, 10),  id: 'ch1_oppressor', icon: '👺', chKey: 'ch1' }
    ];
  }

  _perturbTerrain(geo, amp) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const z = pos.getZ(i);
      pos.setZ(i, pos.getZ(i) +
        (Math.sin(x * 0.07) * Math.cos(z * 0.06) * amp +
         Math.sin(x * 0.3 + z * 0.2) * amp * 0.3));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  _buildRockLine(xStart, z, count, maxH, col) {
    for (let i = 0; i < count; i++) {
      const w = 5 + Math.random() * 14;
      const h = 4 + Math.random() * maxH;
      const d = 5 + Math.random() * 12;
      const g = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.MeshLambertMaterial({ color: col });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(xStart + i * (260 / count) + (Math.random() - 0.5) * 20,
                        h / 2 - 0.3,
                        z + (Math.random() - 0.5) * 25);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.castShadow = mesh.receiveShadow = true;
      this.scene.add(mesh); this.objects.push(mesh);
    }
  }

  _buildCity(cx, cy, cz) {
    /* Walls */
    const wallH = 8, wallT = 1.5;
    const walls = [
      { w: 80, h: wallH, d: wallT, x: cx,       z: cz + 40 },
      { w: 80, h: wallH, d: wallT, x: cx,       z: cz - 40 },
      { w: wallT, h: wallH, d: 80, x: cx + 40,  z: cz },
      { w: wallT, h: wallH, d: 80, x: cx - 40,  z: cz }
    ];
    walls.forEach(w => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, w.h, w.d), MAT.stone());
      m.position.set(w.x, w.h / 2, w.z);
      m.castShadow = m.receiveShadow = true;
      this.scene.add(m); this.objects.push(m);
    });

    /* Buildings */
    for (let i = 0; i < 18; i++) {
      const bw = 4 + Math.random() * 7,
            bh = 3 + Math.random() * 8,
            bd = 4 + Math.random() * 7;
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), MAT.stone());
      m.position.set(cx + (Math.random() - 0.5) * 65,
                     bh / 2,
                     cz + (Math.random() - 0.5) * 65);
      m.castShadow = m.receiveShadow = true;
      this.scene.add(m); this.objects.push(m);
    }

    /* Central throne/platform */
    const platGeo = new THREE.CylinderGeometry(8, 10, 1.5, 12);
    const plat = new THREE.Mesh(platGeo, MAT.stone());
    plat.position.set(cx, 0.75, cz);
    this.scene.add(plat);

    /* Throne */
    const throneGeo = new THREE.BoxGeometry(2.5, 4, 1.5);
    const throne = new THREE.Mesh(throneGeo, MAT.gold());
    throne.position.set(cx, 3.5, cz);
    this.scene.add(throne);
  }

  update(dt, playerPos) {
    this.waterMesh && (this.waterMesh.material.opacity = 0.55 + Math.sin(Date.now() * 0.002) * 0.1);
    /* Check triggers */
    this.triggers.forEach(t => {
      if (!t.fired && playerPos.distanceTo(t.pos) < t.radius) {
        t.fired = true;
        window._game && window._game.onTrigger(t.id);
      }
    });
  }

  getColliders() { return this.objects; }
  dispose() {
    this.objects.forEach(o => { this.scene.remove(o); o.geometry && o.geometry.dispose(); });
    this.effects.dispose();
  }
}

/* ══════════  CHAPTER 2 — THE EAST  ══════════ */
class WorldEast {
  constructor(scene, effects) {
    this.scene   = scene;
    this.effects = effects;
    this.objects = [];
    this.triggers = [];
    this._build();
  }

  _build() {
    const S = this.scene;

    /* Ground — scorched earth, no shade */
    const groundGeo = new THREE.PlaneGeometry(600, 600, 60, 60);
    this._perturbFlat(groundGeo, 0.4);
    const ground = new THREE.Mesh(groundGeo,
      new THREE.MeshLambertMaterial({ color: 0xd4b06a }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    S.add(ground); this.objects.push(ground);

    /* Cracked earth lines */
    this._buildCracks(0, 0);

    /* Scatter of small stones — no shelter */
    for (let i = 0; i < 60; i++) {
      const r = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 + Math.random() * 0.9, 6, 6),
        MAT.rock()
      );
      r.position.set((Math.random() - 0.5) * 200, 0.4, (Math.random() - 0.5) * 200);
      r.castShadow = true;
      S.add(r); this.objects.push(r);
    }

    /* Village huts (primitive, no roof) — just walls */
    this._buildVillage(20, 0, -30);

    /* Harsh overhead sun */
    const ambient = new THREE.AmbientLight(0xffddaa, 0.7);
    S.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff0cc, 2.2);
    sun.position.set(80, 140, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    S.add(sun);

    this.effects.createSkyDome('east');
    this.effects.createSun(new THREE.Vector3(80, 180, -200), true);

    /* No dust — open exposed land */
    this.effects.godRays.forEach((r, i) => {
      r.position.set(0, 80, -100);
      r.material.opacity = 0.04;
    });

    this.triggers.push(
      { pos: new THREE.Vector3(0, 0, 0),   radius: 8, id: 'arrive_east', fired: false },
      { pos: new THREE.Vector3(20, 0, -30), radius: 10, id: 'meet_villagers', fired: false }
    );

    this.npcSpawns = [
      { pos: new THREE.Vector3(22, 0, -28), id: 'ch2_villager',   icon: '🧑', chKey: 'ch2' },
      { pos: new THREE.Vector3(10, 0, -40), id: 'ch2_assessment', icon: '👑', chKey: 'ch2' }
    ];
  }

  _perturbFlat(geo, amp) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * amp);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  }

  _buildCracks(cx, cz) {
    for (let i = 0; i < 40; i++) {
      const len = 4 + Math.random() * 20;
      const w   = 0.05 + Math.random() * 0.1;
      const geo = new THREE.BoxGeometry(len, 0.05, w);
      const m   = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x7a5a30 }));
      m.position.set(cx + (Math.random() - 0.5) * 200, 0.03, cz + (Math.random() - 0.5) * 200);
      m.rotation.y = Math.random() * Math.PI;
      this.scene.add(m);
    }
  }

  _buildVillage(cx, cy, cz) {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const r     = 20 + Math.random() * 10;
      const wx  = cx + Math.cos(angle) * r;
      const wz  = cz + Math.sin(angle) * r;
      /* Hut walls — no roof (no shelter motif) */
      const wGeo = new THREE.BoxGeometry(5, 2.5 + Math.random() * 1.5, 5);
      const wMat = new THREE.MeshLambertMaterial({ color: 0xb89a68 });
      const hut  = new THREE.Mesh(wGeo, wMat);
      hut.position.set(wx, 1.25, wz);
      hut.castShadow = hut.receiveShadow = true;
      this.scene.add(hut); this.objects.push(hut);
    }
    /* Well in centre */
    const wellGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 16, 1, true);
    const well = new THREE.Mesh(wellGeo, MAT.stone());
    well.position.set(cx, 0.5, cz);
    this.scene.add(well);
  }

  update(dt, playerPos) {
    this.triggers.forEach(t => {
      if (!t.fired && playerPos.distanceTo(t.pos) < t.radius) {
        t.fired = true;
        window._game && window._game.onTrigger(t.id);
      }
    });
  }

  getColliders() { return this.objects; }
  dispose() {
    this.objects.forEach(o => { this.scene.remove(o); o.geometry && o.geometry.dispose(); });
    this.effects.dispose();
  }
}

/* ══════════  CHAPTER 3 — THE WALL  ══════════ */
class WorldWall {
  constructor(scene, effects) {
    this.scene    = scene;
    this.effects  = effects;
    this.objects  = [];
    this.triggers = [];
    this.wallSections = [];
    this.wallProgress = 0;
    this._build();
  }

  _build() {
    const S = this.scene;

    /* Valley floor */
    const groundGeo = new THREE.PlaneGeometry(400, 800, 40, 80);
    this._valleyTerrain(groundGeo);
    const ground = new THREE.Mesh(groundGeo, MAT.stone());
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    S.add(ground); this.objects.push(ground);

    /* Two massive mountain walls on left & right */
    this._buildMountainWall(-80,  0, true);
    this._buildMountainWall( 80,  0, false);

    /* Gap between mountains — where the wall is built */
    this._buildWallFoundation(0, 0, 0);

    /* Furnace / forge area */
    this._buildForge(-20, 0, 30);

    /* Iron plates / material pile */
    this._buildIronPile(20, 0, 20);

    /* Pre-existing ruins hinting at past */
    this._buildRuins(-30, 0, -60);

    /* Dark / overcast lighting for dramatic feel */
    const ambient = new THREE.AmbientLight(0x8899bb, 0.5);
    S.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xccddff, 1.0);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    S.add(dirLight);

    /* Forge point lights */
    const forgeLight = new THREE.PointLight(0xff4400, 3.0, 40, 2);
    forgeLight.position.set(-20, 4, 30);
    S.add(forgeLight);
    this.forgeLight = forgeLight;

    this.effects.createSkyDome('wall');

    /* Torches along the work site */
    for (let z = -50; z <= 50; z += 20) {
      this.effects.createTorch(new THREE.Vector3(-5, 0, z));
      this.effects.createTorch(new THREE.Vector3( 5, 0, z));
    }

    this.triggers.push(
      { pos: new THREE.Vector3(0, 0, 0),    radius: 12, id: 'arrive_valley',   fired: false },
      { pos: new THREE.Vector3(-20, 0, 30), radius: 8,  id: 'approach_forge',  fired: false },
      { pos: new THREE.Vector3(0, 0, -60),  radius: 8,  id: 'see_ruins',       fired: false }
    );

    this.npcSpawns = [
      { pos: new THREE.Vector3(-10, 0, 15),  id: 'ch3_elder',     icon: '🧔', chKey: 'ch3' },
      { pos: new THREE.Vector3(-20, 0, 30),  id: 'ch3_ironsmith', icon: '⚒️', chKey: 'ch3' },
      { pos: new THREE.Vector3(5, 0, -5),    id: 'ch3_refuse',    icon: '👑', chKey: 'ch3' }
    ];

    /* Gog & Magog enemy spawn positions — locked behind wall gap */
    this.enemySpawns = [
      {
        id: 'gogmagog_1',
        pos: new THREE.Vector3(-30, 0, -80),
        waypoints: [
          new THREE.Vector3(-30, 0, -80), new THREE.Vector3(-10, 0, -90),
          new THREE.Vector3(10, 0, -80),  new THREE.Vector3(-10, 0, -70)
        ]
      },
      {
        id: 'gogmagog_2',
        pos: new THREE.Vector3(20, 0, -100),
        waypoints: [
          new THREE.Vector3(20, 0, -100), new THREE.Vector3(30, 0, -80),
          new THREE.Vector3(10, 0, -75),  new THREE.Vector3(0, 0, -95)
        ]
      },
      {
        id: 'gogmagog_3',
        pos: new THREE.Vector3(-5, 0, -120),
        waypoints: [
          new THREE.Vector3(-5, 0, -120), new THREE.Vector3(15, 0, -110),
          new THREE.Vector3(5, 0, -95),   new THREE.Vector3(-15, 0, -105)
        ]
      }
    ];
    this.ironCollected = 0;
  }

  _valleyTerrain(geo) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      /* Valley shape: higher on sides */
      const sideRise = Math.max(0, (Math.abs(x) - 50) * 0.18);
      pos.setZ(i, pos.getZ(i) + sideRise + (Math.random() - 0.5) * 0.5);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  }

  _buildMountainWall(x, y, left) {
    const H = 160, W = 60, D = 400;
    /* Layered rock slabs */
    for (let layer = 0; layer < 12; layer++) {
      const lh  = H / 12;
      const bump = (Math.random() - 0.5) * 6;
      const geo  = new THREE.BoxGeometry(W + bump, lh, D);
      const col  = new THREE.Color().setHSL(0.07, 0.25, 0.22 + layer * 0.012);
      const mat  = new THREE.MeshLambertMaterial({ color: col });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + (left ? -bump * 0.5 : bump * 0.5),
                        layer * lh + lh / 2 - 0.5,
                        y);
      mesh.castShadow = mesh.receiveShadow = true;
      this.scene.add(mesh); this.objects.push(mesh);
    }
  }

  _buildWallFoundation(x, y, z) {
    /* Stone base foundation */
    const baseGeo = new THREE.BoxGeometry(90, 2.5, 30);
    const base = new THREE.Mesh(baseGeo, MAT.stone());
    base.position.set(x, 1.25, z);
    base.receiveShadow = base.castShadow = true;
    this.scene.add(base);

    /* Scaffolding */
    for (let i = -3; i <= 3; i++) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 14, 6),
        MAT.wood()
      );
      post.position.set(x + i * 12, 7, z + 16);
      this.scene.add(post);
      /* horizontal beams */
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.3, 0.3),
        MAT.wood()
      );
      beam.position.set(x + i * 12 + 5, 8, z + 16);
      this.scene.add(beam);
    }
  }

  _buildForge(x, y, z) {
    /* Furnace box */
    const furnaceGeo = new THREE.BoxGeometry(6, 5, 5);
    const furnaceMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const furnace = new THREE.Mesh(furnaceGeo, furnaceMat);
    furnace.position.set(x, 2.5, z);
    furnace.castShadow = true;
    this.scene.add(furnace); this.objects.push(furnace);

    /* Chimney */
    const chimGeo = new THREE.CylinderGeometry(0.6, 0.8, 6, 8);
    const chimney = new THREE.Mesh(chimGeo, new THREE.MeshLambertMaterial({ color: 0x333333 }));
    chimney.position.set(x, 8, z);
    this.scene.add(chimney);

    /* Glow opening */
    const glowGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x + 3.1, 2.5, z);
    glow.rotation.y = Math.PI / 2;
    this.scene.add(glow);
    this.forgeMouth = glow;
  }

  _buildIronPile(x, y, z) {
    /* Decorative iron pile (non-interactive) */
    for (let i = 0; i < 16; i++) {
      const ironGeo = new THREE.BoxGeometry(
        0.8 + Math.random() * 1.5,
        0.2 + Math.random() * 0.4,
        0.5 + Math.random() * 1.2
      );
      const ironMat = new THREE.MeshLambertMaterial({ color: 0x5a5a6a });
      const plate = new THREE.Mesh(ironGeo, ironMat);
      plate.position.set(
        x + (Math.random() - 0.5) * 8,
        0.2 + Math.floor(i / 5) * 0.25,
        z + (Math.random() - 0.5) * 6
      );
      plate.rotation.y = Math.random() * Math.PI;
      this.scene.add(plate); this.objects.push(plate);
    }

    /* ── Interactive collectible iron plates (12 of them) ── */
    this.ironPickups = [];
    const positions = [
      [x + 10, z + 5], [x + 14, z - 3], [x + 8, z + 12],
      [x - 12, z + 8], [x - 8, z - 5], [x + 18, z + 8],
      [x - 18, z + 3], [x + 5, z - 12], [x - 5, z + 18],
      [x + 22, z - 8], [x - 22, z + 10], [x + 0, z + 25]
    ];
    positions.forEach((p, i) => {
      const geo = new THREE.BoxGeometry(1.2, 0.25, 0.9);
      const mat = new THREE.MeshLambertMaterial({
        color: 0x8aaabb,
        emissive: new THREE.Color(0x224466),
        emissiveIntensity: 0.4
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p[0], 0.12, p[1]);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.castShadow = true;
      this.scene.add(mesh);
      /* Small glow point light above each iron piece */
      const pl = new THREE.PointLight(0x6699ff, 0.8, 5);
      pl.position.set(p[0], 0.8, p[1]);
      this.scene.add(pl);
      this.ironPickups.push({ mesh, light: pl, collected: false, pos: new THREE.Vector3(p[0], 0.12, p[1]) });
    });
  }

  _buildRuins(x, y, z) {
    for (let i = 0; i < 8; i++) {
      const h = 1 + Math.random() * 5;
      const ruinGeo = new THREE.BoxGeometry(2, h, 2);
      const ruin = new THREE.Mesh(ruinGeo, MAT.stone());
      ruin.position.set(x + (Math.random() - 0.5) * 40, h / 2, z + (Math.random() - 0.5) * 30);
      ruin.rotation.y = Math.random() * 0.4;
      this.scene.add(ruin); this.objects.push(ruin);
    }
  }

  buildWallSection(progress) {
    /* Progressively build iron wall sections */
    const maxSections = 12;
    const targetSection = Math.floor(progress * maxSections);
    while (this.wallSections.length < targetSection) {
      const idx = this.wallSections.length;
      const x   = -44 + idx * 8;
      const sectionGeo = new THREE.BoxGeometry(8, 16 + Math.random() * 4, 6);
      const sectionMat = new THREE.MeshLambertMaterial({
        color: 0x5a5a6a,
        emissive: new THREE.Color(0xff2200),
        emissiveIntensity: 0.8
      });
      const sec = new THREE.Mesh(sectionGeo, sectionMat);
      sec.position.set(x, 9, 0);
      sec.castShadow = sec.receiveShadow = true;
      this.scene.add(sec);
      this.wallSections.push(sec);
      this.effects.spawnIronSparks(new THREE.Vector3(x, 16, 0), 80);
    }
    this.wallProgress = progress;
  }

  /* ── Collect an iron pickup by index ── */
  collectIron(idx) {
    if (!this.ironPickups || !this.ironPickups[idx]) return false;
    const p = this.ironPickups[idx];
    if (p.collected) return false;
    p.collected = true;
    p.mesh.visible  = false;
    p.light.visible = false;
    this.ironCollected++;
    return true;
  }

  /* ── Find nearest uncollected iron pickup to a position ── */
  nearestIronPickup(playerPos, range = 3.5) {
    if (!this.ironPickups) return -1;
    let best = -1, bestD = range;
    this.ironPickups.forEach((p, i) => {
      if (p.collected) return;
      const d = p.pos.distanceTo(playerPos);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  update(dt, playerPos) {
    this.triggers.forEach(t => {
      if (!t.fired && playerPos.distanceTo(t.pos) < t.radius) {
        t.fired = true;
        window._game && window._game.onTrigger(t.id);
      }
    });

    /* Forge glow flicker */
    if (this.forgeMouth) {
      this.forgeMouth.material.opacity = 0.7 + Math.sin(Date.now() * 0.01) * 0.25;
    }
    if (this.forgeLight) {
      this.forgeLight.intensity = 2.5 + Math.sin(Date.now() * 0.013) * 1.0;
    }

    /* Cool wall sections over time */
    this.wallSections.forEach((s, i) => {
      const age = Date.now() / 1000 - i * 3;
      if (age > 0) {
        s.material.emissiveIntensity = Math.max(0, 0.8 - age * 0.06);
      }
    });

    /* Animate iron pickups — gentle float + point-light pulse */
    if (this.ironPickups) {
      const t = Date.now() * 0.002;
      this.ironPickups.forEach((p, i) => {
        if (p.collected) return;
        p.mesh.position.y = 0.12 + Math.sin(t + i * 0.9) * 0.12;
        p.mesh.rotation.y = t * 0.5 + i;
        p.light.intensity = 0.6 + Math.sin(t * 1.5 + i) * 0.3;
        /* Show interact hint when very close */
        const d = p.pos.distanceTo(playerPos);
        if (d < 3) {
          p.mesh.material.emissiveIntensity = 1.0;
        } else {
          p.mesh.material.emissiveIntensity = 0.4;
        }
      });
    }
  }

  getColliders() { return this.objects; }
  dispose() {
    this.objects.forEach(o => { this.scene.remove(o); o.geometry && o.geometry.dispose(); });
    this.wallSections.forEach(s => { this.scene.remove(s); s.geometry.dispose(); });
    if (this.ironPickups) {
      this.ironPickups.forEach(p => {
        this.scene.remove(p.mesh); this.scene.remove(p.light);
        p.mesh.geometry.dispose(); p.mesh.material.dispose();
      });
    }
    this.effects.dispose();
  }
}

/* ══════════  Factory  ══════════ */
function createWorld(chapterNum, scene, effects) {
  switch (chapterNum) {
    case 1: return new WorldWest(scene, effects);
    case 2: return new WorldEast(scene, effects);
    case 3: return new WorldWall(scene, effects);
    default: return new WorldWest(scene, effects);
  }
}

window.createWorld = createWorld;
window.WorldWest   = WorldWest;
window.WorldEast   = WorldEast;
window.WorldWall   = WorldWall;
