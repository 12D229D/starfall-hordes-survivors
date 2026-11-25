/**
 * STARFALL HORDES: SURVIVORS - Experience & Progression System
 * Gestiona la atracción de gemas por imán, cálculo de experiencia compartida,
 * niveles y solicitud de cartas de mejora roguelite.
 */

export class XPSystem {
  constructor(gemPool) {
    this.gemPool = gemPool;
    this.level = 1;
    this.currentXP = 0;
    this.nextLevelXP = 25;
    this.stardustEarned = 0;
    this.levelUpPending = false;
  }

  reset() {
    this.level = 1;
    this.currentXP = 0;
    this.nextLevelXP = 25;
    this.stardustEarned = 0;
    this.levelUpPending = false;
  }

  _calculateNextLevelXP(lvl) {
    // Curva exponencial suave típica de survivors bullet heaven
    return Math.floor(25 * Math.pow(lvl, 1.35) + lvl * 15);
  }

  update(dt, players, onLevelUp, audioSys) {
    const pool = this.gemPool;

    for (let i = 0; i < pool.capacity; i++) {
      if (!pool.active[i]) continue;

      const gx = pool.posX[i];
      const gy = pool.posY[i];

      // Determinar qué jugador está más cerca para el imán
      let bestDist = Infinity;
      let targetP = null;

      for (let pIdx = 0; pIdx < players.length; pIdx++) {
        const p = players[pIdx];
        if (!p.alive) continue;

        const dx = p.x - gx;
        const dy = p.y - gy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Si entra en el radio de imán del jugador
        if (dist < p.pickupRadius && dist < bestDist) {
          bestDist = dist;
          targetP = p;
        }
      }

      if (targetP) {
        // Atracción hacia el jugador con aceleración gravitacional
        const dx = targetP.x - gx;
        const dy = targetP.y - gy;
        const angle = Math.atan2(dy, dx);
        const magnetSpeed = 480 + (1 - Math.min(1, bestDist / targetP.pickupRadius)) * 320;

        pool.posX[i] += Math.cos(angle) * magnetSpeed * dt;
        pool.posY[i] += Math.sin(angle) * magnetSpeed * dt;

        // Comprobar recolección al tocar al jugador
        if (bestDist < targetP.radius + 12) {
          if (pool.isStardust[i]) {
            // Polvo estelar (metaprogresión)
            const stardustAmt = Math.round(pool.value[i] * (1 + (targetP.stardustMult || 0)));
            this.stardustEarned += stardustAmt;
            if (audioSys) audioSys.playStardustDing();
          } else {
            // Gema de EXP
            this.currentXP += pool.value[i];
            if (audioSys) audioSys.playXpDing();

            // Verificar si sube de nivel
            if (this.currentXP >= this.nextLevelXP) {
              this.currentXP -= this.nextLevelXP;
              this.level++;
              this.nextLevelXP = this._calculateNextLevelXP(this.level);
              this.levelUpPending = true;

              if (onLevelUp) {
                onLevelUp(this.level);
              }
            }
          }

          pool.kill(i);
        }
      } else {
        // Fricción pasiva de dispersión
        pool.posX[i] += pool.velX[i] * dt;
        pool.posY[i] += pool.velY[i] * dt;
        pool.velX[i] *= 0.92;
        pool.velY[i] *= 0.92;
      }
    }
  }
}
