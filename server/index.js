'use strict';

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const path       = require('path');
const cors       = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const db          = require('./db');
const rooms       = require('./rooms');
const { getNarratorLine }   = require('./narrator');
const { getNextMiniGame, checkChapterComplete } = require('./progression');
const { GAME_IDS, ROOM_STATUS, CHAPTERS } = require('../shared/constants');
const { BotPlayer } = require('./bot');

// ─── Game engine registry ─────────────────────────────────────────────────────

const { LabyrinthEngine }    = require('./games/labyrinth');
const { HarmonyEngine }      = require('./games/harmony');
const { HeartbeatEngine }    = require('./games/heartbeat');
const { RecipeRushEngine }   = require('./games/recipe-rush');
const { TasteTestEngine }    = require('./games/taste-test');
const { GrowTogetherEngine } = require('./games/grow-together');
const { BridgeVinesEngine }  = require('./games/bridge-of-vines');
const { StirTogetherEngine } = require('./games/stir-together');
const { SignalFlagsEngine }    = require('./games/signal-flags');
const { GearTrainEngine }      = require('./games/gear-train');
const { BlueprintReaderEngine } = require('./games/blueprint-reader');
const { TandemTypingEngine }   = require('./games/tandem-typing');
const { RubeGoldbergEngine }    = require('./games/rube-goldberg');
const { ButterflyChaseEngine }  = require('./games/butterfly-chase');
const { DiceRollEngine }        = require('./games/dice-roll');
const { MemoryLaneEngine }      = require('./games/memory-lane');
const { TwentyQuestionsEngine } = require('./games/twenty-questions');
const { CallResponseEngine }   = require('./games/call-response');
const { ConductorEngine }      = require('./games/conductor');
const { MirrorDrawEngine }     = require('./games/mirror-draw');
const { DuetEngine }           = require('./games/duet');
const { LightTheWayEngine }    = require('./games/light-the-way');
const { TidePoolsEngine }      = require('./games/tide-pools');
const { StormEngine }          = require('./games/storm');

/**
 * Map every GAME_ID → the engine class that handles it.
 * Games without a dedicated engine fall back to a stub so the server
 * never crashes on an unmapped ID.
 */
const GAME_ENGINE_MAP = {
  [GAME_IDS.LABYRINTH]:        LabyrinthEngine,
  [GAME_IDS.HARMONY]:          HarmonyEngine,
  [GAME_IDS.HEARTBEAT]:        HeartbeatEngine,
  [GAME_IDS.FINAL_LABYRINTH]:  LabyrinthEngine,   // reuse with level 3 config
  [GAME_IDS.RECIPE_RUSH]:      RecipeRushEngine,
  [GAME_IDS.TASTE_TEST]:       TasteTestEngine,
  [GAME_IDS.GROW_TOGETHER]:    GrowTogetherEngine,
  [GAME_IDS.BRIDGE_OF_VINES]:  BridgeVinesEngine,
  [GAME_IDS.STIR_TOGETHER]:    StirTogetherEngine,
  [GAME_IDS.SIGNAL_FLAGS]:     SignalFlagsEngine,
  // Chapter 3 – The Workshop
  [GAME_IDS.GEAR_TRAIN]:       GearTrainEngine,
  [GAME_IDS.BLUEPRINT_READER]: BlueprintReaderEngine,
  [GAME_IDS.TANDEM_TYPING]:    TandemTypingEngine,
  [GAME_IDS.RUBE_GOLDBERG]:    RubeGoldbergEngine,
  // Chapter 1 remaining
  [GAME_IDS.BUTTERFLY_CHASE]:  ButterflyChaseEngine,
  // Chapter 4 – The Concert Hall
  [GAME_IDS.CALL_RESPONSE]:    CallResponseEngine,
  [GAME_IDS.CONDUCTOR]:        ConductorEngine,
  [GAME_IDS.MIRROR_DRAW]:      MirrorDrawEngine,
  [GAME_IDS.DUET]:             DuetEngine,
  // Chapter 5 – The Storm
  [GAME_IDS.LIGHT_THE_WAY]:    LightTheWayEngine,
  [GAME_IDS.TIDE_POOLS]:       TidePoolsEngine,
  [GAME_IDS.STORM]:            StormEngine,
  // Chapter 6 – The Summit
  [GAME_IDS.DICE_ROLL]:        DiceRollEngine,
  [GAME_IDS.MEMORY_LANE]:      MemoryLaneEngine,
  [GAME_IDS.TWENTY_QUESTIONS]: TwentyQuestionsEngine,
};

