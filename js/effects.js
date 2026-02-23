/* ══════════════════════════════════════════════
   effects.js  —  پارتیکلەو شایدەرەکان
   ══════════════════════════════════════════════ */
'use strict';

class Effects {
  constructor(scene) {
    this.scene    = scene;
    this.particles = [];
    this.sparks    = [];
    this.time      = 0;
    this._initGodRays();
  }

  /* ── God-ray planes (additive quads) ── */
  _initGodRays() {
    this.godRays = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.PlaneGeometry(8, 120);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        transparent: true,
        opacity: 0.025 + Math.random() * 0.02,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 40, -80);
      mesh.rotation.z = (i / 6) * Math.PI * 2;
      mesh.userData.baseOpacity = mat.opacity;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
      this.godRays.push(mesh);
    }
  }

  /* ── Ember / Fire Particles ── */
  spawnEmbers(pos, count = 30) {
    const geo = new THREE.BufferGeometry();
    const posArr = [];
    const velArr = [];
    for (let i = 0; i < count; i++) {
      posArr.push(pos.x + (Math.random() - 0.5) * 2,
                  pos.y,
                  pos.z + (Math.random() - 0.5) * 2);
      velArr.push((Math.random() - 0.5) * 4,
                  2 + Math.random() * 5,
                  (Math.random() - 0.5) * 4);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.particles.push({ pts, vel: velArr, life: 1.0 });
  }

  /* ── Molten Iron Sparks ── */
  spawnIronSparks(pos, count = 60) {
    const positions = [];
    const velocities = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      positions.push(pos.x, pos.y + 1, pos.z);
      velocities.push(Math.cos(angle) * speed * 0.7,
                      2 + Math.random() * 6,
                      Math.sin(angle) * speed * 0.7);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.12,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.sparks.push({ pts, vel: velocities, life: 1.0, count });
  }

  /* ── Dust / Sand Particles ── */
  createDustSystem(area = 200, count = 800) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * area;
      positions[i * 3 + 1] = Math.random() * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xc8aa7a,
      size: 0.08,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.dust = new THREE.Points(geo, mat);
    this.scene.add(this.dust);
    this.dustPositions = positions;
    this.dustArea = area;
  }

  /* ── Weather System ──
     type: 'sandstorm' | 'ash' | 'snow'
  */
  createWeather(type) {
    if (this._weatherMesh) {
      this.scene.remove(this._weatherMesh);
      this._weatherMesh = null;
    }
    if (!type) { this._weatherType = null; return; } /* null = clear weather */
    this._weatherType = type;
    const COUNT = type === 'sandstorm' ? 4000 : 2500;
    const positions = new Float32Array(COUNT * 3);
    const SPREAD = 140;
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * SPREAD;
      positions[i * 3 + 1] = Math.random() * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const colMap = { sandstorm: 0xd4a060, ash: 0x888888, snow: 0xddeeff };
    const sizeMap = { sandstorm: 0.06, ash: 0.1, snow: 0.12 };
    const mat = new THREE.PointsMaterial({
      color:  colMap[type]  || 0xffffff,
      size:   sizeMap[type] || 0.08,
      transparent: true,
      opacity: type === 'sandstorm' ? 0.65 : 0.45,
      depthWrite: false,
      sizeAttenuation: true
    });
    this._weatherMesh = new THREE.Points(geo, mat);
    this._weatherPositions = positions;
    this._weatherCount = COUNT;
    this.scene.add(this._weatherMesh);
  }

  /* ── Blood splatter ── */
  spawnBlood(pos, count = 28) {
    const posArr = [], velArr = [];
    for (let i = 0; i < count; i++) {
      posArr.push(pos.x, pos.y + 0.8, pos.z);
      velArr.push((Math.random() - 0.5) * 6,
                   1.5 + Math.random() * 4,
                  (Math.random() - 0.5) * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcc0000,
      size: 0.14,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.particles.push({ pts, vel: velArr, life: 0.8 });
  }

  /* ── Sky Dome (procedural) ── */
  createSkyDome(type) {
    if (this.skyDome) { this.scene.remove(this.skyDome); this.skyDome = null; }
    const geo = new THREE.SphereGeometry(500, 32, 16);
    geo.scale(-1, 1, 1);

    let fragShader;
    const vertSrc   = document.getElementById('vert-sky').textContent;
    if (type === 'west') fragShader = document.getElementById('frag-sky-west').textContent;
    else if (type === 'east') fragShader = document.getElementById('frag-sky-east').textContent;
    else fragShader = document.getElementById('frag-sky-wall').textContent;

    const mat = new THREE.ShaderMaterial({
      vertexShader:   vertSrc,
      fragmentShader: fragShader,
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyDome    = new THREE.Mesh(geo, mat);
    this.skyMat     = mat;
    this.scene.add(this.skyDome);
  }

  /* ── Sun / Light Disk ── */
  createSun(pos, day = false) {
    if (this.sunMesh) this.scene.remove(this.sunMesh);
    const sunGeo = new THREE.SphereGeometry(day ? 14 : 8, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: day ? 0xffeeaa : 0xff5500,
      transparent: true, opacity: 0.95
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.copy(pos);
    this.scene.add(this.sunMesh);

    // Glow halo
    const haloGeo = new THREE.SphereGeometry(day ? 28 : 16, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: day ? 0xffffa0 : 0xff3300,
      transparent: true, opacity: 0.12,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sunHalo.position.copy(pos);
    this.scene.add(this.sunHalo);
  }

  /* ── Torch Flame ── */
  createTorch(pos) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // pole
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x4a2800 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0;
    group.add(pole);

    // flame (billboard)
    const flameGeo = new THREE.PlaneGeometry(0.5, 0.7);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true, opacity: 0.85,
      depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 1.4;
    group.add(flame);

    // point light
    const light = new THREE.PointLight(0xff8830, 1.5, 18, 2);
    light.position.y = 1.5;
    group.add(light);

    group.userData.flame  = flame;
    group.userData.light  = light;
    group.userData.phase  = Math.random() * Math.PI * 2;
    this.scene.add(group);
    if (!this.torches) this.torches = [];
    this.torches.push(group);
    return group;
  }

  /* ── Iron Wall Glow ── */
  createWallGlow(wallMesh) {
    wallMesh.material.emissive    = new THREE.Color(0xff3300);
    wallMesh.material.emissiveIntensity = 0.6;
    this.wallMesh = wallMesh;
  }

  /* ── Healing Burst (green-gold sparkles) ── */
  spawnHeal(pos, count = 40) {
    const posArr = [];
    const velArr = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      posArr.push(pos.x + (Math.random() - 0.5) * 0.4,
                  pos.y + Math.random() * 1.2,
                  pos.z + (Math.random() - 0.5) * 0.4);
      velArr.push(Math.cos(angle) * speed * 0.6,
                  1.5 + Math.random() * 3.5,
                  Math.sin(angle) * speed * 0.6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x44ff88,
      size: 0.20,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.particles.push({ pts, vel: velArr, life: 1.2 });
  }

  /* ── Update Loop ── */
  update(dt) {
    this.time += dt;

    /* Sky shader time */
    if (this.skyMat) this.skyMat.uniforms.uTime.value = this.time;

    /* God rays pulse + slow atmospheric color drift */
    const _drift = Math.sin(this.time * 0.015);
    this.godRays.forEach(r => {
      r.material.opacity = r.userData.baseOpacity +
        Math.sin(this.time * 0.9 + r.userData.phase) * 0.012;
      /* Subtly shift warm-cool tint over ~420s cycle */
      r.material.color.setRGB(
        1.0 + _drift * 0.07,
        0.80 + Math.sin(this.time * 0.011 + 1.2) * 0.06,
        0.40 + Math.sin(this.time * 0.008 + 2.4) * 0.18
      );
    });

    /* Torch flicker */
    if (this.torches) {
      this.torches.forEach(t => {
        const f   = t.userData.flame;
        const l   = t.userData.light;
        const ph  = t.userData.phase;
        const nz  = 0.85 + Math.sin(this.time * 12 + ph) * 0.14;
        f.scale.y = nz;
        f.scale.x = 0.9 + Math.sin(this.time * 17 + ph + 1) * 0.1;
        l.intensity = 1.3 + Math.sin(this.time * 14 + ph) * 0.3;
      });
    }

    /* Sun halo pulsate */
    if (this.sunHalo) {
      this.sunHalo.material.opacity = 0.10 + Math.sin(this.time * 1.5) * 0.03;
    }

    /* Emit particles */
    this.particles.forEach((p, i) => {
      p.life -= dt * 0.8;
      if (p.life <= 0) { this.scene.remove(p.pts); this.particles.splice(i, 1); return; }
      const pos = p.pts.geometry.attributes.position.array;
      for (let v = 0; v < p.vel.length / 3; v++) {
        pos[v * 3]     += p.vel[v * 3] * dt;
        pos[v * 3 + 1] += p.vel[v * 3 + 1] * dt;
        pos[v * 3 + 2] += p.vel[v * 3 + 2] * dt;
        p.vel[v * 3 + 1] -= 5 * dt;
      }
      p.pts.geometry.attributes.position.needsUpdate = true;
      p.pts.material.opacity = p.life;
    });

    /* Iron sparks */
    this.sparks.forEach((s, i) => {
      s.life -= dt * 1.2;
      if (s.life <= 0) { this.scene.remove(s.pts); this.sparks.splice(i, 1); return; }
      const pos = s.pts.geometry.attributes.position.array;
      for (let v = 0; v < s.count; v++) {
        pos[v * 3]     += s.vel[v * 3] * dt;
        pos[v * 3 + 1] += s.vel[v * 3 + 1] * dt;
        pos[v * 3 + 2] += s.vel[v * 3 + 2] * dt;
        s.vel[v * 3 + 1] -= 9.8 * dt;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.material.opacity = s.life;
      s.pts.material.color.setHSL(0.05 * s.life, 1, 0.6);
    });

    /* Dust drift */
    if (this.dust) {
      const pos = this.dustPositions;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3]     += Math.sin(this.time * 0.3 + i) * 0.01;
        pos[i * 3 + 1] += Math.sin(this.time * 0.2 + i * 0.7) * 0.003;
        if (pos[i * 3 + 1] > 15) pos[i * 3 + 1] = 0.1;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }

    /* Weather drift */
    if (this._weatherMesh && this._weatherPositions) {
      const pos = this._weatherPositions;
      const type = this._weatherType;
      for (let i = 0; i < this._weatherCount; i++) {
        if (type === 'sandstorm') {
          /* Horizontal streaming */
          pos[i * 3]     += (3.5 + Math.sin(this.time * 0.4 + i * 0.01) * 0.8) * dt;
          pos[i * 3 + 1] += (Math.random() - 0.5) * 0.02;
        } else {
          /* Falling: ash / snow */
          pos[i * 3]     += Math.sin(this.time * 0.2 + i * 0.05) * 0.01;
          pos[i * 3 + 1] -= (type === 'ash' ? 0.8 : 1.2) * dt;
        }
        /* Wrap positions */
        if (pos[i * 3]     >  70) pos[i * 3]     = -70;
        if (pos[i * 3]     < -70) pos[i * 3]     =  70;
        if (pos[i * 3 + 1] < -1) pos[i * 3 + 1] = 35;
        if (pos[i * 3 + 1] > 36) pos[i * 3 + 1] = 0;
      }
      this._weatherMesh.geometry.attributes.position.needsUpdate = true;
      /* Sandstorm: jitter color over time */
      if (type === 'sandstorm') {
        const hue = 0.07 + Math.sin(this.time * 0.5) * 0.01;
        this._weatherMesh.material.color.setHSL(hue, 0.65, 0.52);
      }
    }

    /* Wall glow pulse */
    if (this.wallMesh) {
      this.wallMesh.material.emissiveIntensity =
        0.4 + Math.sin(this.time * 2.5) * 0.25;
    }
  }

  /* ── Cleanup ── */
  dispose() {
    this.godRays.forEach(r => this.scene.remove(r));
    this.particles.forEach(p => this.scene.remove(p.pts));
    this.sparks.forEach(s => this.scene.remove(s.pts));
    if (this.dust)    this.scene.remove(this.dust);
    if (this._weatherMesh) this.scene.remove(this._weatherMesh);
    if (this.skyDome) this.scene.remove(this.skyDome);
    if (this.sunMesh) this.scene.remove(this.sunMesh);
    if (this.sunHalo) this.scene.remove(this.sunHalo);
    if (this.torches) this.torches.forEach(t => this.scene.remove(t));
  }
}

window.Effects = Effects;
