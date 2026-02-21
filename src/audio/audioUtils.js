/**
 * audioUtils.js
 * Framework-agnostic audio helper utilities.
 * No React, no side effects.
 */

/**
 * All chromatic notes across octaves 2–6 with their exact A4=440 Hz frequencies.
 * Generated once at module load.
 */
const NOTE_TABLE = (() => {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const entries = []
  // A4 is MIDI note 69; C0 is MIDI 0
  // We cover octaves 2–6 (MIDI 24–83)
  for (let midi = 24; midi <= 95; midi++) {
    const octave = Math.floor(midi / 12) - 1
    const name   = NAMES[midi % 12]
    const freq   = 440 * Math.pow(2, (midi - 69) / 12)
    entries.push({ note: `${name}${octave}`, freq, midi })
  }
  return entries
})()

/**
 * Converts a frequency in Hz to the nearest Tone.js note string.
 * e.g. 440 → "A4", 261.63 → "C4"
 *
 * @param {number} hz
 * @returns {string} Tone.js note name (e.g. "A4", "C#4")
 */
export function frequencyToSamplerNote(hz) {
  if (typeof hz !== 'number' || hz <= 0) {
    throw new Error(`Invalid frequency: ${hz}`)
  }

  let closest = NOTE_TABLE[0]
  let minDist = Math.abs(hz - closest.freq)

  for (const entry of NOTE_TABLE) {
    const dist = Math.abs(hz - entry.freq)
    if (dist < minDist) {
      minDist = dist
      closest = entry
    }
  }

  return closest.note
}
