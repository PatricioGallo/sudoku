import { useEffect, useState } from 'react'
import * as api from '@api'
import { LEVELS } from '../sudoku/generator.js'
import { formatTime } from '../format.js'
import { displayName } from '../api/shared.js'
import Avatar from './Avatar.jsx'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export default function Ranking({ profile, initialLevel = 'principiante', initialScope = 'global', highlightId }) {
  const [scope, setScope] = useState(initialScope) // global | mine
  const [level, setLevel] = useState(initialLevel)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setRows(null)
    setError('')
    const load = scope === 'global' ? api.globalRanking(level) : api.myRanking(profile.id, level)
    load
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [scope, level, profile.id, highlightId])

  return (
    <section className="ranking">
      <div className="ranking-head">
        <h3>Mejores tiempos</h3>
        <div className="segmented small" role="tablist">
          <button role="tab" aria-selected={scope === 'global'} onClick={() => setScope('global')}>
            Global
          </button>
          <button role="tab" aria-selected={scope === 'mine'} onClick={() => setScope('mine')}>
            Míos
          </button>
        </div>
      </div>

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

      {error ? (
        <p className="empty">{error}</p>
      ) : rows === null ? (
        <p className="empty">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="empty">
          {scope === 'global'
            ? `Nadie terminó una partida en ${LEVELS[level].label.toLowerCase()} todavía. Podés ser el primero.`
            : `Terminá una partida en ${LEVELS[level].label.toLowerCase()} para estrenar tu ranking.`}
        </p>
      ) : (
        <ol className="podium">
          {rows.map((r, i) => {
            const isMe = scope === 'global' && r.user_id === profile.id
            const isNew = scope === 'mine' && r.id === highlightId
            return (
              <li key={`${scope}-${r.id ?? r.user_id}`} className={`row ${isMe ? 'is-me' : ''} ${isNew ? 'is-new' : ''}`}>
                <span className={`pos pos-${i + 1}`}>{i + 1}</span>
                {scope === 'global' ? (
                  <span className="who">
                    <Avatar profile={r} size={30} />
                    <span className="who-text">
                      <span className="who-name">{displayName(r)}</span>
                      <span className="detail">@{r.username}</span>
                    </span>
                  </span>
                ) : (
                  <span className="detail">
                    {plural(r.errors, 'error', 'errores')}, {plural(r.hints_used, 'pista', 'pistas')}
                    <br />
                    {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <span className="time">{formatTime(r.seconds)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
