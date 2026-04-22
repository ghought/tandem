'use strict';

const { ROOM_STATUS, MAX_PLAYERS } = require('../shared/constants');

// ─── In-memory store ──────────────────────────────────────────────────────────

/** @type {Map<string, object>} roomCode → room */
const rooms = new Map();

/** @type {Map<string, string>} socketId → roomCode */
const socketRoomIndex = new Map();

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
 * Remove a player from their room by socket id.
 *
 * @param {string} roomCode
 * @param {string} socketId
 * @returns {object|null} the updated room, or null if the room was destroyed
 */
function leaveRoom(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players = room.players.filter(p => p.socketId !== socketId);
  socketRoomIndex.delete(socketId);

  if (room.players.length === 0) {
    // Stop any running engine
    if (room.gameEngine && typeof room.gameEngine.stop === 'function') {
      room.gameEngine.stop();
    }
    rooms.delete(roomCode);
    console.log(`[rooms] Room ${roomCode} destroyed (empty)`);
    return null;
  }

  // If the host left, promote the next player
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
  getRoom,
  getRoomBySocketId,
  updateRoomState,
  setPlayerReady,
  roomSnapshot,
  listRooms,
};
