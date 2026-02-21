/**
 * noteUtils.js
 * Frequency calculations for notes and intervals.
 * Pure functions, no side effects, no UI dependencies.
 *
 * Tuning: A4 = 440 Hz, equal temperament.
 * Formula: f = 440 * 2^((semitones_from_A4) / 12)
 */

/** Semitone offsets from A4 (positive = above, negative = below) */
const SEMITONES_FROM_A4 = {
  C3: -21, 'C#3': -20, D3: -19, 'D#3': -18, E3: -17, F3: -16,
  'F#3': -15, G3: -14, 'G#3': -13, A3: -12, 'A#3': -11, B3: -10,
  C4:  -9,  'C#4':  -8, D4:  -7, 'D#4':  -6, E4:  -5, F4:  -4,
  'F#4':  -3, G4:  -2, 'G#4':  -1, A4:   0, 'A#4':   1, B4:   2,
}

/**
 * NOTE_FREQUENCIES: maps note-name+octave strings to Hz values.
 * Covers C3–B4 (24 notes).
 */
export const NOTE_FREQUENCIES = Object.fromEntries(
  Object.entries(SEMITONES_FROM_A4).map(([note, offset]) => [
    note,
    440 * Math.pow(2, offset / 12),
  ])
)

/**
 * Returns the frequency in Hz for a given key name played in octave 4.
 * @param {string} keyName  e.g. 'A', 'C', 'G#'
 * @returns {number} Hz
 */
export function getRootFrequency(keyName) {
  const key = `${keyName}4`
  const freq = NOTE_FREQUENCIES[key]
  if (freq === undefined) {
    throw new Error(`Unknown key: "${keyName}". Expected a note name like 'C', 'A', 'G#'.`)
  }
  return freq
}

/**
 * Returns the frequency of a note that is `semitones` above `rootHz`.
 * Uses equal temperament: f = rootHz * 2^(semitones/12)
 * @param {number} rootHz     Root frequency in Hz
 * @param {number} semitones  Number of semitones above root (0 = unison)
 * @returns {number} Hz
 */
export function getIntervalFrequency(rootHz, semitones) {
  if (semitones < 0) {
    throw new Error(`semitones must be >= 0, got ${semitones}`)
  }
  return rootHz * Math.pow(2, semitones / 12)
}
