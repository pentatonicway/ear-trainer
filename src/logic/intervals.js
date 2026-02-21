/**
 * intervals.js
 * Core interval definitions and lookup utilities.
 * No UI dependencies. Pure data + pure functions.
 */

export const INTERVALS = [
  { id: 'root',          name: 'Root',          semitones: 0,  phase: 1,  displayName: 'Root (Unison)' },
  { id: 'perfect_fourth',name: 'Perfect Fourth', semitones: 5,  phase: 1,  displayName: 'Perfect 4th' },
  { id: 'perfect_fifth', name: 'Perfect Fifth',  semitones: 7,  phase: 1,  displayName: 'Perfect 5th' },
  { id: 'tritone',       name: 'Tritone',        semitones: 6,  phase: 2,  displayName: 'Tritone' },
  { id: 'major_third',   name: 'Major Third',    semitones: 4,  phase: 3,  displayName: 'Major 3rd' },
  { id: 'minor_third',   name: 'Minor Third',    semitones: 3,  phase: 4,  displayName: 'Minor 3rd' },
  { id: 'major_sixth',   name: 'Major Sixth',    semitones: 9,  phase: 5,  displayName: 'Major 6th' },
  { id: 'minor_sixth',   name: 'Minor Sixth',    semitones: 8,  phase: 6,  displayName: 'Minor 6th' },
  { id: 'major_second',  name: 'Major Second',   semitones: 2,  phase: 7,  displayName: 'Major 2nd' },
  { id: 'minor_second',  name: 'Minor Second',   semitones: 1,  phase: 8,  displayName: 'Minor 2nd' },
  { id: 'major_seventh', name: 'Major Seventh',  semitones: 11, phase: 9,  displayName: 'Major 7th' },
  { id: 'minor_seventh', name: 'Minor Seventh',  semitones: 10, phase: 10, displayName: 'Minor 7th' },
]

/** Root notes available as quiz keys */
export const KEYS = ['C', 'G', 'D', 'A', 'E']

/**
 * Returns the interval object with the given id, or undefined if not found.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getIntervalById(id) {
  return INTERVALS.find((interval) => interval.id === id)
}

/**
 * Returns all intervals whose phase number is <= the given phase.
 * @param {number} phase
 * @returns {object[]}
 */
export function getIntervalsForPhase(phase) {
  return INTERVALS.filter((interval) => interval.phase <= phase)
}
