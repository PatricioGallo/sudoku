import { useCallback, useEffect, useRef, useState } from 'react'
import { LEVELS } from '../sudoku/generator.js'
import { saveResult, formatTime } from '../ranking.js'
import Ranking from './Ranking.jsx'

const MAX_HINTS = 3

export default function Game({ game, user, onNewGame, onExit }) {
  const { puzzle, solution, level } = game
  const [values, setValues] = useState(() => puzzle.slice())
  const [hinted, setHinted] = useState(() => new Set())
  const [selected, setSelected] = useState(null)
  const [errors, setErrors] = useState(0)
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS)
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [won, setWon] = useState(false)
  const [position, setPosition] = useState(null)
  const saved = useRef(false)

  const isGiven = (i) => puzzle[i] !== 0
  const isCorrect = (i) => values[i] === solution[i]

  // Cronómetro: corre mientras no esté en pausa ni terminada
  useEffect(() => {
    if (paused || won) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [paused, won])

  // Pausa automática si se cambia de pestaña
  useEffect(() => {
    const onHide = () => document.hidden && setPaused(true)
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  // Detectar partida ganada y guardar en el ranking
  useEffect(() => {
    if (won || !values.every((v, i) => v === solution[i])) return
    setWon(true)
    setSelected(null)
    if (!saved.current) {
      saved.current = true
      setPosition(saveResult(user, level, { seconds, errors, hintsUsed: MAX_HINTS - hintsLeft }))
    }
  }, [values]) // eslint-disable-line react-hooks/exhaustive-deps

  const place = useCallback(
    (digit) => {
      if (selected === null || won || paused) return
      if (isGiven(selected) || isCorrect(selected)) return
      setValues((v) => {
        const next = v.slice()
        next[selected] = digit
        return next
      })
      if (digit !== 0 && digit !== solution[selected]) setErrors((e) => e + 1)
    },
    [selected, won, paused, values] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const giveHint = () => {
    if (hintsLeft === 0 || won || paused) return
    // Usa la celda seleccionada si está vacía o mal; si no, una al azar
    let target = selected
    if (target === null || isGiven(target) || isCorrect(target)) {
      const open = values.map((v, i) => (v !== solution[i] ? i : -1)).filter((i) => i >= 0)
      if (open.length === 0) return
      target = open[Math.floor(Math.random() * open.length)]
    }
    setValues((v) => {
      const next = v.slice()
      next[target] = solution[target]
      return next
    })
    setHinted((h) => new Set(h).add(target))
    setHintsLeft((n) => n - 1)
    setSelected(target)
  }

  // Teclado: números, borrar y flechas
  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '1' && e.key <= '9') place(Number(e.key))
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') place(0)
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        setSelected((s) => {
          const cur = s ?? 40
          const r = Math.floor(cur / 9), c = cur % 9
          if (e.key === 'ArrowUp') return ((r + 8) % 9) * 9 + c
          if (e.key === 'ArrowDown') return ((r + 1) % 9) * 9 + c
          if (e.key === 'ArrowLeft') return r * 9 + ((c + 8) % 9)
          return r * 9 + ((c + 1) % 9)
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [place])

  // Cuántas veces está bien colocado cada número (para apagar los completos)
  const placedCount = Array(10).fill(0)
  values.forEach((v, i) => v === solution[i] && placedCount[v]++)

  const sel = selected
  const selValue = sel !== null ? values[sel] : 0
  const related = (i) => {
    if (sel === null) return false
    const r1 = Math.floor(i / 9), c1 = i % 9, r2 = Math.floor(sel / 9), c2 = sel % 9
    return (
      r1 === r2 ||
      c1 === c2 ||
      (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3))
    )
  }

  return (
    <main className="game">
      <div className="stats">
        <span className="badge">{LEVELS[level].label}</span>
        <span>⏱ {formatTime(seconds)}</span>
        <span className={errors ? 'errors' : ''}>Errores: {errors}</span>
        <button className="link" onClick={() => setPaused((p) => !p)} disabled={won}>
          {paused ? 'Seguir' : 'Pausa'}
        </button>
      </div>

      <div className="board-wrap">
        <div className={`board ${paused ? 'blurred' : ''}`}>
          {values.map((v, i) => {
            const r = Math.floor(i / 9), c = i % 9
            const classes = ['cell']
            if (isGiven(i)) classes.push('given')
            else if (v && v !== solution[i]) classes.push('wrong')
            else if (hinted.has(i)) classes.push('hinted')
            else if (v) classes.push('filled')
            if (i === sel) classes.push('selected')
            else if (v && v === selValue) classes.push('same')
            else if (related(i)) classes.push('related')
            if (c === 2 || c === 5) classes.push('br')
            if (r === 2 || r === 5) classes.push('bb')
            return (
              <button key={i} className={classes.join(' ')} onClick={() => setSelected(i)}>
                {v || ''}
              </button>
            )
          })}
        </div>
        {paused && (
          <button className="overlay" onClick={() => setPaused(false)}>
            En pausa — tocá para seguir
          </button>
        )}
      </div>

      <div className="numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} onClick={() => place(d)} disabled={placedCount[d] >= 9}>
            {d}
          </button>
        ))}
      </div>

      <div className="actions">
        <button onClick={() => place(0)}>Borrar</button>
        <button onClick={giveHint} disabled={hintsLeft === 0 || won}>
          Pista ({hintsLeft})
        </button>
        <button onClick={onExit}>Menú</button>
      </div>

      {won && (
        <div className="modal">
          <div className="card">
            <h2>¡Resuelto! 🎉</h2>
            <p>
              {LEVELS[level].label} en <strong>{formatTime(seconds)}</strong> · {errors} errores ·{' '}
              {MAX_HINTS - hintsLeft} pistas
            </p>
            {position > 0 && <p className="muted">Puesto #{position} en tu ranking de este nivel</p>}
            <Ranking user={user} initialLevel={level} highlight={position} />
            <div className="actions">
              <button className="primary" onClick={onNewGame}>
                Otra partida
              </button>
              <button onClick={onExit}>Menú</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
