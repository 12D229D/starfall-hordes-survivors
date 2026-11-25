/**
 * STARFALL HORDES: SURVIVORS - WebGL & Canvas High-Performance Renderer
 * Renderiza miles de partículas estelares, enjambres y efectos de constelación a 60 FPS estables.
 */

export class CosmicRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this._resize();

    // Fondo estelar en capas (paralaje cósmico)
    this.stars = [];
    this._initStars();

    // Partículas de impacto y chispas de maná
    this.particles = [];
  }

  _resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  _initStars() {
    this.stars = [];
    const count = 350;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 6000,
        y: (Math.random() - 0.5) * 6000,
        size: Math.random() * 2.2 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 2.5 + 1.0,
        color: ['#ffffff', '#a0c4ff', '#ffc6ff', '#ffd166'][Math.floor(Math.random() * 4)]
      });
    }
  }

  addParticle(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 40;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.5,
        radius: Math.random() * 2.8 + 1.2
      });
    }
  }

  render(camera, players, enemyPool, projPool, gemPool, constSys, gameTime) {
    const ctx = this.ctx;
    const cw = this.width;
    const ch = this.height;

    // 1. Limpiar pantalla con gradiente cósmico abisal
    const grad = ctx.createRadialGradient(cw / 2, ch / 2, 80, cw / 2, ch / 2, Math.max(cw, ch) * 0.8);
    grad.addColorStop(0, '#0c0b1e');
    grad.addColorStop(0.5, '#050512');
    grad.addColorStop(1, '#020208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    // Aplicar transformación de cámara centrada
    ctx.translate(cw / 2 - camera.x, ch / 2 - camera.y);

    // 2. Dibujar fondo de estrellas con paralaje y brillo
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const screenX = s.x;
      const screenY = s.y;
      // Solo dibujar estrellas en el viewport visible extendido
      if (
        screenX > camera.x - cw &&
        screenX < camera.x + cw &&
        screenY > camera.y - ch &&
        screenY < camera.y + ch
      ) {
        const twinkle = Math.sin(gameTime * s.twinkleSpeed + i) * 0.3 + 0.7;
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.beginPath();
        ctx.arc(screenX, screenY, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;

    // 3. Dibujar Rejilla arcana sutil en el suelo del vacío
    this._renderGrid(ctx, camera);

    // 4. Dibujar Gemas de EXP y Polvo Estelar
    this._renderGems(ctx, gemPool, gameTime);

    // 5. Dibujar Haz de Resonancia de Constelación (si hay coop activo)
    if (constSys && constSys.activeBeam) {
      this._renderConstellationBeam(ctx, constSys.activeBeam, gameTime);
    }

    // 6. Dibujar Proyectiles
    this._renderProjectiles(ctx, projPool, gameTime);

    // 7. Dibujar Enemigos (SoA masivo)
    this._renderEnemies(ctx, enemyPool);

    // 8. Dibujar Jugadores
    this._renderPlayers(ctx, players, gameTime);

    // 9. Actualizar y dibujar partículas
    this._renderParticles(ctx);

    ctx.restore();
  }

  _renderGrid(ctx, camera) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 53, 140, 0.12)';
    ctx.lineWidth = 1;
    const step = 120;
    const startX = Math.floor((camera.x - this.width / 2) / step) * step;
    const endX = startX + this.width + step * 2;
    const startY = Math.floor((camera.y - this.height / 2) / step) * step;
    const endY = startY + this.height + step * 2;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += step) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _renderGems(ctx, gemPool, gameTime) {
    for (let i = 0; i < gemPool.capacity; i++) {
      if (!gemPool.active[i]) continue;
      const gx = gemPool.posX[i];
      const gy = gemPool.posY[i];
      const isStardust = gemPool.isStardust[i];

      ctx.save();
      ctx.translate(gx, gy);
      const pulse = Math.sin(gameTime * 4 + i) * 1.5;

      if (isStardust) {
        // Polvo Estelar dorado
        ctx.fillStyle = '#ffb703';
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        // Forma de rombo brillante
        ctx.moveTo(0, -6 - pulse);
        ctx.lineTo(4 + pulse, 0);
        ctx.lineTo(0, 6 + pulse);
        ctx.lineTo(-4 - pulse, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        // Gema de EXP azul/cian brillante
        ctx.fillStyle = '#48cae4';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _renderConstellationBeam(ctx, beam, gameTime) {
    ctx.save();
    // Resplandor exterior
    ctx.strokeStyle = `rgba(181, 23, 158, ${0.4 * beam.intensity})`;
    ctx.lineWidth = 14 + Math.sin(gameTime * 12) * 4;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();

    // Núcleo luminoso interior
    ctx.strokeStyle = `rgba(255, 214, 10, ${0.85 * beam.intensity})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();

    // Anillo de resonancia en el centro
    const mx = (beam.x1 + beam.x2) * 0.5;
    const my = (beam.y1 + beam.y2) * 0.5;
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#f72585';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(mx, my, 8 + Math.sin(gameTime * 15) * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderProjectiles(ctx, projPool, gameTime) {
    for (let i = 0; i < projPool.capacity; i++) {
      if (!projPool.active[i]) continue;
      const px = projPool.posX[i];
      const py = projPool.posY[i];
      const rad = projPool.radius[i];
      const isConst = projPool.isConstellation[i];

      ctx.save();
      if (isConst) {
        // Supernova de constelación fusionada
        ctx.fillStyle = 'rgba(255, 209, 102, 0.4)';
        ctx.strokeStyle = '#f72585';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Proyectiles regulares con resplandor
        const owner = projPool.ownerId[i];
        const color = owner === 2 ? '#ff9e00' : '#48cae4';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(3, rad), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _renderEnemies(ctx, enemyPool) {
    const enemyColors = ['#9d4edd', '#3a86ff', '#e63946', '#06d6a0', '#ff5400'];
    const glowColors = ['#c77dff', '#90e0ef', '#ff758f', '#80ffdb', '#ffd166'];

    for (let i = 0; i < enemyPool.capacity; i++) {
      if (!enemyPool.active[i]) continue;

      const ex = enemyPool.posX[i];
      const ey = enemyPool.posY[i];
      const rad = enemyPool.radius[i];
      const tId = Math.min(enemyPool.typeId[i], enemyColors.length - 1);
      const isHit = enemyPool.hitFlash[i] > 0;
      const isBoss = enemyPool.isBoss[i];

      ctx.save();
      ctx.translate(ex, ey);

      if (isHit) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = enemyColors[tId];
      }

      ctx.shadowColor = glowColors[tId];
      ctx.shadowBlur = isBoss ? 20 : 6;

      ctx.beginPath();
      if (isBoss) {
        // Jefe con forma cósmica facetada octagonal
        for (let a = 0; a < 8; a++) {
          const angle = (Math.PI / 4) * a;
          const r = rad * (a % 2 === 0 ? 1.0 : 0.82);
          const bx = Math.cos(angle) * r;
          const by = Math.sin(angle) * r;
          if (a === 0) ctx.moveTo(bx, by);
          else ctx.lineTo(bx, by);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
      }
      ctx.fill();

      // Barra de vida pequeña sobre jefes o tanques
      if (isBoss || enemyPool.maxHp[i] > 100) {
        const hpPct = Math.max(0, enemyPool.hp[i] / enemyPool.maxHp[i]);
        const bw = rad * 1.8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-bw / 2, -rad - 12, bw, 4);
        ctx.fillStyle = '#e63946';
        ctx.fillRect(-bw / 2, -rad - 12, bw * hpPct, 4);
      }

      ctx.restore();
    }
  }

  _renderPlayers(ctx, players, gameTime) {
    for (let pIdx = 0; pIdx < players.length; pIdx++) {
      const p = players[pIdx];
      if (!p.alive) continue;

      ctx.save();
      ctx.translate(p.x, p.y);

      // Resplandor de aura del mago
      ctx.shadowColor = p.glowColor;
      ctx.shadowBlur = 18;

      // Anillo de energía o escudo
      ctx.strokeStyle = p.glowColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6 + Math.sin(gameTime * 5 + pIdx) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Núcleo del avatar del hechicero
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Indicador direccional de mirada
      if (p.facingX !== undefined && p.facingY !== undefined) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(p.facingX * (p.radius + 10), p.facingY * (p.radius + 10));
        ctx.stroke();
      }

      // Etiqueta P1 / P2
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(pIdx === 0 ? 'P1' : 'P2', 0, -p.radius - 14);

      // Mini barra de HP sobre el jugador
      const hpPct = Math.max(0, p.hp / p.maxHp);
      const barW = 34;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-barW / 2, p.radius + 10, barW, 4);
      ctx.fillStyle = hpPct > 0.3 ? '#06d6a0' : '#ef476f';
      ctx.fillRect(-barW / 2, p.radius + 10, barW * hpPct, 4);

      ctx.restore();
    }
  }

  _renderParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life -= 0.016;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
