import { LEVELS } from '../sudoku/generator.js'
import { formatTime } from '../format.js'
import Ranking from './Ranking.jsx'
import { progressPercent } from '../progress.js'
import { LEVEL_ORDER, RANK_POINTS, SCORING, formatPoints, isUnlocked, rankOf, totalPoints } from '../levels.js'

export default function Menu({ profile, stats, current, onResume, onStart }) {
  const rank = rankOf(stats)
  const points = totalPoints(stats)

  return (
    <main className="menu">
      <h2 className="greeting">
        Hola, {profile.first_name || profile.username}. ¿Qué nivel jugás hoy?
      </h2>
      <span className={`rank-badge rank-${rank} rank-inline`}>
        Rango {LEVELS[rank].label}, {formatPoints(points)} pts
      </span>

      {current && (
        <button className={`resume resume-${current.level}`} onClick={onResume}>
          <span className="resume-text">
            <span className="resume-title">Seguir jugando</span>
            <span className="resume-meta">
              {LEVELS[current.level].label}, {formatTime(current.seconds ?? 0)} jugados
            </span>
          </span>
          <span className="resume-progress" style={{ '--p': `${progressPercent(current)}%` }}>
            <b>{progressPercent(current)}%</b>
          </span>
        </button>
      )}

      {current && <h3 className="section-label">O empezá una nueva</h3>}

      <div className="levels">
        {LEVEL_ORDER.map((key, idx) => {
          const { label, clues, advanced } = LEVELS[key]
          const open = isUnlocked(key, stats)
          const need = RANK_POINTS[key]
          const best = stats.levels[key]?.best
          return (
            <button
              key={key}
              className={`level level-${key} ${open ? '' : 'is-locked'}`}
              onClick={() => open && onStart(key)}
              aria-disabled={!open}
            >
              <span className="level-meter" aria-hidden="true">
                {LEVEL_ORDER.map((_, n) => (
                  <i key={n} className={n <= idx ? 'on' : ''} />
                ))}
                {!open && <span className="lock">🔒</span>}
              </span>
              <span className="level-name">{label}</span>
              <span className="level-meta">
                {clues} números de arranque{advanced ? ', requiere técnicas avanzadas' : ''}
              </span>
              <span className="level-meta">Vale {SCORING[key].base} pts base</span>
              {open ? (
                <span className="level-best">{best ? `Mejor: ${formatTime(best)}` : 'Sin récord'}</span>
              ) : (
                <span className="level-unlock">
                  <span>Se desbloquea con {formatPoints(need)} puntos</span>
                  <span className="unlock-bar" aria-label={`${points} de ${need} puntos`}>
                    <i style={{ width: `${Math.min(100, (points / need) * 100)}%` }} />
                    <b>
                      {formatPoints(points)}/{formatPoints(need)}
                    </b>
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Ranking profile={profile} />
    </main>
  )
}