// ─── App setup ────────────────────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// CORS
app.use(cors({
  origin: IS_PROD ? false : true,
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Serve client build in production
if (IS_PROD) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ─── REST health / debug endpoints ───────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/rooms', (_req, res) => {
  if (IS_PROD) return res.status(403).json({ error: 'Forbidden' });
  res.json(rooms.listRooms());
});

app.get('/api/player/:id', (req, res) => {
  const player = db.getPlayer(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  const stats = db.getPlayerStats(req.params.id);
  res.json(stats);
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: IS_PROD ? false : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:  20000,
  pingInterval: 10000,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Emit a narrator line to the room, with a short delay so it arrives after game:result */
function emitNarrator(roomCode, chapter, phase, index = 0, delayMs = 500) {
  const line = getNarratorLine(chapter, phase, index);
  if (!line) return;
  setTimeout(() => {
    io.to(roomCode).emit('narrator:text', { chapter, phase, index, text: line });
  }, delayMs);
}

/** Instantiate the correct engine for a game, or null if unmapped. */
function createEngine(gameId, roomCode, config, room) {
  const EngineClass = GAME_ENGINE_MAP[gameId];
  if (!EngineClass) {
    console.warn(`[server] No engine for game "${gameId}" — using stub`);
    return null;
  }
  return new EngineClass(roomCode, { ...config, gameId }, io, room);
}

/** Add a virtual bot player to a room (idempotent). Returns the bot player object. */
function addBotToRoom(room) {
  const existing = room.players.find(p => p.isBot);
  if (existing) return existing;
  const botId = `bot_${room.roomCode}`;
  const bot = {
    id:        botId,
    name:      'Tandem Bot',
    socketId:  null,
    palette:   'green',
    accessory: 'none',
    isBot:     true,
    ready:     true,
  };
  room.players.push(bot);
  return bot;
}

/** Start a mini-game in the room, handling narrator + engine lifecycle. */
function startMiniGame(roomCode, gameId, config = {}) {
  const room = rooms.getRoom(roomCode);
  if (!room) return;

  // Stop any running engine
  if (room.gameEngine && room.gameEngine.isRunning) {
    room.gameEngine.stop();
  }

  // Stop any running bot
  if (room.botPlayer) {
    room.botPlayer.stop();
    room.botPlayer = null;
  }

  const engine = createEngine(gameId, roomCode, config, room);

  rooms.updateRoomState(roomCode, {
    currentMiniGame: gameId,
    status:          ROOM_STATUS.PLAYING,
    gameEngine:      engine,
    gameState:       {},
    botPlayer:       null,
  });

  // Assign roles: human players first (player1, player2), bot always player2
  const updatedRoom = rooms.getRoom(roomCode);
  const humanPlayers = updatedRoom.players.filter(p => !p.isBot);
  const botPlayers   = updatedRoom.players.filter(p => p.isBot);
  for (let i = 0; i < humanPlayers.length; i++) {
    humanPlayers[i].role = i === 0 ? 'player1' : 'player2';
  }
  for (const bot of botPlayers) {
    bot.role = 'player2';
  }

  io.to(roomCode).emit('game:starting', {
    gameId,
    roomCode,
    chapter:  updatedRoom.chapter,
    players:  updatedRoom.players.map(p => ({
      id:        p.id,
      name:      p.name,
      role:      p.role,
      palette:   p.palette,
      accessory: p.accessory,
      isBot:     p.isBot || false,
    })),
    config,
  });

  // Emit role:assigned individually so each client knows their own role
  for (const p of updatedRoom.players) {
    if (p.socketId && !p.isBot) {
      io.to(p.socketId).emit('role:assigned', { role: p.role });
    }
  }

  if (engine) {
    // Small delay to let clients prepare
    setTimeout(() => {
      const r = rooms.getRoom(roomCode);
      if (!r) return;
      engine.start();

      // Start bot automation if the room has a bot player
      const botP = r.players.find(p => p.isBot);
      if (botP) {
        const bot = new BotPlayer(engine, botP.id, gameId);
        bot.start();
        rooms.updateRoomState(roomCode, { botPlayer: bot });
        console.log(`[bot] Started bot for ${roomCode} / ${gameId}`);
      }
    }, 1000);
  }
}

/** Advance to the next game in story mode or end the chapter/game. */
function advanceStoryMode(roomCode) {
  const room = rooms.getRoom(roomCode);
  if (!room || room.mode !== 'story') return;

  const chapterDef = CHAPTERS.find(c => c.id === room.chapter);
  if (!chapterDef) return;

  const nextIndex = (room.miniGameIndex || 0) + 1;
  const totalGames = chapterDef.miniGames.length + 1; // +1 for boss

  if (nextIndex >= totalGames) {
    // Chapter complete
    rooms.updateRoomState(roomCode, {
      status:          ROOM_STATUS.RESULTS,
      miniGameIndex:   0,
      currentMiniGame: null,
    });

    // Check for charm + advance chapter
    let charmEarned = null;
    for (const player of room.players) {
      const result = checkChapterComplete(player.id, room.chapter, db);
      if (result.charmId) charmEarned = result.charmId;
    }

    const chapterCompletePayload = {
      chapter:     room.chapter,
      chapterName: chapterDef.name,
      charmId:     charmEarned || chapterDef.charmId,
    };

    // Emit both event names so client can listen on either
    io.to(roomCode).emit('chapter:complete',      chapterCompletePayload);
    io.to(roomCode).emit('game:chapterComplete',   chapterCompletePayload);

    // Capture chapter id before any state mutation
    const completedChapterId = room.chapter;
    emitNarrator(roomCode, completedChapterId, 'afterBoss', 0, 800);

    const nextChapterId = completedChapterId + 1;
    const nextChapter   = CHAPTERS.find(c => c.id === nextChapterId);

    if (nextChapter) {
      setTimeout(() => {
        rooms.updateRoomState(roomCode, {
          chapter:       nextChapterId,
          miniGameIndex: 0,
          status:        ROOM_STATUS.LOBBY,
        });
        io.to(roomCode).emit('chapter:start', {
          chapter:     nextChapterId,
          chapterName: nextChapter.name,
          theme:       nextChapter.theme,
          charmId:     nextChapter.charmId,
        });
        emitNarrator(roomCode, nextChapterId, 'intro', 0, 1200);
      }, 5000);
    } else {
      // All chapters complete — game over
      io.to(roomCode).emit('game:complete', { message: 'All chapters complete!' });
      rooms.updateRoomState(roomCode, { status: ROOM_STATUS.ENDED });
    }
  } else {
    rooms.updateRoomState(roomCode, { miniGameIndex: nextIndex });
    const next = getNextMiniGame(roomCode, rooms);
    if (!next) return;

    const betweenIndex = nextIndex - 1;
    emitNarrator(roomCode, room.chapter, 'betweenGames', betweenIndex, 300);

    setTimeout(() => {
      const config = next.isBoss && next.gameId === GAME_IDS.FINAL_LABYRINTH
        ? { level: 3 }
        : {};
      startMiniGame(roomCode, next.gameId, config);
    }, 4000);
  }
}

// ─── Socket event handlers ────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[socket] Connected: ${socket.id}`);

  // ── room:create ──────────────────────────────────────────────────────────

  socket.on('room:create', (data, ack) => {
    try {
      const pd = data.player || data; // support both { player: {...} } and flat
      const playerId = pd.id || data.playerId || uuidv4();
      const player = {
        id:        playerId,
        name:      pd.name      || data.name      || 'Player 1',
        socketId:  socket.id,
        palette:   pd.palette   || data.palette   || null,
        accessory: pd.accessory || data.accessory || null,
      };

      // Persist player
      db.upsertPlayer({
        id:            player.id,
        display_name:  player.name,
        color_palette: player.palette,
        accessory:     player.accessory,
      });

      const roomCode = rooms.createRoom(player, data.mode || 'story');
      socket.join(roomCode);

      const room = rooms.getRoom(roomCode);
      const response = {
        roomCode,
        playerId,
        room:    rooms.roomSnapshot(room),
      };

      if (typeof ack === 'function') ack({ ok: true, ...response });
      socket.emit('room:created', response);

      console.log(`[socket] room:create → ${roomCode} (player ${playerId})`);
    } catch (err) {
      console.error('[socket] room:create error:', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ── room:join ────────────────────────────────────────────────────────────

  socket.on('room:join', (data, ack) => {
    try {
      const roomCode = (data.roomCode || '').toUpperCase().trim();
      const pd = data.player || data;
      const playerId = pd.id || data.playerId || uuidv4();

      const player = {
        id:        playerId,
        name:      pd.name      || data.name      || 'Player 2',
        socketId:  socket.id,
        palette:   pd.palette   || data.palette   || null,
        accessory: pd.accessory || data.accessory || null,
      };

      db.upsertPlayer({
        id:            player.id,
        display_name:  player.name,
        color_palette: player.palette,
        accessory:     player.accessory,
      });

      const result = rooms.joinRoom(roomCode, player);

      if (result.error) {
        if (typeof ack === 'function') ack({ ok: false, error: result.error });
        return;
      }

      socket.join(roomCode);

      const snapshot = rooms.roomSnapshot(result.room);

      // Tell the joiner about the room AND who their partner (host) is
      const host = result.room.players.find(p => p.id !== playerId);
      const response = { roomCode, playerId, room: snapshot, role: 'guest', partner: host || null };
      if (typeof ack === 'function') ack({ ok: true, ...response });
      socket.emit('room:joined', response);

      // Notify only the HOST that a partner joined (not the joiner themselves)
      socket.to(roomCode).emit('room:partnerJoined', {
        room: snapshot,
        newPlayer: player,
      });

      console.log(`[socket] room:join → ${roomCode} (player ${playerId})`);

      // If chapter 1 hasn't started yet, send intro narrator line
      if (result.room.chapter === 1 && result.room.status === ROOM_STATUS.LOBBY) {
        emitNarrator(roomCode, 1, 'intro', 0, 1000);
      }
    } catch (err) {
      console.error('[socket] room:join error:', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ── player:update ────────────────────────────────────────────────────────

  socket.on('player:update', (data, ack) => {
    try {
      const room = rooms.getRoomBySocketId(socket.id);
      if (!room) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not in a room' });
        return;
      }

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Player not found' });
        return;
      }

      if (data.name)      player.name      = data.name;
      if (data.palette)   player.palette   = data.palette;
      if (data.accessory) player.accessory = data.accessory;

      db.upsertPlayer({
        id:            player.id,
        display_name:  player.name,
        color_palette: player.palette,
        accessory:     player.accessory,
      });

      const snapshot = rooms.roomSnapshot(room);
      io.to(room.roomCode).emit('room:updated', { room: snapshot });

      if (typeof ack === 'function') ack({ ok: true, player });
    } catch (err) {
      console.error('[socket] player:update error:', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ── game:ready ───────────────────────────────────────────────────────────
  // Emitted by each client when they are ready to start or continue.
  // First call (status=LOBBY): starts the first mini-game of the chapter.
  // Subsequent calls (status=RESULTS): advances to the next mini-game via
  // advanceStoryMode (which handles narrator lines + chapter completion).

  socket.on('game:ready', (data, ack) => {
    try {
      const room = rooms.getRoomBySocketId(socket.id);
      if (!room) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not in a room' });
        return;
      }

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) player.ready = true;

      const isHost = player && (player.role === 'host' || player.role === 'player1' ||
                                room.players.indexOf(player) === 0);
      const fromLobby = room.status === ROOM_STATUS.LOBBY;
      const isSolo    = !!(data && data.soloDemo);

      // Solo Play Mode: add a bot player if not already present
      if (isSolo) {
        addBotToRoom(room);
        // Mark bot as ready too
        const botP = room.players.find(p => p.isBot);
        if (botP) botP.ready = true;
      }

      // From lobby: host (or solo) starts the game immediately.
      // Between games: all human players must be ready.
      const humanPlayers = room.players.filter(p => !p.isBot);
      const allReady = fromLobby
        ? (isHost || isSolo)
        : humanPlayers.every(p => p.ready) && (humanPlayers.length >= 1 || isSolo);

      io.to(room.roomCode).emit('room:readyState', {
        players: room.players.map(p => ({ id: p.id, ready: p.ready })),
        allReady,
      });

      if (typeof ack === 'function') ack({ ok: true, allReady });

      if (allReady) {
        // Reset ready flags for human players only
        room.players.forEach(p => { if (!p.isBot) p.ready = false; });

        if (room.mode === 'story') {
          if (fromLobby) {
            // First start: kick off mini-game index 0
            const next = getNextMiniGame(room.roomCode, rooms);
            if (next) {
              const config = next.isBoss && next.gameId === GAME_IDS.FINAL_LABYRINTH
                ? { level: 3 }
                : {};
              startMiniGame(room.roomCode, next.gameId, config);
            }
          } else {
            // Post-result: advance story (narrator → next game or chapter complete)
            advanceStoryMode(room.roomCode);
          }
        } else if (data && data.gameId) {
          // Play mode: start the requested game (solo + bot or multiplayer)
          startMiniGame(room.roomCode, data.gameId, data.config || {});
        }
      }
    } catch (err) {
      console.error('[socket] game:ready error:', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ── game:input ───────────────────────────────────────────────────────────

  socket.on('game:input', (data) => {
    try {
      const room = rooms.getRoomBySocketId(socket.id);
      if (!room || !room.gameEngine) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      room.gameEngine.processInput(
        player.id,
        data.inputType || data.type,
        data.inputData || data.data || {}
      );
    } catch (err) {
      console.error('[socket] game:input error:', err);
    }
  });

  // ── game:result (relayed from engine; server listens for client ack) ──────

  socket.on('game:resultAck', (data, ack) => {
    try {
      const room = rooms.getRoomBySocketId(socket.id);
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) player.resultAcked = true;

      const allAcked = room.players.every(p => p.resultAcked);
      if (typeof ack === 'function') ack({ ok: true });

      if (allAcked) {
        room.players.forEach(p => { p.resultAcked = false; });
        if (room.mode === 'story') {
          advanceStoryMode(room.roomCode);
        } else {
          rooms.updateRoomState(room.roomCode, { status: ROOM_STATUS.RESULTS });
          io.to(room.roomCode).emit('room:results', { room: rooms.roomSnapshot(room) });
        }
      }
    } catch (err) {
      console.error('[socket] game:resultAck error:', err);
    }
  });

  // ── game:pause / game:resume ─────────────────────────────────────────────

  socket.on('game:pause', () => {
    const room = rooms.getRoomBySocketId(socket.id);
    if (!room) return;
    if (room.gameEngine && room.gameEngine.isRunning) room.gameEngine.stop();
    io.to(room.roomCode).emit('game:paused', { roomCode: room.roomCode });
  });

  socket.on('game:resume', () => {
    const room = rooms.getRoomBySocketId(socket.id);
    if (!room) return;
    if (room.gameEngine && !room.gameEngine.isRunning) room.gameEngine.start();
    io.to(room.roomCode).emit('game:resumed', { roomCode: room.roomCode });
  });

  // ── story:chapterStart / story:startChapter ──────────────────────────────
  // Client can request to (re)start a specific chapter (e.g. from chapter select screen).
  // Both event names are accepted for compatibility.

  const handleStoryChapterStart = (data, ack) => {
    try {
      const room = rooms.getRoomBySocketId(socket.id);
      if (!room) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not in a room' });
        return;
      }

      const chapterId = (data && data.chapter) || 1;
      const chapterDef = CHAPTERS.find(c => c.id === chapterId);
      if (!chapterDef) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Unknown chapter' });
        return;
      }

      rooms.updateRoomState(room.roomCode, {
        chapter:       chapterId,
        miniGameIndex: 0,
        status:        ROOM_STATUS.LOBBY,
      });

      io.to(room.roomCode).emit('chapter:start', {
        chapter:   chapterId,
        chapterName: chapterDef.name,
        theme:     chapterDef.theme,
        charmId:   chapterDef.charmId,
      });

      // Send chapter intro narrator text after a short pause
      emitNarrator(room.roomCode, chapterId, 'intro', 0, 500);

      if (typeof ack === 'function') ack({ ok: true });
    } catch (err) {
      console.error('[socket] story:chapterStart error:', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  };

  socket.on('story:chapterStart',  handleStoryChapterStart);
  socket.on('story:startChapter',  handleStoryChapterStart);

  // ── player:reconnect ─────────────────────────────────────────────────────
  // Client fires this on every socket (re)connect if it has stored session data.

  socket.on('player:reconnect', (data, ack) => {
    try {
      const { playerId, roomCode } = data || {};
      if (!playerId || !roomCode) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Missing playerId or roomCode' });
        return;
      }

      const result = rooms.playerReconnected(playerId, socket.id);

      if (!result) {
        // Grace period expired or room gone — treat as a fresh join attempt
        if (typeof ack === 'function') ack({ ok: false, error: 'Session expired' });
        return;
      }

      const { room, player } = result;
      socket.join(room.roomCode);

      const snapshot = rooms.roomSnapshot(room);
      if (typeof ack === 'function') ack({ ok: true, room: snapshot, role: player.role });
      socket.emit('room:joined', { roomCode: room.roomCode, playerId, room: snapshot });

      // Tell partner they're back
      socket.to(room.roomCode).emit('room:partnerReconnected', {
        player: { id: player.id, name: player.name, palette: player.palette, accessory: player.accessory },
        room: snapshot,
      });

      // Resume any paused engine
      if (room.gameEngine && !room.gameEngine.isRunning) {
        room.gameEngine.start();
        io.to(room.roomCode).emit('game:resumed', { reason: 'partner_reconnected' });
      }

      console.log(`[socket] player:reconnect → ${room.roomCode} (player ${playerId})`);
    } catch (err) {
      console.error('[socket] player:reconnect error:', err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // ── disconnect ───────────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    console.log(`[socket] Disconnected: ${socket.id} (${reason})`);

    const room = rooms.getRoomBySocketId(socket.id);
    if (!room) return;

    const { roomCode } = room;

    // Start grace period — don't destroy the room immediately
    const { playerId } = rooms.playerDisconnected(roomCode, socket.id, (code, pid) => {
      // Grace period expired: hard-remove the player
      const updatedRoom = rooms.getRoom(code);
      if (updatedRoom) {
        io.to(code).emit('room:partnerLeft', {
          playerId: pid,
          permanent: true,
          room: rooms.roomSnapshot(updatedRoom),
        });
      }
      console.log(`[rooms] Player ${pid} permanently removed from ${code} (grace expired)`);
    });

    // Notify partner of temporary disconnect
    io.to(roomCode).emit('room:partnerDisconnected', {
      playerId,
      reconnectWindowMs: 45000,
    });

    // Pause any running engine
    if (room.gameEngine && room.gameEngine.isRunning) {
      room.gameEngine.stop();
      io.to(roomCode).emit('game:paused', { reason: 'partner_disconnected' });
    }
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[server] Tandem server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);

  // Warm up the database
  try {
    db.getDb();
    console.log('[server] Database initialised');
  } catch (err) {
    console.error('[server] Database init failed:', err.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received — shutting down');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[server] SIGINT received — shutting down');
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };  // for testing
