import * as Tone from 'tone'

let initialized = false
let bgPart = null

const instruments = {}

function ensureInit() {
  if (initialized) return
  initialized = true

  // Piano: warm polyphonic synth
  instruments.piano = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
  }).toDestination()
  instruments.piano.volume.value = -6

  // Bells: metallic for sparkle SFX
  instruments.bells = new Tone.MetalSynth({
    frequency: 400,
    envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).toDestination()
  instruments.bells.volume.value = -12

  // Bass: for background music
  instruments.bass = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.8 },
  }).toDestination()
  instruments.bass.volume.value = -14

  // Soft pad for ambiance
  instruments.pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.8, decay: 0.5, sustain: 0.7, release: 2 },
  }).toDestination()
  instruments.pad.volume.value = -18
}

export const AudioManager = {
  async init() {
    await Tone.start()
    ensureInit()
  },

  playNote(instrumentName = 'piano', note = 'C4', duration = '8n') {
    try {
      ensureInit()
      const inst = instruments[instrumentName]
      if (inst) inst.triggerAttackRelease(note, duration)
    } catch (err) {
      console.warn('AudioManager.playNote error:', err)
    }
  },

  playChime() {
    try {
      ensureInit()
      const now = Tone.now()
      instruments.piano.triggerAttackRelease('E5', '16n', now)
      instruments.piano.triggerAttackRelease('G5', '16n', now + 0.1)
      instruments.piano.triggerAttackRelease('B5', '8n', now + 0.2)
    } catch (err) {
      console.warn('AudioManager.playChime error:', err)
    }
  },

  playBoop() {
    try {
      ensureInit()
      const synth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      }).toDestination()
      synth.volume.value = -10
      synth.triggerAttackRelease('C3', '16n')
      setTimeout(() => synth.dispose(), 500)
    } catch (err) {
      console.warn('AudioManager.playBoop error:', err)
    }
  },

  playSparkle() {
    try {
      ensureInit()
      const now = Tone.now()
      const notes = ['C5', 'E5', 'G5', 'C6', 'E6']
      notes.forEach((note, i) => {
        instruments.bells.triggerAttackRelease(note, '32n', now + i * 0.07)
      })
    } catch (err) {
      console.warn('AudioManager.playSparkle error:', err)
    }
  },

  playConnect() {
    try {
      ensureInit()
      const now = Tone.now()
      // Warm major chord
      instruments.piano.triggerAttackRelease(['C4', 'E4', 'G4', 'B4'], '2n', now)
      instruments.pad.triggerAttackRelease(['C3', 'G3'], '1n', now)
    } catch (err) {
      console.warn('AudioManager.playConnect error:', err)
    }
  },

  setChapterMusic(chapterNum) {
    try {
      ensureInit()
      this.stopMusic()

      // Simple arpeggiated pattern per chapter
      const chapterScales = {
        1: ['C4', 'E4', 'G4', 'B4', 'D5'],
        2: ['D4', 'F4', 'A4', 'C5', 'E5'],
        3: ['E4', 'G4', 'B4', 'D5', 'F5'],
        4: ['F4', 'A4', 'C5', 'E5', 'G5'],
        5: ['G4', 'B4', 'D5', 'F5', 'A5'],
        6: ['A4', 'C5', 'E5', 'G5', 'B5'],
      }

      const notes = chapterScales[chapterNum] || chapterScales[1]

      Tone.Transport.bpm.value = 72
      let step = 0

      bgPart = new Tone.Sequence(
        (time) => {
          instruments.pad.triggerAttackRelease(notes[step % notes.length], '2n', time)
          step++
        },
        notes,
        '2n'
      )

      bgPart.start(0)
      Tone.Transport.start()
    } catch (err) {
      console.warn('AudioManager.setChapterMusic error:', err)
    }
  },

  stopMusic() {
    try {
      if (bgPart) {
        bgPart.stop()
        bgPart.dispose()
        bgPart = null
      }
      Tone.Transport.stop()
    } catch (err) {
      console.warn('AudioManager.stopMusic error:', err)
    }
  },
}

export default AudioManager
