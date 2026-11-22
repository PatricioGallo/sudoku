// Partida en curso, guardada en este dispositivo para poder retomarla.
const key = (userId) => `sudoku.inprogress.${userId}`

export function loadProgress(userId) {
  try {
    const g = JSON.parse(localStorage.getItem(key(userId)))
    return g && !g.won && Array.isArray(g.puzzle) ? g : null
  } catch {
    return null
  }
}

export function saveProgress(userId, game) {
  try {
    if (!game || game.won) localStorage.removeItem(key(userId))
    else localStorage.setItem(key(userId), JSON.stringify(game))
  } catch {
    /* sin storage: no se puede retomar después de cerrar la app */
  }
}

export function progressPercent(game) {
  const empty = game.puzzle.filter((v) => v === 0).length
  if (!empty || !game.values) return 0
  const done = game.values.filter((v, i) => game.puzzle[i] === 0 && v === game.solution[i]).length
  return Math.round((done / empty) * 100)
}
