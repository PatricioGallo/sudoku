// Juego sin conexión: perfil en caché y cola de partidas por subir.
import * as api from '@api'

const read = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback
  } catch {
    return fallback
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* sin storage */
  }
}

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
export const isNetworkError = (e) => isOffline() || /conexión|fetch|network|load failed/i.test(e?.message || '')

// ---------- Perfil ----------
const PROFILE_KEY = 'sudoku.profile'
export const cachedProfile = () => read(PROFILE_KEY, null)
export const cacheProfile = (p) => (p ? write(PROFILE_KEY, p) : localStorage.removeItem(PROFILE_KEY))

// ---------- Partidas pendientes ----------
const queueKey = (userId) => `sudoku.pending.${userId}`
export const pendingResults = (userId) => read(queueKey(userId), [])
const setPending = (userId, list) => write(queueKey(userId), list)

/** Guarda el resultado; si no hay conexión, lo deja en cola para subirlo después. */
export async function submitResult(userId, level, result) {
  const item = { ...result, level, created_at: new Date().toISOString(), localId: crypto.randomUUID() }
  if (!isOffline()) {
    try {
      return await api.saveResult(userId, level, item)
    } catch (e) {
      if (!isNetworkError(e)) throw e
    }
  }
  setPending(userId, [...pendingResults(userId), item])
  return { queued: true }
}

let flushing = null
/** Sube las partidas en cola. Devuelve cuántas subió. */
export function flushPending(userId) {
  if (!userId || isOffline()) return Promise.resolve(0)
  flushing ??= (async () => {
    let uploaded = 0
    try {
      for (const item of pendingResults(userId)) {
        try {
          await api.saveResult(userId, item.level, item)
        } catch (e) {
          if (isNetworkError(e)) break // se reintenta cuando vuelva la conexión
          // un resultado inválido no tiene que trabar la cola
        }
        setPending(
          userId,
          pendingResults(userId).filter((x) => x.localId !== item.localId)
        )
        uploaded++
      }
    } finally {
      flushing = null
    }
    return uploaded
  })()
  return flushing
}

// ---------- Rankings en caché ----------
const rankingKey = (scope, level, userId) => `sudoku.cache.ranking.${scope}.${level}.${scope === 'mine' ? userId : 'all'}`
export const cachedRanking = (scope, level, userId) => read(rankingKey(scope, level, userId), null)
export const cacheRanking = (scope, level, userId, rows) => write(rankingKey(scope, level, userId), rows)
export const cachedBests = (userId) => read(`sudoku.cache.bests.${userId}`, {})
export const cacheBests = (userId, b) => write(`sudoku.cache.bests.${userId}`, b)
