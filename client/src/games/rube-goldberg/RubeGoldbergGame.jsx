import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Component definitions ────────────────────────────────────────────────────

const COMPONENT_ICONS = {
  launcher:      '🚀',
  collector:     '🎯',
  ramp_right:    '↘',
  ramp_left:     '↙',
  redirect_up:   '↑',
  redirect_down: '↓',
}

const COMPONENT_LABELS = {
  launcher:      'Launcher',
  collector:     'Collector',
  ramp_right:    'Ramp →',
  ramp_left:     'Ramp ←',
  redirect_up:   'Bounce Up',
  redirect_down: 'Bounce Down',
}

const COMPONENT_COLORS = {
  launcher:      '#E8873A',
  collector:     '#44CC66',
  ramp_right:    '#B5651D',
  ramp_left:     '#9B72C4',
  redirect_up:   '#3D7BC4',
  redirect_down: '#C44444',
}

// ─── Zone colors ──────────────────────────────────────────────────────────────

function getCellBackground(col, p1Cols, p2Cols, midCols, sharedTurn, myPlayerNum) {
  if (p1Cols && p1Cols.includes(col)) return myPlayerNum === 1 ? '#FFF7ED' : '#F5F0E8'
  if (p2Cols && p2Cols.includes(col)) return myPlayerNum === 2 ? '#FFF7ED' : '#F5F0E8'
  if (midCols && midCols.includes(col)) {
    // Shared zone - highlight if it's current player's turn
    if (sharedTurn === myPlayerNum) return '#FFFBEB'
    return '#F0F0F0'
  }
  return '#FAFAFA'
}

// ─── Grid cell ────────────────────────────────────────────────────────────────

