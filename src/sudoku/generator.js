// Generador y solver de sudoku.
// El tablero es un array de 81 números (0 = celda vacía).

export const LEVELS = {
  principiante: { label: 'Principiante', clues: 46 },
  facil: { label: 'Fácil', clues: 40 },
  medio: { label: 'Medio', clues: 33 },
  dificil: { label: 'Difícil', clues: 27 },
  experto: { label: 'Experto', clues: 23 },
  // El más alto: además de tener menos números, no se resuelve solo con lógica básica
  maestro: { label: 'Maestro', clues: 22, advanced: true },
}

const PEERS = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9
  const br = r - (r % 3), bc = c - (c % 3)
  const set = new Set()
  for (let k = 0; k < 9; k++) {
    set.add(r * 9 + k)
    set.add(k * 9 + c)
    set.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3))
  }
  set.delete(i)
  return [...set]
})
const UNITS = []
for (let k = 0; k < 9; k++) {
  UNITS.push([...Array(9)].map((_, j) => k * 9 + j))
  UNITS.push([...Array(9)].map((_, j) => j * 9 + k))
  const br = Math.floor(k / 3) * 3, bc = (k % 3) * 3
  UNITS.push([...Array(9)].map((_, j) => (br + Math.floor(j / 3)) * 9 + bc + (j % 3)))
}

/**
 * ¿Se resuelve solo con lógica básica? (casilla con un único candidato, o
 * número con un único lugar posible en su fila, columna o caja)
 */
export function solvableWithSingles(puzzle) {
  const g = puzzle.slice()
  const cand = (i) => {
    let m = 0x3fe
    for (const p of PEERS[i]) if (g[p]) m &= ~(1 << g[p])
    return m
  }
  let progress = true
  while (progress) {
    progress = false
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue
      const m = cand(i)
      if (m && !(m & (m - 1))) {
        g[i] = Math.log2(m)
        progress = true
      }
    }
    for (const u of UNITS) {
      for (let d = 1; d <= 9; d++) {
        if (u.some((i) => g[i] === d)) continue
        const spots = u.filter((i) => !g[i] && (cand(i) >> d) & 1)
        if (spots.length === 1) {
          g[spots[0]] = d
          progress = true
        }
      }
    }
  }
  return g.every(Boolean)
}

const boxOf = (i) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function bitCount(m) {
  let c = 0
  while (m) {
    m &= m - 1
    c++
  }
  return c
}

/**
 * Cuenta soluciones hasta `limit` (backtracking con la celda de menos candidatos).
 * Devuelve { count, solution } donde solution es la primera encontrada.
 */
export function solve(grid, limit = 1, randomize = false) {
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)
  const g = grid.slice()

  for (let i = 0; i < 81; i++) {
    const v = g[i]
    if (!v) continue
    const bit = 1 << v
    const r = Math.floor(i / 9), c = i % 9, b = boxOf(i)
    if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return { count: 0, solution: null }
    rows[r] |= bit
    cols[c] |= bit
    boxes[b] |= bit
  }

  let count = 0
  let solution = null

  function rec() {
    let best = -1
    let bestMask = 0
    let bestCount = 10
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue
      const mask = ~(rows[Math.floor(i / 9)] | cols[i % 9] | boxes[boxOf(i)]) & 0x3fe
      const n = bitCount(mask)
      if (n === 0) return false
      if (n < bestCount) {
        best = i
        bestMask = mask
        bestCount = n
        if (n === 1) break
      }
    }
    if (best === -1) {
      count++
      if (!solution) solution = g.slice()
      return count >= limit
    }
    const digits = []
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d)
    if (randomize) shuffle(digits)

    const r = Math.floor(best / 9), c = best % 9, b = boxOf(best)
    for (const d of digits) {
      const bit = 1 << d
      g[best] = d
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      if (rec()) return true
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
      g[best] = 0
    }
    return false
  }

  rec()
  return { count, solution }
}

/**
 * Genera una partida con solución única.
 * Saca números de un tablero completo; si al sacar uno aparece una segunda
 * solución, lo vuelve a poner.
 */
export function generate(level = 'facil') {
  const cfg = LEVELS[level] ?? LEVELS.facil
  const target = cfg.clues
  // Con pocos números iniciales no todos los tableros llegan a la meta:
  // se prueba con varios y se queda el mejor.
  const score = (g) => g.clues - (g.advanced ? 0.5 : 0)
  let best = null
  for (let attempt = 0; attempt < (cfg.advanced ? 1500 : 60); attempt++) {
    const g = carve(target)
    if (cfg.advanced) g.advanced = g.clues <= target + 1 && !solvableWithSingles(g.puzzle)
    if (!best || score(g) < score(best)) best = g
    if (best.clues <= target && (!cfg.advanced || best.advanced)) break
  }
  return { puzzle: best.puzzle, solution: best.solution, level }
}

function carve(target) {
  const { solution } = solve(new Array(81).fill(0), 1, true)
  const puzzle = solution.slice()
  let clues = 81

  for (const i of shuffle([...Array(81).keys()])) {
    if (clues <= target) break
    const backup = puzzle[i]
    puzzle[i] = 0
    if (solve(puzzle, 2).count !== 1) puzzle[i] = backup
    else clues--
  }

  return { puzzle, solution, clues }
}
