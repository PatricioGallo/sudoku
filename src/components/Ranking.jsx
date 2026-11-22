import { useState } from 'react'
import { LEVELS } from '../sudoku/generator.js'
import { getRanking, formatTime } from '../ranking.js'

export default function Ranking({ user, initialLevel = 'principiante', highlight }) {
  const [level, setLevel] = useState(initialLevel)
  const rows = getRanking(user, level)

  return (
    <section className="card ranking">
      <h2>Ranking de {user}</h2>
      <div className="tabs">
        {Object.entries(LEVELS).map(([key, { label }]) => (
          <button key={key} className={key === level ? 'tab active' : 'tab'} onClick={() => setLevel(key)}>
            {label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="muted">Todavía no hay partidas terminadas en este nivel.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tiempo</th>
              <th>Errores</th>
              <th>Pistas</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.date} className={level === initialLevel && highlight === i + 1 ? 'highlight' : ''}>
                <td>{i + 1}</td>
                <td>{formatTime(r.seconds)}</td>
                <td>{r.errors}</td>
                <td>{r.hintsUsed}</td>
                <td>{new Date(r.date).toLocaleDateString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
