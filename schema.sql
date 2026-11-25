-- ==============================================================================
-- STARFALL HORDES: SURVIVORS — CONTRATO DECLARATIVO DE BASE DE DATOS (SQLite 3.45+)
-- Almacenamiento local de Metaprogresión del Observatorio Cósmico, Estadísticas
-- y Logros de Supervivencia Estelar.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS meta_upgrades (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    current_level INTEGER NOT NULL DEFAULT 0,
    max_level INTEGER NOT NULL DEFAULT 10,
    cost_base INTEGER NOT NULL,
    cost_multiplier REAL NOT NULL DEFAULT 1.5,
    stat_type TEXT NOT NULL,
    stat_value_per_level REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS player_stats (
    id TEXT PRIMARY KEY,
    stardust_fragments INTEGER NOT NULL DEFAULT 0,
    total_runs INTEGER NOT NULL DEFAULT 0,
    total_kills INTEGER NOT NULL DEFAULT 0,
    max_survived_time REAL NOT NULL DEFAULT 0.0,
    constellations_triggered INTEGER NOT NULL DEFAULT 0,
    unlocked_characters TEXT NOT NULL DEFAULT '["void_mage","stellar_sorceress","solar_druid"]',
    last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS run_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_p1 TEXT NOT NULL,
    character_p2 TEXT,
    coop_mode INTEGER NOT NULL DEFAULT 0,
    survived_seconds REAL NOT NULL,
    enemies_defeated INTEGER NOT NULL,
    level_reached INTEGER NOT NULL,
    stardust_earned INTEGER NOT NULL,
    constellations_count INTEGER NOT NULL DEFAULT 0,
    run_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserción inicial de mejoras cósmicas de metaprogresión
INSERT OR IGNORE INTO meta_upgrades (id, name, description, current_level, max_level, cost_base, cost_multiplier, stat_type, stat_value_per_level) VALUES
('might', 'Fuerza Astral', 'Incrementa el daño global de todos los hechizos en un +8% por nivel.', 0, 10, 50, 1.45, 'damage_mult', 0.08),
('magnet', 'Atracción Gravitatoria', 'Aumenta el radio de recogida de gemas de EXP y polvo estelar un +15% por nivel.', 0, 10, 40, 1.35, 'pickup_radius', 18.0),
('vitality', 'Núcleo Viviente', 'Aumenta la salud máxima de los magos en +20 y regenera +0.5 HP/s por nivel.', 0, 8, 60, 1.5, 'max_hp', 20.0),
('haste', 'Viento Solar', 'Aumenta la velocidad de movimiento de los personajes en un +6% por nivel.', 0, 8, 45, 1.4, 'move_speed', 12.0),
('synergy', 'Sintonía de Constelación', 'Potencia el radio y la duración de las Constelaciones fusionadas un +12% por nivel.', 0, 5, 100, 1.6, 'constellation_boost', 0.12),
('greed', 'Cosecha de Polvo Cósmico', 'Multiplica los Fragmentos de Polvo Estelar conseguidos al derrotar élites y sobrevivir.', 0, 6, 75, 1.5, 'stardust_mult', 0.15);

INSERT OR IGNORE INTO player_stats (id, stardust_fragments, total_runs, total_kills, max_survived_time, constellations_triggered) VALUES
('local_profile', 120, 0, 0, 0.0, 0);
