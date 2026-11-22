import { LEVELS } from '../sudoku/generator.js'
import { formatTime } from '../format.js'
import Ranking from './Ranking.jsx'
import { progressPercent } from '../progress.js'
import { LEVEL_ORDER, describeUnlock, isUnlocked, rankOf, unlockProgress, useStats } from '../levels.js'

export default function Menu({ profile, current, onResume, onStart }) {
  const stats = useStats(profile.id)
  const rank = rankOf(stats)

  return (
    <main className="menu">
      <h2 className="greeting">
        Hola, {profile.first_name || profile.username}. ¿Qué nivel jugás hoy?
      </h2>
      <span className={`rank-badge rank-${rank} rank-inline`}>Rango {LEVELS[rank].label}</span>

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
          const prog = unlockProgress(key, stats)
          const best = stats[key]?.best
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
              {open ? (
                <span className="level-best">{best ? `Mejor: ${formatTime(best)}` : 'Sin récord'}</span>
              ) : (
                <span className="level-unlock">
                  <span>{describeUnlock(key)}</span>
                  <span className="unlock-bar" aria-label={`${prog.done} de ${prog.need}`}>
                    <i style={{ width: `${(prog.done / prog.need) * 100}%` }} />
                    <b>
                      {prog.done}/{prog.need}
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
