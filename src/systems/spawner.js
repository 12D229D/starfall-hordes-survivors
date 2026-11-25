/**
 * STARFALL HORDES: SURVIVORS - Spawner System
 * Genera oleadas progresivas y dinámicas de enjambres espaciales durante 20 minutos.
 */

export class SpawnerSystem {
  constructor(enemyPool, enemyDefs) {
    this.pool = enemyPool;
    this.defs = enemyDefs; // Array cargado de enemies.json
    this.spawnTimer = 0;
    this.waveInterval = 1.0; // segundos entre comprobaciones
    this.totalSpawned = 0;
    this.bossSpawnedMinutes = new Set();
  }

  reset() {
    this.spawnTimer = 0;
    this.totalSpawned = 0;
    this.bossSpawnedMinutes.clear();
  }

  update(dt, gameTime, players) {
    this.spawnTimer += dt;
    if (this.spawnTimer < this.waveInterval) return;
    this.spawnTimer = 0;

    const minutes = gameTime / 60;

    // Ritmo de aparición escalonado según el tiempo transcurrido (0 a 20 min)
    // De 8 enemigos/seg al inicio hasta 80+ enemigos/seg en minuto 15+
    const baseRate = Math.min(65, Math.floor(6 + minutes * 4.2));

    // Elegir punto de referencia (entre P1 y P2 si coop)
    let focusX = players[0].x;
    let focusY = players[0].y;
    if (players.length > 1 && players[1].alive) {
      focusX = (players[0].x + players[1].x) * 0.5;
      focusY = (players[0].y + players[1].y) * 0.5;
    }

    // Spawn masivo en anillos alrededor de la pantalla
    for (let i = 0; i < baseRate; i++) {
      if (this.pool.count >= this.pool.capacity - 100) break;

      // Determinar qué tipo de enemigo puede spawnear según el minuto
      const availableTypes = [];
      for (let t = 0; t < this.defs.length; t++) {
        if (!this.defs[t].isBoss && minutes >= (this.defs[t].spawnMinuteStart || 0)) {
          availableTypes.push(t);
        }
      }

      if (availableTypes.length === 0) availableTypes.push(0);

      // Ponderar: los más básicos son más frecuentes, pero a más tiempo aparecen más duros
      const typeIndex = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const def = this.defs[typeIndex];

      // Ángulo y distancia aleatoria fuera de la vista de cámara (radio ~850 a 1150)
      const angle = Math.random() * Math.PI * 2;
      const dist = 750 + Math.random() * 350;
      const spawnX = focusX + Math.cos(angle) * dist;
      const spawnY = focusY + Math.sin(angle) * dist;

      // Escalar vida ligeramente con el tiempo de supervivencia
      const hpMultiplier = 1.0 + minutes * 0.18;
      const stats = {
        ...def,
        maxHp: def.maxHp * hpMultiplier,
        isBoss: false
      };

      this.pool.spawn(spawnX, spawnY, typeIndex, stats);
      this.totalSpawned++;
    }

    // Spawn de Bosses especiales (Minuto 5, 10, 15, 20)
    const currentMinFloor = Math.floor(minutes);
    if ((currentMinFloor === 5 || currentMinFloor === 10 || currentMinFloor === 15) && !this.bossSpawnedMinutes.has(currentMinFloor)) {
      this.bossSpawnedMinutes.add(currentMinFloor);
      this._spawnBoss(focusX, focusY, currentMinFloor);
    }
  }

  _spawnBoss(focusX, focusY, minute) {
    const bossDef = this.defs.find(d => d.isBoss) || this.defs[this.defs.length - 1];
    const angle = Math.random() * Math.PI * 2;
    const spawnX = focusX + Math.cos(angle) * 800;
    const spawnY = focusY + Math.sin(angle) * 800;

    const hpMultiplier = 1.0 + (minute * 0.5);
    const bossStats = {
      ...bossDef,
      maxHp: bossDef.maxHp * hpMultiplier,
      damage: bossDef.damage * 1.3,
      isBoss: true
    };

    const bossIndex = this.defs.indexOf(bossDef);
    this.pool.spawn(spawnX, spawnY, bossIndex >= 0 ? bossIndex : 4, bossStats);
  }
}
