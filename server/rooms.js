'use strict';

const { ROOM_STATUS, MAX_PLAYERS } = require('../shared/constants');

// ─── In-memory store ──────────────────────────────────────────────────────────

/** @type {Map<string, object>} roomCode → room */
const rooms = new Map();

/** @type {Map<string, string>} socketId → roomCode */
const socketRoomIndex = new Map();

/**
 * Grace-period disconnect tracking.
 * When a socket drops we don't immediately destroy the room — we give the
 * player 45 seconds to reconnect (handles phone sleep, brief network loss).
 * Key: playerId  →  { roomCode, timer }
 */
const disconnectTimers = new Map();

const GRACE_PERIOD_MS = 45_000;

// ─── Room code generation ─────────────────────────────────────────────────────

const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
const VOWELS     = 'AEIOU';

function randomChar(str) {
  return str[Math.floor(Math.random() * str.length)];
}

/**
 * Generate a 4-letter pronounceable room code (C-V-C-V pattern).
 * Retries up to 100 times to avoid collisions.
 */
function generateRoomCode() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code =
      randomChar(CONSONANTS) +
      randomChar(VOWELS) +
      randomChar(CONSONANTS) +
      randomChar(VOWELS);
    if (!rooms.has(code)) return code;
  }
  // Fallback: extend to 6 chars
  return (
    randomChar(CONSONANTS) +
    randomChar(VOWELS) +
    randomChar(CONSONANTS) +
    randomChar(VOWELS) +
    randomChar(CONSONANTS) +
    randomChar(VOWELS)
  );
}

// ─── Room CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a new room and register the host.
 *
 * @param {{ id, name, socketId, palette, accessory }} hostPlayer
 * @param {'story'|'quick'|'freeplay'} mode
 * @returns {string} roomCode
 */
function createRoom(hostPlayer, mode = 'story') {
  const roomCode = generateRoomCode();

  const room = {
    roomCode,
    players: [
      {
        id:        hostPlayer.id,
        name:      hostPlayer.name,
        socketId:  hostPlayer.socketId,
        palette:   hostPlayer.palette   || null,
        accessory: hostPlayer.accessory || null,
        role:      'host',
        ready:     false,
      },
    ],
    mode,
    chapter:         1,
    currentMiniGame: null,
    miniGameIndex:   0,
    gameState:       {},
    gameEngine:      null,   // live GameEngine instance, not serialised
    status:          ROOM_STATUS.LOBBY,
    createdAt:       Date.now(),
  };

  rooms.set(roomCode, room);
  socketRoomIndex.set(hostPlayer.socketId, roomCode);

  console.log(`[rooms] Created room ${roomCode} (mode=${mode}) by player ${hostPlayer.id}`);
  return roomCode;
}

/**
 * Add a player to an existing room.
 *
 * @param {string} roomCode
 * @param {{ id, name, socketId, palette, accessory }} player
 * @returns {{ room: object }|{ error: string }}
 */
function joinRoom(roomCode, player) {
  const room = rooms.get(roomCode);

  if (!room) {
    return { error: 'Room not found.' };
  }
  if (room.status === ROOM_STATUS.ENDED) {
    return { error: 'This room has ended.' };
  }
  if (room.players.length >= MAX_PLAYERS) {
    return { error: 'Room is full.' };
  }
  // Prevent duplicate joins (e.g. reconnect before cleanup)
  const existing = room.players.find(p => p.id === player.id);
  if (existing) {
    // Update socket id and return room
    existing.socketId = player.socketId;
    socketRoomIndex.set(player.socketId, roomCode);
    return { room };
  }

  const newPlayer = {
    id:        player.id,
    name:      player.name,
    socketId:  player.socketId,
    palette:   player.palette   || null,
    accessory: player.accessory || null,
    role:      'guest',
    ready:     false,
  };

  room.players.push(newPlayer);
  socketRoomIndex.set(player.socketId, roomCode);

  console.log(`[rooms] Player ${player.id} joined room ${roomCode}`);
  return { room };
}

/**
 * Called when a socket disconnects.  Instead of immediately removing the
 * player we mark them as disconnected and start a grace-period timer.
 * If they reconnect within GRACE_PERIOD_MS we restore them seamlessly.
 *
 * @param {string} roomCode
 * @param {string} socketId
 * @param {Function} onExpired  called with (roomCode, playerId) if timer fires
 * @returns {{ room: object, playerId: string|null }}
 */
