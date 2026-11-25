/**
 * STARFALL HORDES: SURVIVORS - Auto-Attack System
 * Dispara periódicamente los hechizos de cada jugador buscando el objetivo más cercano o denso.
 */

export class AutoAttackSystem {
  constructor(projectilePool, spellsData) {
    this.projPool = projectilePool;
    this.spells = spellsData; // Array de hechizos definidos
    this.cooldowns = new Map(); // key: `${playerIndex}_${spellId}` -> timer
  }

  reset() {
    this.cooldowns.clear();
  }

  update(dt, players, enemyPool, spatialGrid, audioSys) {
    for (let pIdx = 0; pIdx < players.length; pIdx++) {
      const player = players[pIdx];
      if (!player.alive) continue;

      // Recorrer los hechizos equipados por el jugador
      for (const spellEntry of player.spells) {
        const spellId = spellEntry.id;
        const spellDef = this.spells.find(s => s.id === spellId);
        if (!spellDef) continue;

        const key = `${pIdx}_${spellId}`;
        let cd = this.cooldowns.get(key) || 0;
        cd -= dt;

        // Calcular modificadores por nivel del hechizo y estadísticas del jugador
        const cdTime = Math.max(0.2, spellDef.cooldown * (1 - (spellEntry.level - 1) * 0.08) * player.cooldownMult);

        if (cd <= 0) {
          this._castSpell(player, pIdx, spellDef, spellEntry, enemyPool, spatialGrid, audioSys);
          cd = cdTime;
        }

        this.cooldowns.set(key, cd);
      }
    }
  }

  _castSpell(player, pIdx, spellDef, spellEntry, enemyPool, spatialGrid, audioSys) {
    const dmg = spellDef.damage * (1 + (spellEntry.level - 1) * 0.25) * player.damageMult;
    const count = spellDef.count + Math.floor((spellEntry.level - 1) / 2);
    const radius = spellDef.area * (1 + (spellEntry.level - 1) * 0.1);
    const speed = spellDef.speed;
    const pierce = spellDef.pierce + Math.floor((spellEntry.level - 1) / 3);

    // Mapear spellId a un entero para SoA
    const spellNumericId = this.spells.findIndex(s => s.id === spellDef.id);

    if (spellDef.type === 'aura') {
      // Nova Solar / Aura concéntrica
      this.projPool.spawn(player.x, player.y, 0, 0, dmg, radius, 0.45, 999, spellNumericId, pIdx + 1, 0);
      if (audioSys) audioSys.playNova();
      return;
    }

    // Buscar enemigos cercanos usando Spatial Grid
    const nearbyEnemyIndices = [];
    spatialGrid.query(player.x, player.y, 700, nearbyEnemyIndices);

    let targetX = player.x + (player.facingX || 1);
    let targetY = player.y + (player.facingY || 0);

    if (nearbyEnemyIndices.length > 0) {
      // Encontrar el enemigo más cercano
      let closestDistSq = Infinity;
      for (const eIdx of nearbyEnemyIndices) {
        if (!enemyPool.active[eIdx]) continue;
        const dx = enemyPool.posX[eIdx] - player.x;
        const dy = enemyPool.posY[eIdx] - player.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          targetX = enemyPool.posX[eIdx];
          targetY = enemyPool.posY[eIdx];
        }
      }
    }

    const baseAngle = Math.atan2(targetY - player.y, targetX - player.x);

    // Disparar proyectiles en abanico
    const spread = count > 1 ? 0.35 : 0;
    const startAngle = baseAngle - spread * (count - 1) * 0.5;

    for (let c = 0; c < count; c++) {
      const angle = startAngle + spread * c;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 2.4;

      this.projPool.spawn(
        player.x,
        player.y,
        vx,
        vy,
        dmg,
        radius,
        life,
        pierce,
        spellNumericId,
        pIdx + 1,
        0
      );
    }

    if (audioSys) audioSys.playShoot(spellDef.type);
  }
}