function GridCell({
  row, col, component, isPath, pathIndex, pathLength,
  canPlace, onPlace, onRemove, selectedComponent,
  p1Cols, p2Cols, midCols, sharedTurn, myPlayerNum,
}) {
  const bg    = getCellBackground(col, p1Cols, p2Cols, midCols, sharedTurn, myPlayerNum)
  const comp  = component
  const icon  = comp ? COMPONENT_ICONS[comp] : null
  const color = comp ? COMPONENT_COLORS[comp] : null

  // Path animation
  const pathProgress = pathLength > 0 ? pathIndex / pathLength : null
  const pathColor    = pathProgress != null
    ? `rgba(255, ${Math.round(200 * (1 - pathProgress))}, 0, ${0.4 + pathProgress * 0.5})`
    : null

  const handleClick = useCallback(() => {
    if (!canPlace) return
    if (comp && comp !== 'launcher' && comp !== 'collector') {
      onRemove(row, col)
    } else if (selectedComponent && !comp) {
      onPlace(row, col, selectedComponent)
    }
  }, [canPlace, comp, row, col, selectedComponent, onPlace, onRemove])

  return (
    <div
      onClick={handleClick}
      className={[
        'border border-amber-200/60 flex items-center justify-center relative transition-all select-none',
        canPlace && !comp ? 'cursor-pointer hover:bg-amber-100' : '',
        canPlace && comp && comp !== 'launcher' && comp !== 'collector' ? 'cursor-pointer' : '',
        isPath ? 'ring-1 ring-orange-400' : '',
      ].join(' ')}
      style={{
        background: isPath ? pathColor : bg,
        aspectRatio: '1',
        minWidth: 0,
      }}
    >
      {icon && (
        <span
          className="text-base leading-none select-none"
          style={{ color }}
          title={COMPONENT_LABELS[comp]}
        >
          {icon}
        </span>
      )}
    </div>
  )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function Grid({
  grid, rows, cols, p1Cols, p2Cols, midCols, sharedTurn, myPlayerNum,
  selectedComponent, onPlace, onRemove, simulationPath,
}) {
  const pathSet = new Map()
  if (simulationPath) {
    simulationPath.forEach((pt, i) => {
      pathSet.set(`${pt.row},${pt.col}`, { index: i, total: simulationPath.length })
    })
  }

  return (
    <div
      className="w-full border-2 border-amber-400 rounded-lg overflow-hidden"
      style={{
        display:             'grid',
        gridTemplateColumns: `repeat(${cols || 12}, 1fr)`,
        gridTemplateRows:    `repeat(${rows || 8}, 1fr)`,
        aspectRatio:         `${cols || 12} / ${rows || 8}`,
      }}
    >
      {Array.from({ length: rows || 8 }).map((_, r) =>
        Array.from({ length: cols || 12 }).map((_, c) => {
          const comp       = grid?.[r]?.[c] || null
          const pathEntry  = pathSet.get(`${r},${c}`)
          const isP1Zone   = p1Cols?.includes(c)
          const isP2Zone   = p2Cols?.includes(c)
          const isMidZone  = midCols?.includes(c)
          const canPlace   = myPlayerNum === 1
            ? (isP1Zone || (isMidZone && sharedTurn === 1))
            : (isP2Zone || (isMidZone && sharedTurn === 2))

          return (
            <GridCell
              key={`${r}-${c}`}
              row={r} col={c}
              component={comp}
              isPath={!!pathEntry}
              pathIndex={pathEntry?.index || 0}
              pathLength={pathEntry?.total || 0}
              canPlace={canPlace}
              onPlace={onPlace}
              onRemove={onRemove}
              selectedComponent={selectedComponent}
              p1Cols={p1Cols}
              p2Cols={p2Cols}
              midCols={midCols}
              sharedTurn={sharedTurn}
              myPlayerNum={myPlayerNum}
            />
          )
        })
      )}
    </div>
  )
}

// ─── Component palette ────────────────────────────────────────────────────────

function ComponentPalette({ components, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {(components || []).filter(c => c !== 'launcher' && c !== 'collector').map(comp => (
        <button
          key={comp}
          onClick={() => onSelect(comp === selected ? null : comp)}
          className={[
            'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-2 transition-all text-center',
            selected === comp
              ? 'border-amber-600 bg-amber-100 shadow-md scale-105'
              : 'border-amber-200 bg-white',
          ].join(' ')}
        >
          <span className="text-xl" style={{ color: COMPONENT_COLORS[comp] }}>
            {COMPONENT_ICONS[comp]}
          </span>
          <span className="text-xs font-body text-amber-800 leading-tight">
            {COMPONENT_LABELS[comp]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({ timeLeft, duration }) {
  const pct   = Math.max(0, Math.min(100, (timeLeft / duration) * 100))
  const color = pct > 50 ? '#B5651D' : pct > 25 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full h-2 rounded-full bg-amber-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ─── Zone legend ─────────────────────────────────────────────────────────────

function ZoneLegend({ myPlayerNum, sharedTurn }) {
  const isMySharedTurn = sharedTurn === myPlayerNum
  return (
    <div className="flex gap-2 text-xs font-body justify-center flex-wrap">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm border border-amber-300" style={{ background: '#FFF7ED' }} />
        <span className="text-amber-700">Your zone</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-sm border border-stone-300" style={{ background: '#F5F0E8' }} />
        <span className="text-stone-500">Partner zone</span>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="w-3 h-3 rounded-sm border"
          style={{ background: isMySharedTurn ? '#FFFBEB' : '#F0F0F0', borderColor: isMySharedTurn ? '#D97706' : '#CCC' }}
        />
        <span className={isMySharedTurn ? 'text-amber-700 font-bold' : 'text-stone-400'}>
          Shared {isMySharedTurn ? '(your turn)' : '(partner)'}
        </span>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function RubeGoldbergGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const myPlayerNum = myRole === 'player1' ? 1 : 2

  const [selectedComponent, setSelectedComponent] = useState(null)

  // Clear selection when it's no longer my turn in the shared zone
  useEffect(() => {
    if (gameState?.sharedTurn !== myPlayerNum) {
      // Keep own-zone selection active; only lose it if forced
    }
  }, [gameState?.sharedTurn, myPlayerNum])

  const handlePlace = useCallback((row, col, component) => {
    sendInput('place', { row, col, component })
  }, [sendInput])

  const handleRemove = useCallback((row, col) => {
    sendInput('remove', { row, col })
  }, [sendInput])

  const handleReady = useCallback(() => {
    sendInput('ready', {})
  }, [sendInput])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="font-handwriting text-xl text-amber-800">Setting up the workshop…</div>
      </div>
    )
  }

  const {
    phase, grid, rows, cols, p1Cols, p2Cols, midCols,
    p1Components, p2Components, sharedTurn,
    readyFlags, timeLeft, duration,
    simulationPath, simulationResult,
    launcherPos, collectorPos,
  } = gameState

  const myComponents = myPlayerNum === 1 ? p1Components : p2Components
  const myReady      = readyFlags?.[myPlayerNum]
  const partnerReady = readyFlags?.[myPlayerNum === 1 ? 2 : 1]

  if (phase === 'won' || phase === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-5 px-8">
        <div className="text-6xl">{phase === 'won' ? '⚙️' : '💥'}</div>
        <div className="font-handwriting text-3xl font-bold text-amber-900 text-center">
          {phase === 'won' ? 'The Machine Works!' : 'The Ball Got Lost…'}
        </div>
        {simulationPath && (
          <div className="font-body text-sm text-amber-700 text-center">
            Ball traveled {simulationPath.length} steps
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-amber-50 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-800 text-white px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-handwriting text-lg font-bold leading-tight">Rube Goldberg Machine</div>
            <div className="text-xs opacity-70 font-body">
              {phase === 'simulating' ? 'Launching the ball…' :
               myReady ? 'Waiting for partner…' :
               `You are Player ${myPlayerNum}`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-handwriting text-xl font-bold tabular-nums">{timeLeft || 0}s</div>
          </div>
        </div>
        <div className="mt-1.5">
          <TimerBar timeLeft={timeLeft || 0} duration={duration || 90} />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden min-h-0">
        {/* Zone legend */}
        <ZoneLegend myPlayerNum={myPlayerNum} sharedTurn={sharedTurn} />

        {/* Grid */}
        <div className="flex-1 min-h-0">
          <Grid
            grid={grid}
            rows={rows}
            cols={cols}
            p1Cols={p1Cols}
            p2Cols={p2Cols}
            midCols={midCols}
            sharedTurn={sharedTurn}
            myPlayerNum={myPlayerNum}
            selectedComponent={selectedComponent}
            onPlace={handlePlace}
            onRemove={handleRemove}
            simulationPath={phase === 'simulating' || phase === 'won' || phase === 'failed' ? simulationPath : null}
          />
        </div>

        {/* Component palette */}
        {phase === 'building' && !myReady && (
          <ComponentPalette
            components={myComponents}
            selected={selectedComponent}
            onSelect={setSelectedComponent}
          />
        )}

        {/* Shared zone turn hint */}
        {phase === 'building' && !myReady && (
          <div className="text-center text-xs font-body text-amber-700/70">
            {sharedTurn === myPlayerNum
              ? 'Shared zone: your turn to place'
              : 'Shared zone: wait for partner'}
            {selectedComponent && ` • Selected: ${COMPONENT_LABELS[selectedComponent]}`}
          </div>
        )}

        {/* Simulating indicator */}
        {phase === 'simulating' && (
          <div className="text-center font-handwriting text-lg text-amber-800 animate-pulse">
            Testing the machine…
          </div>
        )}

        {/* Ready button */}
        {phase === 'building' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleReady}
              disabled={myReady}
              className={[
                'flex-1 py-3 rounded-xl font-handwriting text-lg font-bold shadow transition-all',
                myReady
                  ? 'bg-green-200 border-2 border-green-500 text-green-800 cursor-default'
                  : 'bg-amber-700 text-white active:scale-95',
              ].join(' ')}
            >
              {myReady ? '✓ Ready!' : 'Test It!'}
            </button>
            {partnerReady && !myReady && (
              <div className="text-xs font-body text-green-700 text-center">
                Partner ready!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
