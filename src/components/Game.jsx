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

  const cellClass = (i) => {
    const v = values[i]
    const classes = ['cell']
    if (isGiven(i)) classes.push('given')
    else if (v && v !== solution[i]) classes.push('wrong')
    else if (hinted.has(i)) classes.push('hinted')
    else if (v) classes.push('filled')
    if (i === sel) classes.push('selected')
    else if (v && v === selValue) classes.push('same')
    else if (related(i)) classes.push('related')
    return classes.join(' ')
  }

  return (
    <main className={`game game-${level}`}>
      <div className="hud">
        <span className={`level-pill level-pill-${level}`}>{LEVELS[level].label}</span>
        <span className="clock" aria-label="Tiempo">
          {formatTime(seconds)}
        </span>
        <button
          className="btn-icon"
          onClick={() => setPaused((p) => !p)}
          disabled={won}
          aria-label={paused ? 'Seguir' : 'Pausar'}
        >
          {paused ? '▶' : '❚❚'}
        </button>
      </div>

      <div className="counters">
        <span className={errors ? 'counter counter-errors has' : 'counter counter-errors'}>
          <b>{errors}</b> {errors === 1 ? 'error' : 'errores'}
        </span>
        <span className="counter counter-hints" aria-label={`${hintsLeft} pistas disponibles`}>
          {Array.from({ length: MAX_HINTS }, (_, n) => (
            <i key={n} className={n < hintsLeft ? 'bulb on' : 'bulb'} />
          ))}
          <span>pistas</span>
        </span>
      </div>

      <div className="board-wrap">
        <div className={`board ${paused ? 'is-paused' : ''} ${won ? 'is-won' : ''}`}>
          {Array.from({ length: 9 }, (_, b) => (
            <div className="box" key={b}>
              {Array.from({ length: 9 }, (_, k) => {
                const i = (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3)
                const v = values[i]
                return (
                  <button
                    key={i}
                    className={cellClass(i)}
                    onClick={() => setSelected(i)}
                    aria-label={`Fila ${Math.floor(i / 9) + 1}, columna ${(i % 9) + 1}${v ? `: ${v}` : ''}`}
                  >
                    {v ? <span key={`${i}-${v}`}>{v}</span> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {paused && (
          <button className="pause-veil" onClick={() => setPaused(false)}>
            <span className="pause-title">En pausa</span>
            <span>Tocá para seguir</span>
          </button>
        )}
      </div>

      <div className="numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} onClick={() => place(d)} disabled={placedCount[d] >= 9}>
            <span className="num">{d}</span>
            <span className="left">{9 - placedCount[d] || ''}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <button className="tool" onClick={() => place(0)}>
          <span className="tool-icon" aria-hidden="true">⌫</span>
          Borrar
        </button>
        <button className="tool tool-hint" onClick={giveHint} disabled={hintsLeft === 0 || won}>
          <span className="tool-icon" aria-hidden="true">✦</span>
          Pista
          <span className="tool-badge">{hintsLeft}</span>
        </button>
        <button className="tool" onClick={onExit}>
          <span className="tool-icon" aria-hidden="true">☰</span>
          Menú
        </button>
      </div>

      {won && (
        <div className="win">
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 36 }, (_, n) => (
              <span
                key={n}
                style={{
                  '--x': `${(n * 37) % 100}%`,
                  '--d': `${(n % 9) * 0.12}s`,
                  '--r': `${((n * 53) % 60) - 30}deg`,
                  '--c': ['#FFC233', '#2BD9A0', '#FF5A6E', '#8FA8FF'][n % 4],
                }}
              >
                {(n % 9) + 1}
              </span>
            ))}
          </div>
          <div className="win-sheet">
            <p className="win-kicker">{LEVELS[level].label} resuelto</p>
            <p className="win-time">{formatTime(seconds)}</p>
            <p className="win-detail">
              {errors} {errors === 1 ? 'error' : 'errores'} y {MAX_HINTS - hintsLeft}{' '}
              {MAX_HINTS - hintsLeft === 1 ? 'pista usada' : 'pistas usadas'}
              {position === 1 ? '. ¡Nuevo récord!' : position > 0 ? `. Quedaste #${position} en tu ranking.` : '.'}
            </p>
            <Ranking user={user} initialLevel={level} highlight={position} />
            <div className="win-actions">
              <button className="btn btn-primary" onClick={onNewGame}>
                Jugar otra
              </button>
              <button className="btn btn-ghost" onClick={onExit}>
                Volver al menú
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
