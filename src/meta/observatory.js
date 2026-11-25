/**
 * STARFALL HORDES: SURVIVORS - Observatorio Cósmico (Metaprogresión)
 * Maneja compras permanentes con Polvo Estelar y persistencia en LocalStorage/SQLite WASM.
 */

const STORAGE_KEY = 'starfall_observatory_data';

export class CosmicObservatory {
  constructor() {
    this.stardust = 150; // balance inicial
    this.upgrades = [
      {
        id: 'might',
        name: 'Fuerza Astral',
        description: 'Incrementa el daño global de todos los hechizos en un +8% por nivel.',
        level: 0,
        maxLevel: 10,
        baseCost: 50,
        multiplier: 1.45,
        statKey: 'damageMult',
        valPerLevel: 0.08
      },
      {
        id: 'magnet',
        name: 'Atracción Gravitatoria',
        description: 'Aumenta el radio de recogida de gemas de EXP y polvo estelar un +15% por nivel.',
        level: 0,
        maxLevel: 10,
        baseCost: 40,
        multiplier: 1.35,
        statKey: 'pickupRadius',
        valPerLevel: 18.0
      },
      {
        id: 'vitality',
        name: 'Núcleo Viviente',
        description: 'Aumenta la salud máxima de los magos en +20 y regenera +0.5 HP/s por nivel.',
        level: 0,
        maxLevel: 8,
        baseCost: 60,
        multiplier: 1.5,
        statKey: 'maxHp',
        valPerLevel: 20.0
      },
      {
        id: 'haste',
        name: 'Viento Solar',
        description: 'Aumenta la velocidad de movimiento de los personajes en un +6% por nivel.',
        level: 0,
        maxLevel: 8,
        baseCost: 45,
        multiplier: 1.4,
        statKey: 'moveSpeed',
        valPerLevel: 12.0
      },
      {
        id: 'synergy',
        name: 'Sintonía de Constelación',
        description: 'Potencia el radio y la duración de las Constelaciones fusionadas un +12% por nivel.',
        level: 0,
        maxLevel: 5,
        baseCost: 100,
        multiplier: 1.6,
        statKey: 'constellationBoost',
        valPerLevel: 0.12
      },
      {
        id: 'greed',
        name: 'Cosecha de Polvo Cósmico',
        description: 'Multiplica los Fragmentos de Polvo Estelar conseguidos al derrotar élites y sobrevivir.',
        level: 0,
        maxLevel: 6,
        baseCost: 75,
        multiplier: 1.5,
        statKey: 'stardustMult',
        valPerLevel: 0.15
      }
    ];

    this.stats = {
      totalRuns: 0,
      totalKills: 0,
      maxSurvivedTime: 0,
      constellationsTriggered: 0
    };

    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed.stardust === 'number') this.stardust = parsed.stardust;
        if (parsed.upgrades) {
          for (const u of this.upgrades) {
            if (parsed.upgrades[u.id] !== undefined) {
              u.level = Math.min(u.maxLevel, parsed.upgrades[u.id]);
            }
          }
        }
        if (parsed.stats) {
          this.stats = { ...this.stats, ...parsed.stats };
        }
      }
    } catch (e) {
      console.warn('Error loading observatory data:', e);
    }
  }

  save() {
    try {
      const serializedUpgrades = {};
      for (const u of this.upgrades) {
        serializedUpgrades[u.id] = u.level;
      }
      const toSave = {
        stardust: this.stardust,
        upgrades: serializedUpgrades,
        stats: this.stats
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Error saving observatory data:', e);
    }
  }

  getCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.level));
  }

  canBuy(upgradeId) {
    const u = this.upgrades.find(item => item.id === upgradeId);
    if (!u) return false;
    if (u.level >= u.maxLevel) return false;
    return this.stardust >= this.getCost(u);
  }

  buy(upgradeId) {
    const u = this.upgrades.find(item => item.id === upgradeId);
    if (!u) return false;
    const cost = this.getCost(u);
    if (u.level < u.maxLevel && this.stardust >= cost) {
      this.stardust -= cost;
      u.level++;
      this.save();
      return true;
    }
    return false;
  }

  addStardust(amount) {
    this.stardust += amount;
    this.save();
  }

  recordRun(seconds, kills, constellations) {
    this.stats.totalRuns++;
    this.stats.totalKills += kills;
    this.stats.constellationsTriggered += constellations;
    if (seconds > this.stats.maxSurvivedTime) {
      this.stats.maxSurvivedTime = seconds;
    }
    this.save();
  }

  applyToPlayer(playerStats) {
    for (const u of this.upgrades) {
      const bonus = u.level * u.valPerLevel;
      if (u.statKey === 'damageMult') playerStats.damageMult += bonus;
      if (u.statKey === 'pickupRadius') playerStats.pickupRadius += bonus;
      if (u.statKey === 'maxHp') {
        playerStats.maxHp += bonus;
        playerStats.hp += bonus;
      }
      if (u.statKey === 'moveSpeed') playerStats.speed += bonus;
      if (u.statKey === 'constellationBoost') playerStats.constellationBoost += bonus;
      if (u.statKey === 'stardustMult') playerStats.stardustMult += bonus;
    }
  }
}
