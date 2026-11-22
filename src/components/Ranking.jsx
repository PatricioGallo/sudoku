import { useState } from 'react'
import { LEVELS } from '../sudoku/generator.js'
import { getRanking, formatTime } from '../ranking.js'

export default function Ranking({ user, initialLevel = 'principiante', highlight }) {
  const [level, setLevel] = useState(initialLevel)
  const rows = getRanking(user, level)

  return (
    <section className="ranking">
      <h3>Tus mejores tiempos</h3>
      <div className="tabs" role="tablist">
        {Object.entries(LEVELS).map(([key, { label }]) => (
          <button
            key={key}
            role="tab"
            aria-selected={key === level}
            className={`tab tab-${key}`}
            onClick={() => setLevel(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="empty">Terminá una partida en {LEVELS[level].label.toLowerCase()} para estrenar el ranking.</p>
      ) : (
        <ol className="podium">
          {rows.map((r, i) => (
            <li
              key={r.date}
              className={level === initialLevel && highlight === i + 1 ? 'row is-new' : 'row'}
            >
              <span className={`pos pos-${i + 1}`}>{i + 1}</span>
              <span className="time">{formatTime(r.seconds)}</span>
              <span className="detail">
                {r.errors} {r.errors === 1 ? 'error' : 'errores'}, {r.hintsUsed}{' '}
                {r.hintsUsed === 1 ? 'pista' : 'pistas'}
              </span>
              <span className="date">
                {new Date(r.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
