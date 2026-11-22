import { useEffect, useState } from 'react'
import * as api from '@api'
import { LEVELS } from '../sudoku/generator.js'
import { formatTime } from '../format.js'
import Ranking from './Ranking.jsx'
import { progressPercent } from '../progress.js'

export default function Menu({ profile, current, onResume, onStart }) {
  const [bests, setBests] = useState({})

  useEffect(() => {
    api.myBests(profile.id).then(setBests).catch(() => {})
  }, [profile.id])

  return (
    <main className="menu">
      <h2 className="greeting">
        Hola, {profile.first_name || profile.username}. ¿Qué nivel jugás hoy?
      </h2>

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
          <span className="resume-bar" aria-hidden="true">
            <i style={{ width: `${progressPercent(current)}%` }} />
          </span>
        </button>
      )}

      {current && <h3 className="section-label">O empezá una nueva</h3>}

      <div className="levels">
        {Object.entries(LEVELS).map(([key, { label, clues }], idx) => (
          <button key={key} className={`level level-${key}`} onClick={() => onStart(key)}>
            <span className="level-meter" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <i key={n} className={n <= idx ? 'on' : ''} />
              ))}
            </span>
            <span className="level-name">{label}</span>
            <span className="level-meta">{clues} números de arranque</span>
            <span className="level-best">{bests[key] ? `Mejor: ${formatTime(bests[key])}` : 'Sin récord'}</span>
          </button>
        ))}
      </div>

      <Ranking profile={profile} />
    </main>
  )
}
