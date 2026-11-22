// Verifica que cada partida generada tenga exactamente una solución.
import { generate, solve, solvableWithSingles, LEVELS } from '../src/sudoku/generator.js'

const PER_LEVEL = 20
let maxMs = 0
let ok = true

for (const level of Object.keys(LEVELS)) {
  const t0 = performance.now()
  const clueCounts = []
  for (let n = 0; n < PER_LEVEL; n++) {
    const t = performance.now()
    const { puzzle, solution } = generate(level)
    maxMs = Math.max(maxMs, performance.now() - t)
    if (LEVELS[level].advanced && solvableWithSingles(puzzle)) {
      ok = false
      console.error(`FALLA en ${level}: se resuelve solo con lógica básica`)
    }
    const { count, solution: solved } = solve(puzzle, 2)
    const clues = puzzle.filter(Boolean).length
    clueCounts.push(clues)
    if (count !== 1 || solved.join('') !== solution.join('')) {
      ok = false
      console.error(`FALLA en ${level}: ${count} soluciones`)
    }
  }
  const ms = ((performance.now() - t0) / PER_LEVEL).toFixed(1)
  console.log(
    `${level.padEnd(13)} pistas ${Math.min(...clueCounts)}-${Math.max(...clueCounts)}  ~${ms} ms por partida  OK`
  )
}

console.log(`Partida más lenta: ${maxMs.toFixed(0)} ms`)
process.exit(ok ? 0 : 1)
