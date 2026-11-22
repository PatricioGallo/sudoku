// Rangos y desbloqueos: cada nivel es un rango y se desbloquea ganando
// partidas del anterior. Cuanto más alto, más partidas y más exigencia.
import { useEffect, useState } from 'react'
import * as api from '@api'
import { LEVELS } from './sudoku/generator.js'
import { cachedStats, cacheStats, pendingResults } from './offline.js'

export const LEVEL_ORDER = Object.keys(LEVELS)

// Para desbloquear cada nivel: partidas ganadas en el nivel anterior que cumplan las condiciones
export const UNLOCK = {
  facil: { wins: 3 },
  medio: { wins: 5 },
  dificil: { wins: 7, maxErrors: 3 },
  experto: { wins: 10, noHints: true },
  maestro: { wins: 12, noHints: true, maxErrors: 1 },
}

const prevOf = (level) => LEVEL_ORDER[LEVEL_ORDER.indexOf(level) - 1]

const qualifies = (r, rule) =>
  (rule.maxErrors === undefined || r.errors <= rule.maxErrors) && (!rule.noHints || r.hints_used === 0)

/** Texto de la condición, por ejemplo "Ganá 7 en Avanzado con 3 errores o menos". */
export function describeUnlock(level) {
  const rule = UNLOCK[level]
  if (!rule) return ''
  const extra = []
  if (rule.noHints) extra.push('sin pistas')
  if (rule.maxErrors === 0) extra.push('sin errores')
  else if (rule.maxErrors === 1) extra.push('con 1 error como máximo')
  else if (rule.maxErrors !== undefined) extra.push(`con ${rule.maxErrors} errores o menos`)
  const tail = extra.length ? ` ${extra.join(' y ')}` : ''
  return `Ganá ${rule.wins} en ${LEVELS[prevOf(level)].label}${tail}`
}

/** Agrupa las partidas por nivel: mejor tiempo, ganadas y la lista. */
export function buildStats(results) {
  const stats = {}
  for (const r of results) {
    const s = (stats[r.level] ??= { best: r.seconds, wins: 0, results: [] })
    s.wins++
    s.results.push(r)
    if (r.seconds < s.best) s.best = r.seconds
  }
  return stats
}

/** Partidas que cuentan para desbloquear `level`. */
export function unlockProgress(level, stats) {
  const rule = UNLOCK[level]
  if (!rule) return { done: 0, need: 0 }
  const done = (stats[prevOf(level)]?.results ?? []).filter((r) => qualifies(r, rule)).length
  return { done: Math.min(done, rule.wins), need: rule.wins }
}

/** El primero siempre está abierto; el resto, al cumplir la condición
 *  (o si ya lo ganaste alguna vez, para no quitarle a nadie lo que jugó). */
export function isUnlocked(level, stats) {
  if (!UNLOCK[level]) return true
  if ((stats[level]?.wins ?? 0) > 0) return true
  const { done, need } = unlockProgress(level, stats)
  return done >= need
}

/** Rango: el nivel más alto desbloqueado. */
export function rankOf(stats) {
  let rank = LEVEL_ORDER[0]
  for (const l of LEVEL_ORDER) if (isUnlocked(l, stats)) rank = l
  return rank
}

/** El próximo rango y cuánto falta, o null si ya está todo. */
export function nextUnlock(stats) {
  const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(rankOf(stats)) + 1]
  if (!next) return null
  return { next, ...unlockProgress(next, stats) }
}

/** Estadísticas del jugador: servidor (o caché sin conexión) + partidas pendientes de subir. */
export function useStats(userId, version = 0) {
  const [results, setResults] = useState(() => {
    const c = cachedStats(userId)
    return Array.isArray(c) ? c : []
  })
  useEffect(() => {
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
  const pending = pendingResults(userId).map((r) => ({
    level: r.level,
    seconds: r.seconds,
    errors: r.errors,
    hints_used: r.hintsUsed ?? r.hints_used ?? 0,
  }))
  return buildStats([...results, ...pending])
}
