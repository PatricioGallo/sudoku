import { LEVELS } from '../sudoku/generator.js'
import Ranking from './Ranking.jsx'

export default function Menu({ user, onStart }) {
  return (
    <main className="menu">
      <section className="card">
        <h2>Nueva partida</h2>
        <div className="levels">
          {Object.entries(LEVELS).map(([key, { label }]) => (
            <button key={key} className={`level level-${key}`} onClick={() => onStart(key)}>
              {label}
            </button>
          ))}
        </div>
      </section>
      <Ranking user={user} />
    </main>
  )
}
