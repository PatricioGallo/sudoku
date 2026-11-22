import { LEVELS } from '../sudoku/generator.js'
import { getRanking, formatTime } from '../ranking.js'
import Ranking from './Ranking.jsx'

export default function Menu({ user, onStart }) {
  return (
    <main className="menu">
      <h2 className="greeting">Hola, {user}. ¿Qué nivel jugás hoy?</h2>

      <div className="levels">
        {Object.entries(LEVELS).map(([key, { label, clues }], idx) => {
          const best = getRanking(user, key, 1)[0]
          return (
            <button key={key} className={`level level-${key}`} onClick={() => onStart(key)}>
              <span className="level-meter" aria-hidden="true">
                {[0, 1, 2, 3].map((n) => (
                  <i key={n} className={n <= idx ? 'on' : ''} />
                ))}
              </span>
              <span className="level-name">{label}</span>
              <span className="level-meta">{clues} números de arranque</span>
              <span className="level-best">{best ? `Mejor: ${formatTime(best.seconds)}` : 'Sin récord'}</span>
            </button>
          )
        })}
      </div>

      <Ranking user={user} />
    </main>
  )
}
