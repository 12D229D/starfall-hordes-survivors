/**
 * STARFALL HORDES: SURVIVORS - ECS Structure of Arrays (SoA)
 * Alto rendimiento para simular miles de entidades en memoria contigua usando TypedArrays.
 */

export class EnemyPoolSoA {
  constructor(capacity = 4000) {
    this.capacity = capacity;
    this.count = 0;

    // Flags & ID
    this.active = new Uint8Array(capacity);
    this.typeId = new Uint8Array(capacity); // 0: larva, 1: crawler, 2: star_eater, 3: stalker, 4: boss
    this.isBoss = new Uint8Array(capacity);

    // Cinemática (Float32Array contiguo en memoria para optimizar caché L1/L2)
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.velX = new Float32Array(capacity);
    this.velY = new Float32Array(capacity);
    this.speed = new Float32Array(capacity);

    // Atributos de combate
    this.hp = new Float32Array(capacity);
    this.maxHp = new Float32Array(capacity);
    this.damage = new Float32Array(capacity);
    this.radius = new Float32Array(capacity);
    this.xpValue = new Uint16Array(capacity);

    // Estados visuales / efectos
    this.hitFlash = new Float32Array(capacity); // cooldown de brillo blanco al recibir impacto
    this.behaviorTimer = new Float32Array(capacity);
  }

  spawn(x, y, typeId, stats) {
    if (this.count >= this.capacity) return -1;

    // Buscar primer slot libre
    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) {
        this.active[i] = 1;
        this.typeId[i] = typeId;
        this.isBoss[i] = stats.isBoss ? 1 : 0;
        this.posX[i] = x;
        this.posY[i] = y;
        this.velX[i] = 0;
        this.velY[i] = 0;
        this.speed[i] = stats.speed;
        this.hp[i] = stats.maxHp;
        this.maxHp[i] = stats.maxHp;
        this.damage[i] = stats.damage;
        this.radius[i] = stats.radius;
        this.xpValue[i] = stats.xpValue;
        this.hitFlash[i] = 0;
        this.behaviorTimer[i] = Math.random() * 2.0;

        this.count++;
        return i;
      }
    }
    return -1;
  }

  kill(index) {
    if (index >= 0 && index < this.capacity && this.active[index]) {
      this.active[index] = 0;
      this.count--;
      return true;
    }
    return false;
  }

  clear() {
    this.active.fill(0);
    this.count = 0;
  }
}

export class ProjectilePoolSoA {
  constructor(capacity = 2500) {
    this.capacity = capacity;
    this.count = 0;

    this.active = new Uint8Array(capacity);
    this.spellId = new Uint8Array(capacity); // mapeado a ID numérico
    this.ownerId = new Uint8Array(capacity); // 1 = P1, 2 = P2, 3 = Constelación fusionada

    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.velX = new Float32Array(capacity);
    this.velY = new Float32Array(capacity);
    this.damage = new Float32Array(capacity);
    this.radius = new Float32Array(capacity);
    this.life = new Float32Array(capacity); // segundos restantes
    this.pierce = new Int16Array(capacity); // perforaciones restantes
    this.isConstellation = new Uint8Array(capacity);
  }

  spawn(x, y, vx, vy, damage, radius, life, pierce, spellId = 0, ownerId = 1, isConstellation = 0) {
    if (this.count >= this.capacity) return -1;

    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) {
        this.active[i] = 1;
        this.spellId[i] = spellId;
        this.ownerId[i] = ownerId;
        this.posX[i] = x;
        this.posY[i] = y;
        this.velX[i] = vx;
        this.velY[i] = vy;
        this.damage[i] = damage;
        this.radius[i] = radius;
        this.life[i] = life;
        this.pierce[i] = pierce;
        this.isConstellation[i] = isConstellation ? 1 : 0;

        this.count++;
        return i;
      }
    }
    return -1;
  }

  kill(index) {
    if (index >= 0 && index < this.capacity && this.active[index]) {
      this.active[index] = 0;
      this.count--;
      return true;
    }
    return false;
  }

  clear() {
    this.active.fill(0);
    this.count = 0;
  }
}

export class GemPoolSoA {
  constructor(capacity = 3000) {
    this.capacity = capacity;
    this.count = 0;

    this.active = new Uint8Array(capacity);
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.velX = new Float32Array(capacity);
    this.velY = new Float32Array(capacity);
    this.value = new Uint16Array(capacity); // Cantidad de EXP / Polvo Estelar
    this.isStardust = new Uint8Array(capacity); // 0 = EXP normal, 1 = Polvo estelar (metaprogresión)
    this.targetPlayer = new Int8Array(capacity); // -1 = quieto, 0 = P1, 1 = P2
  }

  spawn(x, y, value, isStardust = 0) {
    if (this.count >= this.capacity) return -1;

    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) {
        this.active[i] = 1;
        this.posX[i] = x;
        this.posY[i] = y;
        this.velX[i] = (Math.random() - 0.5) * 30;
        this.velY[i] = (Math.random() - 0.5) * 30;
        this.value[i] = value;
        this.isStardust[i] = isStardust ? 1 : 0;
        this.targetPlayer[i] = -1;

        this.count++;
        return i;
      }
    }
    return -1;
  }

  kill(index) {
    if (index >= 0 && index < this.capacity && this.active[index]) {
      this.active[index] = 0;
      this.count--;
      return true;
    }
    return false;
  }

  clear() {
    this.active.fill(0);
    this.count = 0;
  }
}
