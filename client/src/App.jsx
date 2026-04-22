import React, { useState, useEffect, useCallback } from 'react'
import { GameProvider, useGame } from './context/GameContext.jsx'
import HomeScreen      from './components/HomeScreen.jsx'
import CharacterSelect from './components/CharacterSelect.jsx'
import Lobby           from './components/Lobby.jsx'
import ChapterMap      from './components/ChapterMap.jsx'
import MiniGameShell   from './components/MiniGameShell.jsx'
import PlayModeMenu    from './components/PlayModeMenu.jsx'
import ResultsScreen   from './components/ResultsScreen.jsx'
import CharmAward      from './components/CharmAward.jsx'
import NarratorOverlay from './components/NarratorOverlay.jsx'
import AudioManager    from './audio/AudioManager.js'

// Screens
const SCREENS = {
  HOME:            'home',
  CHARACTER_SELECT:'characterSelect',
  LOBBY:           'lobby',
  CHAPTER_MAP:     'chapterMap',
  MINI_GAME:       'miniGame',
  PLAY_MODE:       'playMode',
  RESULTS:         'results',
  CHARM_AWARD:     'charmAward',
  SETTINGS:        'settings',
}

function AppInner() {
  const {
    socket,
    connected,
    room,
    setRoom,
    narratorText,
    clearNarratorText,
    gameResults,
    clearGameResults,
    player,
  } = useGame()

  const [screen, setScreen]               = useState(SCREENS.HOME)
  const [prevScreen, setPrevScreen]       = useState(null)
  const [isHost, setIsHost]               = useState(false)
  const [afterCharSelect, setAfterCharSelect] = useState(null)
  const [activeGame, setActiveGame]       = useState(null) // { id, title, hint }
  const [progress, setProgress]           = useState({})    // chapter progress
  const [currentChapter, setCurrentChapter] = useState(1)
  const [gameScores, setGameScores]       = useState({})
  const [charmAwardData, setCharmAwardData] = useState(null) // { chapterId, chapterName, charmId }

  // Push navigation helper
  const goTo = useCallback((s, prev = null) => {
    setPrevScreen(prev || screen)
    setScreen(s)
  }, [screen])

  // ── Socket: game lifecycle ─────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    // game:starting — server is about to launch a mini-game; navigate immediately
    const onGameStarting = (data) => {
      const myPlayer = data.players?.find(p => p.id === player?.id)
      setActiveGame({
        id:    data.gameId,
        title: data.title  || data.gameId,
        hint:  myPlayer?.role === 'player2' ? data.hint2 : data.hint,
        role:  myPlayer?.role,
        chapter: data.chapter,
      })
      goTo(SCREENS.MINI_GAME)
    }

    // game:start — older / fallback event name
    const onGameStart = (data) => {
      setActiveGame({
        id:    data.gameId,
        title: data.title || data.gameId,
        hint:  data.hint,
        chapter: data.chapter,
      })
      goTo(SCREENS.MINI_GAME)
    }

    const onGameResults = (data) => {
      // Update local scores
      if (data.gameId && data.stars != null) {
        setGameScores(prev => ({
          ...prev,
          [data.gameId]: Math.max(prev[data.gameId] || 0, data.stars),
        }))
      }
      goTo(SCREENS.RESULTS)
    }

    const onChapterProgress = (data) => {
      setProgress(prev => ({ ...prev, ...data }))
      if (data.currentChapter) setCurrentChapter(data.currentChapter)
    }

    // chapter:start — server advances to a new chapter
    const onChapterStart = (data) => {
      if (data.chapter) setCurrentChapter(data.chapter)
      goTo(SCREENS.LOBBY)
    }

    // game:chapterComplete / chapter:complete — chapter finished, show charm award
    const onChapterComplete = (data) => {
      setCharmAwardData({
        chapterId:   data.chapter,
        chapterName: data.chapterName,
        charmId:     data.charmId,
      })
      goTo(SCREENS.CHARM_AWARD)
      // Update progress to mark chapter complete
      setProgress(prev => ({
        ...prev,
        [data.chapter]: { ...(prev[data.chapter] || {}), completed: true },
      }))
    }

    socket.on('game:starting',        onGameStarting)
    socket.on('game:start',           onGameStart)
    socket.on('game:results',         onGameResults)
    socket.on('chapter:progress',     onChapterProgress)
    socket.on('chapter:start',        onChapterStart)
    socket.on('chapter:complete',     onChapterComplete)
    socket.on('game:chapterComplete', onChapterComplete)

    return () => {
      socket.off('game:starting',        onGameStarting)
      socket.off('game:start',           onGameStart)
      socket.off('game:results',         onGameResults)
      socket.off('chapter:progress',     onChapterProgress)
      socket.off('chapter:start',        onChapterStart)
      socket.off('chapter:complete',     onChapterComplete)
      socket.off('game:chapterComplete', onChapterComplete)
    }
  }, [socket, goTo, player])

  // ── Init audio on first interaction ───────────────────────────
  const initAudio = useCallback(() => {
    AudioManager.init().catch(() => {})
  }, [])

  // ── Navigation handlers ────────────────────────────────────────

  // Home → Story Mode: character select then create room
  const handleStoryMode = () => {
    setAfterCharSelect(() => () => {
      createRoom('story')
    })
    goTo(SCREENS.CHARACTER_SELECT, SCREENS.HOME)
  }

  // Home → Play Mode: character select then play mode menu
  const handlePlayMode = () => {
    setAfterCharSelect(() => () => {
      createRoom('play')
    })
    goTo(SCREENS.CHARACTER_SELECT, SCREENS.HOME)
  }

  // Home → Join Game
  const handleJoinGame = (code) => {
    if (!socket) return
    socket.emit('room:join', { roomCode: code, player }, (response) => {
      if (response?.ok) {
        setRoom(response.room)
        setIsHost(false)
        goTo(SCREENS.LOBBY, SCREENS.HOME)
        try { AudioManager.init().then(() => AudioManager.playConnect()) } catch (_) {}
      } else {
        alert(response?.message || 'Could not join room. Check the code and try again.')
      }
    })
  }

  // Create a room on server
  const createRoom = useCallback((mode) => {
    // Navigate immediately — don't block on socket ack
    setIsHost(true)
    if (mode === 'story') goTo(SCREENS.LOBBY)
    else goTo(SCREENS.PLAY_MODE)

    if (!socket) return
    socket.emit('room:create', { mode, player }, (response) => {
      if (response?.ok) {
        setRoom(response.room)
        try { AudioManager.init() } catch (_) {}
      }
    })
  }, [socket, player, goTo, setRoom, setIsHost])

  const handleCharSelectDone = () => {
    if (afterCharSelect) {
      afterCharSelect()
      setAfterCharSelect(null)
    } else {
      goTo(prevScreen || SCREENS.HOME)
    }
  }

  // Host clicks "Start Adventure" in lobby — emit game:ready to kick off ch.1
  const handleStartGame = () => {
    if (socket && room) {
      socket.emit('game:ready', { roomCode: room.roomCode })
    } else {
      // Demo/offline: open chapter map
      goTo(SCREENS.CHAPTER_MAP)
    }
  }

  // Player taps "Next Game" from results screen — signal ready for next game
  const handleNextGame = useCallback(() => {
    clearGameResults()
    if (socket && room) {
      socket.emit('game:ready', { roomCode: room.roomCode })
      // Stay on results/loading — server will push game:starting when both ready
    } else {
      goTo(SCREENS.CHAPTER_MAP)
    }
  }, [socket, room, clearGameResults, goTo])

  const handleSelectChapter = (chapter) => {
    setCurrentChapter(chapter.id)
    if (socket && room) {
      socket.emit('story:startChapter', { chapter: chapter.id, roomCode: room.roomCode })
    } else {
      // Demo: launch first game of chapter
      setActiveGame({
        id: 'labyrinth',
        title: 'Labyrinth',
        hint: 'Player 1 tilts left-right. Player 2 tilts forward-back. Work together!',
      })
      goTo(SCREENS.MINI_GAME)
    }
  }

  const handleSelectGame = (game) => {
    setActiveGame({ id: game.id, title: game.title, hint: game.description })
    goTo(SCREENS.MINI_GAME)
  }

  const handleGameComplete = (action) => {
    if (action === 'next') {
      handleNextGame()
    } else if (action === 'restart') {
      goTo(SCREENS.MINI_GAME)
    }
  }

  const handleCharms = () => {
    // Placeholder
    alert('Charms collection coming soon!')
  }

  const handleSettings = () => {
    goTo(SCREENS.SETTINGS)
  }

  // ── Narrator auto-play chime ───────────────────────────────────
  useEffect(() => {
    if (narratorText) {
      AudioManager.init().catch(() => {})
    }
  }, [narratorText])

  // ── Screen render ──────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case SCREENS.HOME:
        return (
          <HomeScreen
            onStoryMode={handleStoryMode}
            onPlayMode={handlePlayMode}
            onJoinGame={handleJoinGame}
            onCharms={handleCharms}
            onSettings={handleSettings}
          />
        )

      case SCREENS.CHARACTER_SELECT:
        return (
          <CharacterSelect
            onDone={handleCharSelectDone}
          />
        )

      case SCREENS.LOBBY:
        return (
          <Lobby
            isHost={isHost}
            onCustomize={() => {
              setAfterCharSelect(() => () => goTo(SCREENS.LOBBY))
              goTo(SCREENS.CHARACTER_SELECT, SCREENS.LOBBY)
            }}
            onStart={handleStartGame}
            onBack={() => goTo(SCREENS.HOME)}
          />
        )

      case SCREENS.CHAPTER_MAP:
        return (
          <ChapterMap
            progress={progress}
            currentChapter={currentChapter}
            onSelectChapter={handleSelectChapter}
            onBack={() => goTo(SCREENS.HOME)}
          />
        )

      case SCREENS.MINI_GAME:
        return (
          <MiniGameShell
            gameId={activeGame?.id || 'labyrinth'}
            gameTitle={activeGame?.title || 'Labyrinth'}
            hint={activeGame?.hint}
            role={activeGame?.role}
            onComplete={handleGameComplete}
            onNext={() => handleGameComplete('next')}
            onRestart={() => handleGameComplete('restart')}
            onHome={() => goTo(SCREENS.HOME)}
          />
        )

      case SCREENS.PLAY_MODE:
        return (
          <PlayModeMenu
            scores={gameScores}
            onSelectGame={handleSelectGame}
            onBack={() => goTo(SCREENS.HOME)}
          />
        )

      case SCREENS.RESULTS:
        return (
          <ResultsScreen
            onPlayAgain={() => {
              clearGameResults()
              if (activeGame) goTo(SCREENS.MINI_GAME)
            }}
            onNextGame={handleNextGame}
            onHome={() => {
              clearGameResults()
              goTo(SCREENS.HOME)
            }}
          />
        )

      case SCREENS.CHARM_AWARD:
        return (
          <CharmAward
            chapterId={charmAwardData?.chapterId}
            chapterName={charmAwardData?.chapterName}
            charmId={charmAwardData?.charmId}
            onContinue={() => {
              const next = (charmAwardData?.chapterId || 0) + 1
              setCurrentChapter(next > 6 ? 6 : next)
              setCharmAwardData(null)
              goTo(SCREENS.LOBBY)
            }}
          />
        )

      case SCREENS.SETTINGS:
        return (
          <div className="flex flex-col h-full bg-paper-cream paper-texture safe-top safe-bottom">
            <div className="flex items-center px-5 pt-2 pb-4">
              <button
                onClick={() => goTo(SCREENS.HOME)}
                className="p-2 rounded-full active:scale-90 transition-transform"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
              <h1 className="font-handwriting text-2xl font-bold text-paper-card-dark ml-3">Settings</h1>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              <div className="text-5xl">⚙️</div>
              <p className="font-handwriting text-2xl text-paper-card-dark text-center">
                Settings coming soon
              </p>
              <p className="font-body text-sm text-paper-card-dark/50 text-center">
                Audio, haptics, and accessibility options will live here.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      onPointerDown={initAudio}
    >
      {renderScreen()}

      {/* Narrator overlay — always on top */}
      {narratorText && (
        <NarratorOverlay
          text={typeof narratorText === 'string' ? narratorText : narratorText.text}
          onDone={clearNarratorText}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  )
}
