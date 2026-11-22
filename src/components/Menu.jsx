import { useEffect, useState } from 'react'
import * as api from '@api'
import { LEVELS } from '../sudoku/generator.js'
import { formatTime } from '../format.js'
import Ranking from './Ranking.jsx'

export default function Menu({ profile, onStart }) {
  const [bests, setBests] = useState({})

  useEffect(() => {
    api.myBests(profile.id).then(setBests).catch(() => {})
  }, [profile.id])

  return (
    <main className="menu">
      <h2 className="greeting">
        Hola, {profile.first_name || profile.username}. ¿Qué nivel jugás hoy?
      </h2>

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
