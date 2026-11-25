/**
 * STARFALL HORDES: SURVIVORS - Constellations Synergy System
 * Mecánica insignia: cuando 2 jugadores se acercan o alinean sus trayectorias,
 * se crea un rayo de conexión resonante y una explosión supernova periódica
 * fusionando ambos poderes elementales.
 */

export class ConstellationsSystem {
  constructor(projectilePool) {
    this.projPool = projectilePool;
    this.resonanceTimer = 0;
    this.resonanceCooldown = 1.2; // segundos entre superconjuros de constelación
    this.totalConstellationsTriggered = 0;
    this.activeBeam = null; // Información visual del haz de constelación
  }

  reset() {
    this.resonanceTimer = 0;
    this.totalConstellationsTriggered = 0;
    this.activeBeam = null;
  }

  update(dt, players, audioSys) {
    // Si no es modo cooperativo o uno de los jugadores murió, desactivar
    if (players.length < 2 || !players[0].alive || !players[1].alive) {
      this.activeBeam = null;
      return;
    }

    const p1 = players[0];
    const p2 = players[1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Rango de resonancia de constelación: menos de 320 píxeles
    const resonanceRange = 320 * (1 + (p1.constellationBoost || 0) + (p2.constellationBoost || 0));

    if (dist < resonanceRange) {
      // Activar rayo de constelación
      this.activeBeam = {
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        dist: dist,
        intensity: Math.min(1.0, (resonanceRange - dist) / resonanceRange + 0.3)
      };

      // Ambos jugadores reciben buff pasivo de velocidad mientras están enlazados
      p1.speedBuff = 1.2;
      p2.speedBuff = 1.2;

      this.resonanceTimer += dt;
      if (this.resonanceTimer >= this.resonanceCooldown) {
        this.resonanceTimer = 0;
        this.totalConstellationsTriggered++;

        // Fusión: Supernova Binaria Cósmica en el punto medio exacto
        const midX = (p1.x + p2.x) * 0.5;
        const midY = (p1.y + p2.y) * 0.5;

        const combinedDmg = (p1.damageMult + p2.damageMult) * 110;
        const blastRadius = 140;

        // Proyectil expansivo masivo marcado como isConstellation = 1
        this.projPool.spawn(midX, midY, 0, 0, combinedDmg, blastRadius, 0.5, 999, 99, 3, 1);

        // Disparo de 6 estrellas orbitales que se dispersan en hexagrama
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const sX = Math.cos(angle) * 360;
          const sY = Math.sin(angle) * 360;
          this.projPool.spawn(midX, midY, sX, sY, combinedDmg * 0.6, 22, 1.8, 5, 99, 3, 1);
        }

        if (audioSys) audioSys.playConstellationPulse();
      }
    } else {
      this.activeBeam = null;
      p1.speedBuff = 1.0;
      p2.speedBuff = 1.0;
    }
  }
}
