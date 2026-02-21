/**
 * useQuizSession.js
 * Custom React hook managing all state for a single ear-training quiz session.
 * Audio engine and question generator are injected as dependencies.
 */

import { useState, useCallback, useRef } from 'react'
import { generateSession, generateAdaptiveSession } from '../logic/questionGenerator.js'
import { getIntervalById } from '../logic/intervals.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildBreakdown(results) {
  return results.reduce((acc, { intervalId, correct }) => {
    if (!acc[intervalId]) acc[intervalId] = { correct: 0, total: 0 }
    acc[intervalId].total += 1
    if (correct) acc[intervalId].correct += 1
    return acc
  }, {})
}

// ─── initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  questions:      [],
  currentIndex:   0,
  phase:          'idle',
  selectedAnswer: null,
  isCorrect:      null,
  retryUsed:      false,
  sessionResults: [],
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useQuizSession(config) {
  const { intervalIds, keys, sessionLength, audioEngine, onSessionComplete, intervalStats } = config

  const [state, setState] = useState(INITIAL_STATE)

  // Stable ref so callbacks don't become stale when callers swap the fn
  const audioRef    = useRef(audioEngine)
  audioRef.current  = audioEngine
  const onDoneRef   = useRef(onSessionComplete)
  onDoneRef.current = onSessionComplete

  // ── audio helper ───────────────────────────────────────────────────────────

  const play = useCallback((question) => {
    if (audioRef.current && question) {
      audioRef.current.playInterval(question.rootHz, question.intervalHz)
    }
  }, [])

  // ── internal: compute next state after advancing to next question ──────────

  /**
   * Returns the next state slice after recording `newResult` and moving on.
   * If this was the last question it fires onSessionComplete and returns phase:'complete'.
   * Otherwise it returns phase:'answering' for the next question.
   */
  function computeAdvance(prev, newResults) {
    const { questions } = prev
    const nextIndex = prev.currentIndex + 1

    if (nextIndex >= questions.length) {
      // Session over — fire callback after render (microtask is fine here)
      const score = newResults.filter(r => r.correct).length
      Promise.resolve().then(() => {
        onDoneRef.current?.({
          questions,
          results:           newResults,
          score,
          total:             newResults.length,
          intervalBreakdown: buildBreakdown(newResults),
        })
      })

      return {
        ...prev,
        currentIndex:   nextIndex,
        phase:          'complete',
        sessionResults: newResults,
        selectedAnswer: null,
        isCorrect:      null,
        retryUsed:      false,
      }
    }

    // Play the next question right after setState; use a microtask so the
    // state has settled in React before audio fires.
    const nextQuestion = questions[nextIndex]
    Promise.resolve().then(() => play(nextQuestion))

    return {
      ...prev,
      currentIndex:   nextIndex,
      phase:          'answering',
      sessionResults: newResults,
      selectedAnswer: null,
      isCorrect:      null,
      retryUsed:      false,
    }
  }

  // ── public API ─────────────────────────────────────────────────────────────

  const startSession = useCallback(() => {
    const hasStats = Array.isArray(intervalStats) && intervalStats.length > 0
    const questions = hasStats
      ? generateAdaptiveSession(intervalIds, keys, sessionLength, intervalStats)
      : generateSession(intervalIds, keys, sessionLength)
    setState({
      ...INITIAL_STATE,
      questions,
      phase: 'answering',
    })
    play(questions[0])
  }, [intervalIds, keys, sessionLength, intervalStats, play])

  const playCurrentQuestion = useCallback(() => {
    setState(prev => {
      play(prev.questions[prev.currentIndex])
      return prev
    })
  }, [play])

  const submitAnswer = useCallback((answeredIntervalId) => {
    setState(prev => {
      const { questions, currentIndex, retryUsed, sessionResults } = prev
      const currentQuestion = questions[currentIndex]
      if (!currentQuestion) return prev

      const correct = answeredIntervalId === currentQuestion.intervalId

      // ── correct ────────────────────────────────────────────────────────────
      if (correct) {
        const newResults = [
          ...sessionResults,
          { intervalId: currentQuestion.intervalId, correct: true, usedRetry: retryUsed },
        ]
        return computeAdvance(prev, newResults)
      }

      // ── wrong, first attempt ───────────────────────────────────────────────
      if (!retryUsed) {
        Promise.resolve().then(() => play(currentQuestion))
        return {
          ...prev,
          selectedAnswer: answeredIntervalId,
          isCorrect:      false,
          phase:          'feedback',
          retryUsed:      true,
        }
      }

      // ── wrong, retry already used ─────────────────────────────────────────
      const newResults = [
        ...sessionResults,
        { intervalId: currentQuestion.intervalId, correct: false, usedRetry: true },
      ]
      return computeAdvance(prev, newResults)
    })
  }, [play]) // eslint-disable-line react-hooks/exhaustive-deps

  const advanceToNext = useCallback(() => {
    setState(prev => computeAdvance(prev, prev.sessionResults))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentQuestion = useCallback(() => {
    return state.questions[state.currentIndex] ?? null
  }, [state.questions, state.currentIndex])

  const getAnswerChoices = useCallback(() => {
    return intervalIds
      .map(id => getIntervalById(id))
      .filter(Boolean)
      .sort((a, b) => a.semitones - b.semitones)
  }, [intervalIds])

  // ── expose ────────────────────────────────────────────────────────────────

  return {
    questions:      state.questions,
    currentIndex:   state.currentIndex,
    phase:          state.phase,
    selectedAnswer: state.selectedAnswer,
    isCorrect:      state.isCorrect,
    retryUsed:      state.retryUsed,
    sessionResults: state.sessionResults,

    startSession,
    playCurrentQuestion,
    submitAnswer,
    advanceToNext,
    getCurrentQuestion,
    getAnswerChoices,
  }
}

export default useQuizSession
