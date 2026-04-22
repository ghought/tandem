'use strict';

const Database = require('better-sqlite3');
const path = require('path');

// ─── Initialise ───────────────────────────────────────────────────────────────

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'tandem.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id           TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      color_palette TEXT,
      accessory    TEXT,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS progress (
      player_id    TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      chapter      INTEGER NOT NULL,
      mini_game    TEXT NOT NULL,
      stars        INTEGER NOT NULL DEFAULT 0,
      completed    BOOLEAN NOT NULL DEFAULT 0,
      best_score   INTEGER NOT NULL DEFAULT 0,
      UNIQUE(player_id, chapter, mini_game)
    );

    CREATE TABLE IF NOT EXISTS charms (
      player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      charm_id   TEXT NOT NULL,
      earned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, charm_id)
    );
  `);
}

// ─── Player helpers ───────────────────────────────────────────────────────────

function getPlayer(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) || null;
}

function upsertPlayer({ id, display_name, color_palette = null, accessory = null }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO players (id, display_name, color_palette, accessory)
    VALUES (@id, @display_name, @color_palette, @accessory)
    ON CONFLICT(id) DO UPDATE SET
      display_name  = excluded.display_name,
      color_palette = excluded.color_palette,
      accessory     = excluded.accessory
  `).run({ id, display_name, color_palette, accessory });
  return getPlayer(id);
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function getProgress(playerId, chapterId = null) {
  const db = getDb();
  if (chapterId !== null) {
    return db.prepare(
      'SELECT * FROM progress WHERE player_id = ? AND chapter = ?'
    ).all(playerId, chapterId);
  }
  return db.prepare('SELECT * FROM progress WHERE player_id = ?').all(playerId);
}

function upsertProgress({ player_id, chapter, mini_game, stars, completed, best_score }) {
  const db = getDb();
  // Keep the higher star/score value across attempts
  db.prepare(`
    INSERT INTO progress (player_id, chapter, mini_game, stars, completed, best_score)
    VALUES (@player_id, @chapter, @mini_game, @stars, @completed, @best_score)
    ON CONFLICT(player_id, chapter, mini_game) DO UPDATE SET
      stars      = MAX(excluded.stars,      progress.stars),
      completed  = MAX(excluded.completed,  progress.completed),
      best_score = MAX(excluded.best_score, progress.best_score)
  `).run({ player_id, chapter, mini_game, stars: stars || 0, completed: completed ? 1 : 0, best_score: best_score || 0 });
}

// ─── Charm helpers ────────────────────────────────────────────────────────────

function getCharms(playerId) {
  const db = getDb();
  return db.prepare('SELECT * FROM charms WHERE player_id = ?').all(playerId);
}

function addCharm(playerId, charmId) {
  const db = getDb();
  try {
    db.prepare(`
      INSERT OR IGNORE INTO charms (player_id, charm_id) VALUES (?, ?)
    `).run(playerId, charmId);
    return true;
  } catch (err) {
    console.error('[db] addCharm error:', err.message);
    return false;
  }
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────

function getPlayerStats(playerId) {
  const db = getDb();
  const player = getPlayer(playerId);
  if (!player) return null;

  const progressRows = getProgress(playerId);
  const charmRows    = getCharms(playerId);

  const totalGames    = progressRows.length;
  const completedGames = progressRows.filter(r => r.completed).length;
  const totalStars    = progressRows.reduce((sum, r) => sum + (r.stars || 0), 0);

  // Group by chapter
  const byChapter = {};
  for (const row of progressRows) {
    if (!byChapter[row.chapter]) byChapter[row.chapter] = [];
    byChapter[row.chapter].push(row);
  }

  return {
    player,
    totalGames,
    completedGames,
    totalStars,
    charms: charmRows.map(c => c.charm_id),
    byChapter,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getDb,
  getPlayer,
  upsertPlayer,
  getProgress,
  upsertProgress,
  getCharms,
  addCharm,
  getPlayerStats,
};