function playerDisconnected(roomCode, socketId, onExpired) {
  const room = rooms.get(roomCode);
  if (!room) return { room: null, playerId: null };

  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return { room, playerId: null };

  const playerId = player.id;

  // Mark the player as disconnected (keep them in room.players)
  player.connected = false;
  player.socketId  = null;
  socketRoomIndex.delete(socketId);

  // Cancel any previous timer for this player
  const prev = disconnectTimers.get(playerId);
  if (prev) clearTimeout(prev.timer);

  // Start grace-period timer
  const timer = setTimeout(() => {
    disconnectTimers.delete(playerId);
    _forceLeave(roomCode, playerId);
    if (typeof onExpired === 'function') onExpired(roomCode, playerId);
  }, GRACE_PERIOD_MS);

  disconnectTimers.set(playerId, { roomCode, timer });

  console.log(`[rooms] Socket ${socketId} disconnected from ${roomCode} — grace period started (player ${playerId})`);
  return { room, playerId };
}

/**
 * Internal: hard-remove a player after grace period expires.
 */
function _forceLeave(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players = room.players.filter(p => p.id !== playerId);

  if (room.players.length === 0) {
    if (room.gameEngine && typeof room.gameEngine.stop === 'function') {
      room.gameEngine.stop();
    }
    rooms.delete(roomCode);
    console.log(`[rooms] Room ${roomCode} destroyed (empty after grace period)`);
    return null;
  }

  if (!room.players.find(p => p.role === 'host')) {
    room.players[0].role = 'host';
  }

  console.log(`[rooms] Player ${playerId} removed from ${roomCode} (grace period expired)`);
  return room;
}

/**
 * Called when a previously-disconnected player reconnects.
 * Cancels their grace-period timer and updates their socket id.
 *
 * @param {string} playerId
 * @param {string} newSocketId
 * @returns {{ room: object, player: object }|null}
 */
function playerReconnected(playerId, newSocketId) {
  const entry = disconnectTimers.get(playerId);
  if (!entry) return null;   // not in grace period — treat as fresh join

  clearTimeout(entry.timer);
  disconnectTimers.delete(playerId);

  const room = rooms.get(entry.roomCode);
  if (!room) return null;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;

  player.socketId  = newSocketId;
  player.connected = true;
  socketRoomIndex.set(newSocketId, entry.roomCode);

  console.log(`[rooms] Player ${playerId} reconnected to ${entry.roomCode}`);
  return { room, player };
}

/**
 * Legacy hard-leave (used for intentional quits).
 */
function leaveRoom(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const player = room.players.find(p => p.socketId === socketId);
  const playerId = player ? player.id : null;

  // Cancel any pending grace timer
  if (playerId) {
    const entry = disconnectTimers.get(playerId);
    if (entry) { clearTimeout(entry.timer); disconnectTimers.delete(playerId); }
  }

  room.players = room.players.filter(p => p.socketId !== socketId);
  socketRoomIndex.delete(socketId);

  if (room.players.length === 0) {
    if (room.gameEngine && typeof room.gameEngine.stop === 'function') {
      room.gameEngine.stop();
    }
    rooms.delete(roomCode);
    console.log(`[rooms] Room ${roomCode} destroyed (empty)`);
    return null;
  }

  if (!room.players.find(p => p.role === 'host')) {
    room.players[0].role = 'host';
  }

  console.log(`[rooms] Socket ${socketId} left room ${roomCode}`);
  return room;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function getRoomBySocketId(socketId) {
  const roomCode = socketRoomIndex.get(socketId);
  return roomCode ? rooms.get(roomCode) || null : null;
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

/**
 * Merge `updates` into the room object.
 */
function updateRoomState(roomCode, updates) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  Object.assign(room, updates);
  return room;
}

/**
 * Mark a player as ready/not-ready.
 */
function setPlayerReady(roomCode, playerId, isReady) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.ready = isReady;
  return room;
}

/**
 * Returns a serialisable snapshot of the room (no live engine ref).
 */
function roomSnapshot(room) {
  if (!room) return null;
  const { gameEngine, ...rest } = room; // eslint-disable-line no-unused-vars
  return rest;
}

/**
 * Returns all active rooms (for admin / debug purposes).
 */
function listRooms() {
  return [...rooms.values()].map(roomSnapshot);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  playerDisconnected,
  playerReconnected,
  getRoom,
  getRoomBySocketId,
  updateRoomState,
  setPlayerReady,
  roomSnapshot,
  listRooms,
};
