// Rangos por puntaje: cada partida ganada suma puntos según el nivel, el tiempo,
// los errores y las pistas. Los puntos para ascender se triplican en cada rango.
import { useEffect, useState } from 'react'
import * as api from '@api'
import { LEVELS } from './sudoku/generator.js'
import { cachedStats, cacheStats, pendingResults } from './offline.js'

export const LEVEL_ORDER = Object.keys(LEVELS)

// Puntos base (se duplican por nivel) y tiempo objetivo en segundos
export const SCORING = {
  principiante: { base: 10, par: 5 * 60 },
  facil: { base: 20, par: 8 * 60 },
  medio: { base: 40, par: 12 * 60 },
  dificil: { base: 80, par: 18 * 60 },
  experto: { base: 160, par: 25 * 60 },
  maestro: { base: 320, par: 35 * 60 },
}

// Puntos totales necesarios para cada rango (se triplican)
export const RANK_POINTS = {
  principiante: 0,
  facil: 50,
  medio: 200,
  dificil: 600,
  experto: 1800,
  maestro: 5400,
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

/** Puntos de una partida ganada, con el detalle del cálculo. */
export function pointsFor({ level, seconds, errors = 0, hints_used = 0 }) {
  const { base, par } = SCORING[level] ?? SCORING.principiante
  const speed = clamp(par / Math.max(1, seconds), 0.5, 2)
  const accuracy = clamp(1 - 0.1 * errors - 0.2 * hints_used, 0.2, 1)
  return { points: Math.round(base * speed * accuracy), base, speed, accuracy }
}

export const totalPoints = (stats) => stats.points ?? 0

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

export const isUnlocked = (level, stats) => totalPoints(stats) >= (RANK_POINTS[level] ?? 0)

/** Rango: el nivel más alto alcanzado con los puntos. */
export function rankOf(stats) {
  return rankForPoints(totalPoints(stats))
}
export function rankForPoints(points) {
  let rank = LEVEL_ORDER[0]
  for (const l of LEVEL_ORDER) if (points >= RANK_POINTS[l]) rank = l
  return rank
}

/** Próximo rango y progreso desde el rango actual, o null si ya es el más alto. */
export function nextUnlock(stats) {
  const have = totalPoints(stats)
  const rank = rankOf(stats)
  const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(rank) + 1]
  if (!next) return null
  const from = RANK_POINTS[rank]
  const need = RANK_POINTS[next]
  return { next, have, need, missing: need - have, ratio: (have - from) / (need - from) }
}

export const formatPoints = (n) => n.toLocaleString('es-AR')

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
