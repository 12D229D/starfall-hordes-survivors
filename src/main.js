/**
 * STARFALL HORDES: SURVIVORS - Main Game Engine
 * Ensambla el estado global, controles de 1-2 jugadores, colisiones masivas,
 * interfaces roguelite y metaprogresión.
 */

import { EnemyPoolSoA, ProjectilePoolSoA, GemPoolSoA } from './ecs/soa.js';
import { SpatialHashGrid } from './ecs/spatialHash.js';
import { SpawnerSystem } from './systems/spawner.js';
import { AutoAttackSystem } from './systems/autoAttack.js';
import { ConstellationsSystem } from './systems/constellations.js';
import { XPSystem } from './systems/xp.js';
import { CosmicRenderer } from './render/webglInstancer.js';
import { CosmicObservatory } from './meta/observatory.js';
import { CosmicAudio, GameLoop } from './loop.js';

// Datos de Hechizos y Enemigos embebidos para ejecución directa de módulos
const SPELLS_DATA = [
  {
    id: 'void_orb',
    name: 'Orbe del Vacío',
    description: 'Esfera oscura que viaja atravesando hordas con daño continuo.',
    type: 'projectile',
    damage: 28,
    cooldown: 1.1,
    speed: 340,
    count: 1,
    pierce: 2,
    area: 18,
    icon: '🔮'
  },
  {
    id: 'pulsar_beam',
    name: 'Rayo de Púlsar',
    description: 'Haces de luz coherente de alta frecuencia y velocidad.',
    type: 'beam',
    damage: 42,
    cooldown: 1.3,
    speed: 620,
    count: 2,
    pierce: 4,
    area: 12,
    icon: '⚡'
  },
  {
    id: 'solar_nova',
    name: 'Nova Solar',
    description: 'Erupción periódica de calor concéntrico que incinera enemigos cercanos.',
    type: 'aura',
    damage: 55,
    cooldown: 2.2,
    speed: 0,
    count: 1,
    pierce: 999,
    area: 120,
    icon: '☀️'
  },
  {
    id: 'starlight_lance',
    name: 'Lanza Estelar',
    description: 'Fotones densos que perforan columnas completas de invasores.',
    type: 'lance',
    damage: 60,
    cooldown: 1.8,
    speed: 520,
    count: 1,
    pierce: 6,
    area: 16,
    icon: '✨'
  },
  {
    id: 'cosmic_shield',
    name: 'Aura de Singularidad',
    description: 'Barrera gravitatoria concéntrica con pulsos de rechazo masivo.',
    type: 'passive_active',
    damage: 35,
    cooldown: 2.6,
    speed: 0,
    count: 1,
    pierce: 999,
    area: 90,
    icon: '🛡️'
  }
];

const ENEMIES_DATA = [
  {
    id: 'void_larva',
    name: 'Bebé del Vacío',
    maxHp: 22,
    speed: 85,
    damage: 8,
    radius: 9,
    xpValue: 1,
    spawnMinuteStart: 0
  },
  {
    id: 'nebula_crawler',
    name: 'Rastreador Nebular',
    maxHp: 48,
    speed: 110,
    damage: 14,
    radius: 13,
    xpValue: 3,
    spawnMinuteStart: 1.5
  },
  {
    id: 'star_eater',
    name: 'Devorador de Estrellas',
    maxHp: 160,
    speed: 65,
    damage: 26,
    radius: 22,
    xpValue: 10,
    spawnMinuteStart: 4
  },
  {
    id: 'quantum_stalker',
    name: 'Acechador Cuántico',
    maxHp: 85,
    speed: 140,
    damage: 20,
    radius: 11,
    xpValue: 6,
    spawnMinuteStart: 6
  },
  {
    id: 'comet_titan',
    name: 'Titán Cometa',
    isBoss: true,
    maxHp: 2400,
    speed: 52,
    damage: 45,
    radius: 42,
    xpValue: 120,
    spawnMinuteStart: 8
  }
];

