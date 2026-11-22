import { useEffect, useState } from 'react'
import * as api from '@api'
import { displayName } from '../api/shared.js'
import { formatPoints, rankForPoints } from '../levels.js'
import { isNetworkError } from '../offline.js'
import Avatar from './Avatar.jsx'

const CACHE_KEY = 'sudoku.cache.points-ranking'
const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY))
  } catch {
    return null
  }
}

// Ranking de jugadores por puntos totales, con su rango
export default function PointsRanking({ profile, version = 0 }) {
  const [rows, setRows] = useState(readCache)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api
      .pointsRanking(20)
      .then((r) => {
        if (!alive) return
        setRows(r)
        setStale(false)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(r))
        } catch {
          /* sin storage */
        }
      })
      .catch((e) => {
        if (!alive) return
        if (readCache() && isNetworkError(e)) setStale(true)
        else setError(isNetworkError(e) ? 'Sin conexión. El ranking se carga cuando vuelva internet.' : e.message)
      })
    return () => {
      alive = false
    }
  }, [version])

  return (
    <section className="ranking points-ranking">
      <div className="ranking-head">
        <h3>Ranking de jugadores</h3>
        <span className="ranking-sub">por puntos</span>
      </div>
      {stale && <p className="stale">Sin conexión: mostrando lo último que se cargó.</p>}
      {error && !rows ? (
        <p className="empty">{error}</p>
      ) : !rows ? (
        <p className="empty">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="empty">Todavía nadie sumó puntos. Ganá una partida y estrená el ranking.</p>
      ) : (
        <ol className="podium">
          {rows.map((r, i) => {
            const rank = rankForPoints(Number(r.points))
            return (
              <li key={r.user_id} className={`row ${r.user_id === profile.id ? 'is-me' : ''}`}>
                <span className={`pos pos-${i + 1}`}>{i + 1}</span>
                <span className="who">
                  <Avatar profile={r} size={34} />
                  <span className="who-text">
                    <span className="who-name">{displayName(r)}</span>
                    <span className={`mini-rank rk-${rank.id}`}>{rank.label}</span>
                  </span>
                </span>
                <span className="pts">
                  {formatPoints(Number(r.points))}
                  <small> pts</small>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
