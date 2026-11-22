// Niveles y rangos son cosas distintas:
// - Niveles (dificultad): se desbloquean ganando partidas del nivel anterior.
// - Rangos: se suben con puntos; cada partida ganada suma según el nivel,
//   el tiempo, los errores y las pistas. Los puntos para cada rango se multiplican por 5.
import { useEffect, useState } from 'react'
import * as api from '@api'
import { LEVELS } from './sudoku/generator.js'
import { cachedStats, cacheStats, pendingResults } from './offline.js'

export const LEVEL_ORDER = Object.keys(LEVELS)

// ---------- Niveles ----------
// Partidas ganadas en el nivel anterior para abrir cada nivel
export const UNLOCK_WINS = { facil: 2, medio: 5, dificil: 7, experto: 10, maestro: 12 }

const prevOf = (level) => LEVEL_ORDER[LEVEL_ORDER.indexOf(level) - 1]

/** Progreso para abrir `level`: ganadas en el anterior / necesarias. */
export function unlockProgress(level, stats) {
  const need = UNLOCK_WINS[level] ?? 0
  const done = Math.min(stats.levels[prevOf(level)]?.wins ?? 0, need)
  return { done, need, from: prevOf(level) }
}

/** El primero siempre está abierto; los demás, con las ganadas del anterior
 *  (o si ya lo ganaste alguna vez, para no quitarle a nadie lo que jugó). */
export function isUnlocked(level, stats) {
  if (!UNLOCK_WINS[level]) return true
  if ((stats.levels[level]?.wins ?? 0) > 0) return true
  const { done, need } = unlockProgress(level, stats)
  return done >= need
}

// ---------- Puntos ----------
// Puntos base (se duplican por nivel) y tiempo objetivo en segundos
export const SCORING = {
  principiante: { base: 10, par: 5 * 60 },
  facil: { base: 20, par: 8 * 60 },
  medio: { base: 40, par: 12 * 60 },
  dificil: { base: 80, par: 18 * 60 },
  experto: { base: 160, par: 25 * 60 },
  maestro: { base: 320, par: 35 * 60 },
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

/** Puntos de una partida ganada, con el detalle del cálculo. */
export function pointsFor({ level, seconds, errors = 0, hints_used = 0 }) {
  const { base, par } = SCORING[level] ?? SCORING.principiante
  const speed = clamp(par / Math.max(1, seconds), 0.5, 2)
  const accuracy = clamp(1 - 0.1 * errors - 0.2 * hints_used, 0.2, 1)
  return { points: Math.round(base * speed * accuracy), base, speed, accuracy }
}

// ---------- Rangos ----------
export const RANKS = [
  { id: 'novato', label: 'Novato', points: 0 },
  { id: 'aprendiz', label: 'Aprendiz', points: 100 },
  { id: 'avanzado', label: 'Avanzado', points: 500 },
  { id: 'maestro', label: 'Maestro', points: 2500 },
  { id: 'gran-maestro', label: 'Gran maestro', points: 12500 },
  { id: 'leyenda', label: 'Leyenda', points: 62500 },
]

export const totalPoints = (stats) => stats.points ?? 0

/** Rango correspondiente a una cantidad de puntos. */
export function rankForPoints(points) {
  let rank = RANKS[0]
  for (const r of RANKS) if (points >= r.points) rank = r
  return rank
}
export const rankOf = (stats) => rankForPoints(totalPoints(stats))

/** Próximo rango y progreso desde el actual, o null si ya es el más alto. */
export function nextRank(stats) {
  const have = totalPoints(stats)
  const current = rankOf(stats)
  const next = RANKS[RANKS.indexOf(current) + 1]
  if (!next) return null
  return {
    next,
    have,
    missing: next.points - have,
    ratio: (have - current.points) / (next.points - current.points),
  }
}

export const formatPoints = (n) => Number(n).toLocaleString('es-AR')

// ---------- Estadísticas ----------
/** Agrupa las partidas por nivel (mejor tiempo, ganadas, puntos) y suma el total. */
export function buildStats(results) {
  const stats = { levels: {}, points: 0 }
  for (const r of results) {
    const p = pointsFor(r).points
    const s = (stats.levels[r.level] ??= { best: r.seconds, wins: 0, points: 0 })
    s.wins++
    s.points += p
    if (r.seconds < s.best) s.best = r.seconds
    stats.points += p
  }
  return stats
}

/** Estadísticas del jugador: servidor (o caché sin conexión) + partidas pendientes de subir. */
export function useStats(userId, version = 0) {
  const [results, setResults] = useState(() => {
    const c = cachedStats(userId)
    return Array.isArray(c) ? c : []
  })
  useEffect(() => {
    if (!userId) return
    let alive = true
    api
      .myResults(userId)
      .then((rows) => {
        if (!alive) return
        setResults(rows)
        cacheStats(userId, rows)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [userId, version])
  const pending = userId
    ? pendingResults(userId).map((r) => ({
        level: r.level,
        seconds: r.seconds,
        errors: r.errors,
        hints_used: r.hintsUsed ?? r.hints_used ?? 0,
      }))
    : []
  return buildStats([...results, ...pending])
}