const CHARACTERS = [
  {
    id: 'void_mage',
    name: 'Mago del Vacío',
    icon: '🌌',
    color: '#9d4edd',
    glowColor: '#c77dff',
    desc: 'Maestro de la gravedad cósmica. Comienza con Orbe del Vacío y mayor radio de absorción.',
    startSpell: 'void_orb',
    baseHp: 100,
    baseSpeed: 170,
    bonusPickup: 30
  },
  {
    id: 'stellar_sorceress',
    name: 'Hechicera Estelar',
    icon: '⭐',
    color: '#48cae4',
    glowColor: '#00f5d4',
    desc: 'Manipuladora de haces de luz veloz. Comienza con Rayo de Púlsar y mayor cadencia.',
    startSpell: 'pulsar_beam',
    baseHp: 85,
    baseSpeed: 190,
    bonusCooldown: 0.15
  },
  {
    id: 'solar_druid',
    name: 'Druida Solar',
    icon: '☀️',
    color: '#ffb703',
    glowColor: '#ffd166',
    desc: 'Canalizador del fuego de las estrellas. Comienza con Nova Solar y mayor armadura.',
    startSpell: 'solar_nova',
    baseHp: 130,
    baseSpeed: 160,
    bonusDamage: 0.12
  }
];

class StarfallGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new CosmicRenderer(this.canvas);
    this.observatory = new CosmicObservatory();
    this.audio = new CosmicAudio();

    // Pools de entidades SoA
    this.enemyPool = new EnemyPoolSoA(4000);
    this.projPool = new ProjectilePoolSoA(2500);
    this.gemPool = new GemPoolSoA(3000);
    this.spatialGrid = new SpatialHashGrid(100);

    // Sistemas
    this.spawner = new SpawnerSystem(this.enemyPool, ENEMIES_DATA);
    this.autoAttack = new AutoAttackSystem(this.projPool, SPELLS_DATA);
    this.constellations = new ConstellationsSystem(this.projPool);
    this.xpSystem = new XPSystem(this.gemPool);

    // Estado del juego
    this.gameTime = 0; // segundos
    this.kills = 0;
    this.isPaused = false;
    this.inRun = false;
    this.coopMode = false;

    // Configuración de jugadores
    this.selectedCharP1 = 'void_mage';
    this.selectedCharP2 = 'stellar_sorceress';
    this.players = [];

    // Cámara
    this.camera = { x: 0, y: 0 };

    // Teclado
    this.keys = {};
    this._initInput();

    // Bucle de juego
    this.loop = new GameLoop(this.update.bind(this), this.render.bind(this));

    // Elementos del DOM
    this._cacheDOM();
    this._bindEvents();
    this.renderObservatoryUI();
  }

  _cacheDOM() {
    this.dom = {
      hud: document.getElementById('game-hud'),
      timer: document.getElementById('hud-timer'),
      kills: document.getElementById('hud-kills'),
      stardust: document.getElementById('hud-stardust'),
      level: document.getElementById('hud-level'),
      xpFill: document.getElementById('hud-xp-fill'),
      p1Card: document.getElementById('hud-p1-card'),
      p1HpFill: document.getElementById('hud-p1-hp-fill'),
      p2Card: document.getElementById('hud-p2-card'),
      p2HpFill: document.getElementById('hud-p2-hp-fill'),
      menuScreen: document.getElementById('menu-screen'),
      levelUpScreen: document.getElementById('levelup-screen'),
      observatoryScreen: document.getElementById('observatory-screen'),
      gameOverScreen: document.getElementById('gameover-screen'),
      cardsContainer: document.getElementById('levelup-cards-container'),
      observatoryGrid: document.getElementById('observatory-grid'),
      obsStardustCount: document.getElementById('obs-stardust-count'),
      constellationAlert: document.getElementById('constellation-alert'),
      coopToggle: document.getElementById('coop-toggle-btn')
    };
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      this.renderer._resize();
    });

    document.getElementById('btn-play').addEventListener('click', () => {
      this.audio.init();
      this.startRun();
    });

    document.getElementById('btn-observatory').addEventListener('click', () => {
      this.openObservatory();
    });

    document.getElementById('btn-close-observatory').addEventListener('click', () => {
      this.closeObservatory();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.dom.gameOverScreen.classList.add('hidden');
      this.startRun();
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
      this.dom.gameOverScreen.classList.add('hidden');
      this.dom.menuScreen.classList.remove('hidden');
    });

    this.dom.coopToggle.addEventListener('click', () => {
      this.coopMode = !this.coopMode;
      this.dom.coopToggle.textContent = this.coopMode ? 'Modo: 2 Jugadores (Coop Local)' : 'Modo: 1 Jugador (En solitario)';
      this.dom.coopToggle.classList.toggle('btn-primary', this.coopMode);
      this.dom.coopToggle.classList.toggle('btn-secondary', !this.coopMode);
      document.getElementById('p2-select-container').style.display = this.coopMode ? 'block' : 'none';
    });

    // Delegación para selección de personajes
    document.querySelectorAll('.char-card-p1').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.char-card-p1').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedCharP1 = card.dataset.charId;
      });
    });

    document.querySelectorAll('.char-card-p2').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.char-card-p2').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedCharP2 = card.dataset.charId;
      });
    });
  }

  _initInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'p' || e.key === 'Escape') {
        if (this.inRun && !this.dom.levelUpScreen.classList.contains('hidden')) return;
        this.isPaused = !this.isPaused;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  _createPlayer(index, charId) {
    const char = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
    const p = {
      id: index + 1,
      name: char.name,
      charId: char.id,
      color: char.color,
      glowColor: char.glowColor,
      x: (index === 0 ? -60 : 60),
      y: 0,
      radius: 16,
      alive: true,
      maxHp: char.baseHp,
      hp: char.baseHp,
      speed: char.baseSpeed,
      speedBuff: 1.0,
      damageMult: 1.0 + (char.bonusDamage || 0),
      cooldownMult: 1.0 - (char.bonusCooldown || 0),
      pickupRadius: 90 + (char.bonusPickup || 0),
      constellationBoost: 0,
      stardustMult: 0,
      facingX: 1,
      facingY: 0,
      spells: [{ id: char.startSpell, level: 1 }]
    };

    // Aplicar mejoras permanentes del Observatorio
    this.observatory.applyToPlayer(p);
    return p;
  }

  startRun() {
    this.enemyPool.clear();
    this.projPool.clear();
    this.gemPool.clear();
    this.spatialGrid.clear();

    this.spawner.reset();
    this.autoAttack.reset();
    this.constellations.reset();
    this.xpSystem.reset();

    this.gameTime = 0;
    this.kills = 0;
    this.isPaused = false;
    this.inRun = true;

    // Crear P1 y P2 (si coop)
    this.players = [this._createPlayer(0, this.selectedCharP1)];
    if (this.coopMode) {
      this.players.push(this._createPlayer(1, this.selectedCharP2));
      this.dom.p2Card.style.display = 'flex';
    } else {
      this.dom.p2Card.style.display = 'none';
    }

    this.dom.menuScreen.classList.add('hidden');
    this.dom.hud.style.display = 'flex';

    this.loop.start();
  }

  update(dt) {
    if (this.isPaused || !this.inRun) return;

    this.gameTime += dt;

    // 1. Control de movimiento de Jugadores
    this._handlePlayerMovement(dt);

    // 2. Centrado de cámara en jugadores
    this._updateCamera();

    // 3. Sistema de Spawner de hordas
    this.spawner.update(dt, this.gameTime, this.players);

    // 4. Reconstruir Spatial Hash Grid con los enemigos vivos
    this._rebuildSpatialGrid();

    // 5. Sistema de Auto-Ataque de Hechizos
    this.autoAttack.update(dt, this.players, this.enemyPool, this.spatialGrid, this.audio);

    // 6. Sistema de Constelaciones (Sinergia Coop)
    this.constellations.update(dt, this.players, this.audio);

    // Mostrar alerta sutil si hay constelación activa
    if (this.constellations.activeBeam) {
      this.dom.constellationAlert.classList.add('show');
    } else {
      this.dom.constellationAlert.classList.remove('show');
    }

    // 7. Actualización cinemática y física de enemigos
    this._updateEnemies(dt);

    // 8. Actualización cinemática de proyectiles y colisiones
    this._updateProjectiles(dt);

    // 9. Sistema de Experiencia, Atracción Magnética y Niveles
    this.xpSystem.update(dt, this.players, (newLevel) => {
      this.showLevelUpModal(newLevel);
    }, this.audio);

    // 10. Actualizar HUD
    this._updateHUD();

    // 11. Comprobar Game Over (todos los jugadores caídos)
    const anyAlive = this.players.some(p => p.alive);
    if (!anyAlive) {
      this.endRun(false);
    }

    // 12. Comprobar Victoria de Oleada (20 minutos = 1200 seg)
    if (this.gameTime >= 1200) {
      this.endRun(true);
    }
  }

  _handlePlayerMovement(dt) {
    // Jugador 1: Teclas WASD
    const p1 = this.players[0];
    if (p1 && p1.alive) {
      let mx = 0;
      let my = 0;
      if (this.keys['w'] || this.keys['arrowup']) my -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) my += 1;
      if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) mx += 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.sqrt(mx * mx + my * my);
        p1.facingX = mx / len;
        p1.facingY = my / len;
        p1.x += p1.facingX * p1.speed * p1.speedBuff * dt;
        p1.y += p1.facingY * p1.speed * p1.speedBuff * dt;
      }
    }

    // Jugador 2: Teclas IJKL o Flechas si P1 usa WASD
    if (this.players.length > 1) {
      const p2 = this.players[1];
      if (p2 && p2.alive) {
        let mx = 0;
        let my = 0;
        if (this.keys['i']) my -= 1;
        if (this.keys['k']) my += 1;
        if (this.keys['j']) mx -= 1;
        if (this.keys['l']) mx += 1;

        if (mx !== 0 || my !== 0) {
          const len = Math.sqrt(mx * mx + my * my);
          p2.facingX = mx / len;
          p2.facingY = my / len;
          p2.x += p2.facingX * p2.speed * p2.speedBuff * dt;
          p2.y += p2.facingY * p2.speed * p2.speedBuff * dt;
        }
      }
    }
  }

  _updateCamera() {
    let targetX = this.players[0].x;
    let targetY = this.players[0].y;

    if (this.players.length > 1 && this.players[1].alive) {
      targetX = (this.players[0].x + this.players[1].x) * 0.5;
      targetY = (this.players[0].y + this.players[1].y) * 0.5;
    }

    // Suavizado de cámara (lerp)
    this.camera.x += (targetX - this.camera.x) * 0.12;
    this.camera.y += (targetY - this.camera.y) * 0.12;
  }

  _rebuildSpatialGrid() {
    this.spatialGrid.clear();
    const ep = this.enemyPool;
    for (let i = 0; i < ep.capacity; i++) {
      if (ep.active[i]) {
        this.spatialGrid.insert(i, ep.posX[i], ep.posY[i], ep.radius[i]);
      }
    }
  }

  _updateEnemies(dt) {
    const ep = this.enemyPool;

    for (let i = 0; i < ep.capacity; i++) {
      if (!ep.active[i]) continue;

      if (ep.hitFlash[i] > 0) {
        ep.hitFlash[i] -= dt;
      }

      const ex = ep.posX[i];
      const ey = ep.posY[i];

      // Perseguir al jugador más cercano
      let targetP = this.players[0];
      let minDistSq = Infinity;

      for (let pIdx = 0; pIdx < this.players.length; pIdx++) {
        const p = this.players[pIdx];
        if (!p.alive) continue;
        const dx = p.x - ex;
        const dy = p.y - ey;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          targetP = p;
        }
      }

      if (targetP) {
        const dx = targetP.x - ex;
        const dy = targetP.y - ey;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
          const vx = (dx / dist) * ep.speed[i];
          const vy = (dy / dist) * ep.speed[i];
          ep.posX[i] += vx * dt;
          ep.posY[i] += vy * dt;
        }

        // Colisión cuerpo a cuerpo contra el jugador
        if (dist < targetP.radius + ep.radius[i]) {
          targetP.hp -= ep.damage[i] * dt;
          if (targetP.hp <= 0) {
            targetP.hp = 0;
            targetP.alive = false;
          }
        }
      }
    }
  }

  _updateProjectiles(dt) {
    const pp = this.projPool;
    const ep = this.enemyPool;
    const nearbyEnemyIds = [];

    for (let i = 0; i < pp.capacity; i++) {
      if (!pp.active[i]) continue;

      pp.life[i] -= dt;
      if (pp.life[i] <= 0) {
        pp.kill(i);
        continue;
      }

      pp.posX[i] += pp.velX[i] * dt;
      pp.posY[i] += pp.velY[i] * dt;

      const px = pp.posX[i];
      const py = pp.posY[i];
      const pr = pp.radius[i];

      // Comprobar colisión contra enemigos mediante Spatial Hash Grid
      this.spatialGrid.query(px, py, pr, nearbyEnemyIds);

      for (let j = 0; j < nearbyEnemyIds.length; j++) {
        const eIdx = nearbyEnemyIds[j];
        if (!ep.active[eIdx]) continue;

        const dx = ep.posX[eIdx] - px;
        const dy = ep.posY[eIdx] - py;
        const distSq = dx * dx + dy * dy;
        const colRad = pr + ep.radius[eIdx];

        if (distSq < colRad * colRad) {
          // Aplicar daño
          ep.hp[eIdx] -= pp.damage[i];
          ep.hitFlash[eIdx] = 0.12;

          // Partículas de impacto
          this.renderer.addParticle(ep.posX[eIdx], ep.posY[eIdx], '#ffffff', 4);

          // Verificar muerte del enemigo
          if (ep.hp[eIdx] <= 0) {
            this._handleEnemyDeath(eIdx);
          }

          // Perforación
          pp.pierce[i]--;
          if (pp.pierce[i] <= 0) {
            pp.kill(i);
            break;
          }
        }
      }
    }
  }

  _handleEnemyDeath(eIdx) {
    const ep = this.enemyPool;
    const ex = ep.posX[eIdx];
    const ey = ep.posY[eIdx];
    const xpVal = ep.xpValue[eIdx];
    const isBoss = ep.isBoss[eIdx];

    this.kills++;

    // Generar gema de EXP
    this.gemPool.spawn(ex, ey, xpVal, 0);

    // Probabilidad de Polvo Estelar (mayor en bosses y élites)
    if (isBoss || Math.random() < 0.15) {
      const stardustAmount = isBoss ? 25 : Math.floor(Math.random() * 3 + 1);
      this.gemPool.spawn(ex + (Math.random() - 0.5) * 15, ey + (Math.random() - 0.5) * 15, stardustAmount, 1);
    }

    // Efecto de explosión de partículas
    this.renderer.addParticle(ex, ey, isBoss ? '#ffbe0b' : '#9d4edd', isBoss ? 30 : 8);

    ep.kill(eIdx);
  }

  _updateHUD() {
    // Tiempo 00:00
    const m = Math.floor(this.gameTime / 60);
    const s = Math.floor(this.gameTime % 60);
    this.dom.timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    this.dom.kills.textContent = this.kills;
    this.dom.stardust.textContent = this.xpSystem.stardustEarned;

    // Nivel y barra de EXP
    this.dom.level.textContent = `NIVEL ${this.xpSystem.level}`;
    const xpPct = Math.min(100, (this.xpSystem.currentXP / this.xpSystem.nextLevelXP) * 100);
    this.dom.xpFill.style.width = `${xpPct}%`;

    // Barras de Salud
    const p1 = this.players[0];
    if (p1) {
      const p1Pct = Math.max(0, (p1.hp / p1.maxHp) * 100);
      this.dom.p1HpFill.style.width = `${p1Pct}%`;
      this.dom.p1HpFill.style.background = p1.alive ? 'var(--health-green)' : 'var(--danger-red)';
    }

    if (this.players.length > 1) {
      const p2 = this.players[1];
      const p2Pct = Math.max(0, (p2.hp / p2.maxHp) * 100);
      this.dom.p2HpFill.style.width = `${p2Pct}%`;
      this.dom.p2HpFill.style.background = p2.alive ? 'var(--health-green)' : 'var(--danger-red)';
    }
  }

  showLevelUpModal(level) {
    this.isPaused = true;
    this.audio.playLevelUp();

    this.dom.cardsContainer.innerHTML = '';

    // Elegir 3 mejoras aleatorias de hechizos disponibles
    const choices = this._generateUpgradeChoices();

    for (const choice of choices) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-icon">${choice.icon}</div>
        <div class="upgrade-name">${choice.name}</div>
        <div class="upgrade-type-tag">${choice.tag}</div>
        <div class="upgrade-desc">${choice.description}</div>
      `;

      card.addEventListener('click', () => {
        choice.apply();
        this.dom.levelUpScreen.classList.add('hidden');
        this.isPaused = false;
      });

      this.dom.cardsContainer.appendChild(card);
    }

    this.dom.levelUpScreen.classList.remove('hidden');
  }

  _generateUpgradeChoices() {
    const list = [];

    // Opciones para ambos jugadores
    for (let pIdx = 0; pIdx < this.players.length; pIdx++) {
      const p = this.players[pIdx];
      if (!p.alive) continue;

      // Hechizos ya conocidos (subir de nivel)
      for (const spellEntry of p.spells) {
        const sDef = SPELLS_DATA.find(s => s.id === spellEntry.id);
        list.push({
          icon: sDef.icon,
          name: `${sDef.name} Lv.${spellEntry.level + 1}`,
          tag: `Mejora P${p.id}`,
          description: `+25% Daño y mejoras en cadencia/perforación de ${sDef.name}.`,
          apply: () => {
            spellEntry.level++;
          }
        });
      }

      // Nuevos hechizos que no tenga aún
      for (const sDef of SPELLS_DATA) {
        if (!p.spells.some(s => s.id === sDef.id)) {
          list.push({
            icon: sDef.icon,
            name: `Aprender ${sDef.name}`,
            tag: `Nuevo Hechizo P${p.id}`,
            description: sDef.description,
            apply: () => {
              p.spells.push({ id: sDef.id, level: 1 });
            }
          });
        }
      }
    }

    // Mezclar aleatoriamente y devolver 3
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list.slice(0, 3);
  }

  render() {
    this.renderer.render(
      this.camera,
      this.players,
      this.enemyPool,
      this.projPool,
      this.gemPool,
      this.constellations,
      this.gameTime
    );
  }

  endRun(victory) {
    this.inRun = false;
    this.loop.stop();

    const earnedStardust = this.xpSystem.stardustEarned;
    this.observatory.addStardust(earnedStardust);
    this.observatory.recordRun(this.gameTime, this.kills, this.constellations.totalConstellationsTriggered);

    document.getElementById('gameover-title').textContent = victory ? '¡SUPERVIVENCIA CÓSMICA LOGRADA!' : 'EL VACÍO HA RECLAMADO TU ALMA';
    document.getElementById('go-time').textContent = this.dom.timer.textContent;
    document.getElementById('go-kills').textContent = this.kills;
    document.getElementById('go-level').textContent = this.xpSystem.level;
    document.getElementById('go-stardust').textContent = `+${earnedStardust}`;

    this.dom.gameOverScreen.classList.remove('hidden');
    this.renderObservatoryUI();
  }

  openObservatory() {
    this.renderObservatoryUI();
    this.dom.observatoryScreen.classList.remove('hidden');
  }

  closeObservatory() {
    this.dom.observatoryScreen.classList.add('hidden');
  }

  renderObservatoryUI() {
    this.dom.obsStardustCount.textContent = this.observatory.stardust;
    this.dom.observatoryGrid.innerHTML = '';

    for (const u of this.observatory.upgrades) {
      const card = document.createElement('div');
      card.className = 'observatory-card';
      const cost = this.observatory.getCost(u);
      const isMax = u.level >= u.maxLevel;
      const canBuy = !isMax && this.observatory.stardust >= cost;

      card.innerHTML = `
        <div class="observatory-card-header">
          <strong>${u.name}</strong>
          <span class="observatory-level">Nv. ${u.level}/${u.maxLevel}</span>
        </div>
        <p class="character-desc">${u.description}</p>
        <button class="btn-buy" ${!canBuy ? 'disabled' : ''} data-upgrade-id="${u.id}">
          ${isMax ? 'Completado' : `⭐ Mejorar (${cost} Polvo)`}
        </button>
      `;

      card.querySelector('.btn-buy').addEventListener('click', () => {
        if (this.observatory.buy(u.id)) {
          this.audio.playStardustDing();
          this.renderObservatoryUI();
        }
      });

      this.dom.observatoryGrid.appendChild(card);
    }
  }
}

// Inicialización automática cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  new StarfallGame();
});
