// Ranking de tiempos por usuario y nivel, guardado en el navegador (localStorage).

const KEY = 'sudoku.ranking.v1'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function saveResult(user, level, result) {
  const all = readAll()
  all[user] ??= {}
  all[user][level] ??= []
  const entry = { ...result, date: new Date().toISOString() }
  const list = all[user][level]
  list.push(entry)
  // más rápido primero; a igual tiempo, menos errores
  list.sort((a, b) => a.seconds - b.seconds || a.errors - b.errors)
  all[user][level] = list.slice(0, 50)
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* sin storage */
  }
  // posición (1-based) del resultado recién guardado; 0 si quedó afuera del top 50
  return all[user][level].indexOf(entry) + 1
}

export function getRanking(user, level, limit = 10) {
  return (readAll()[user]?.[level] || []).slice(0, limit)
}

export function formatTime(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
