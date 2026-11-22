import { useRef, useState } from 'react'
import * as api from '@api'
import Avatar from './Avatar.jsx'
import { cacheProfile } from '../offline.js'
import { LEVELS } from '../sudoku/generator.js'
import { LEVEL_ORDER, RANKS, formatPoints, isUnlocked, nextRank, rankOf, totalPoints, unlockProgress } from '../levels.js'
import { formatTime } from '../format.js'

export default function Profile({ profile, stats, onChange, onBack }) {
  const fileRef = useRef(null)
  const [names, setNames] = useState({ first_name: profile.first_name || '', last_name: profile.last_name || '' })
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' })
  const [status, setStatus] = useState({}) // { photo|names|password: {ok|error, text} }
  const [busy, setBusy] = useState('')
  const rank = rankOf(stats)
  const points = totalPoints(stats)
  const next = nextRank(stats)

  const run = async (key, fn, okText) => {
    setBusy(key)
    setStatus((s) => ({ ...s, [key]: null }))
    try {
      await fn()
      setStatus((s) => ({ ...s, [key]: { ok: true, text: okText } }))
    } catch (e) {
      setStatus((s) => ({ ...s, [key]: { ok: false, text: e.message } }))
    } finally {
      setBusy('')
    }
  }

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    run('photo', async () => onChange(await api.uploadAvatar(profile.id, file)), 'Foto actualizada.')
  }

  const saveNames = (e) => {
    e.preventDefault()
    run('names', async () => onChange(await api.updateProfile(profile.id, names)), 'Datos guardados.')
  }

  const savePassword = (e) => {
    e.preventDefault()
    if (pw.next !== pw.repeat) {
      setStatus((s) => ({ ...s, password: { ok: false, text: 'Las contraseñas nuevas no coinciden.' } }))
      return
    }
    run(
      'password',
      async () => {
        await api.changePassword(profile.username, pw.current, pw.next)
        setPw({ current: '', next: '', repeat: '' })
      },
      'Contraseña cambiada.'
    )
  }

  const Msg = ({ k }) =>
    status[k] ? (
      <p className={status[k].ok ? 'form-ok' : 'form-error'} role="status">
        {status[k].text}
      </p>
    ) : null

  const namesChanged =
    names.first_name !== (profile.first_name || '') || names.last_name !== (profile.last_name || '')

  return (
    <main className="profile">
      <button className="back" onClick={onBack}>
        ‹ Volver
      </button>

      <section className="profile-hero">
        <button
          className="photo-btn"
          onClick={() => fileRef.current?.click()}
          disabled={busy === 'photo'}
          aria-label="Cambiar foto de perfil"
        >
          <Avatar profile={profile} size={112} />
          <span className="photo-badge">{busy === 'photo' ? '…' : '📷'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        <h2>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username}</h2>
        <p className="handle">@{profile.username}</p>
        <span className={`rank-badge rk-${rank.id}`}>Rango {rank.label}</span>
        <Msg k="photo" />
      </section>

      <section className="panel">
        <h3>Tu rango</h3>
        <p className="points-total">
          <b>{formatPoints(points)}</b> puntos
        </p>
        {next ? (
          <>
            <span className="unlock-bar big" aria-hidden="true">
              <i style={{ width: `${Math.max(2, next.ratio * 100)}%` }} />
            </span>
            <p className="panel-note">
              Te faltan {formatPoints(next.missing)} puntos para {next.next.label}. Sumás más jugando niveles altos,
              rápido y sin errores ni pistas.
            </p>
          </>
        ) : (
          <p className="panel-note">Sos Leyenda, el rango más alto. Ahora, a sumar puntos bajando tus tiempos.</p>
        )}
        <ol className="ladder">
          {RANKS.map((r) => {
            const reached = points >= r.points
            return (
              <li key={r.id} className={`step rk-${r.id} ${reached ? 'is-open' : ''} ${r.id === rank.id ? 'is-rank' : ''}`}>
                <span className="step-dot" aria-hidden="true">{reached ? '' : '🔒'}</span>
                <span className="step-name">{r.label}</span>
                <span className="step-info">{r.points ? `${formatPoints(r.points)} pts` : 'Inicio'}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="panel">
        <h3>Tus niveles</h3>
        <ol className="ladder">
          {LEVEL_ORDER.map((key) => {
            const open = isUnlocked(key, stats)
            const st = stats.levels[key]
            const prog = unlockProgress(key, stats)
            return (
              <li key={key} className={`step step-${key} ${open ? 'is-open' : ''}`}>
                <span className="step-dot" aria-hidden="true">{open ? '' : '🔒'}</span>
                <span className="step-name">{LEVELS[key].label}</span>
                <span className="step-info">
                  {open
                    ? st
                      ? `${st.wins} ${st.wins === 1 ? 'ganada' : 'ganadas'}, mejor ${formatTime(st.best)}`
                      : 'Sin partidas'
                    : `${prog.done}/${prog.need} en ${LEVELS[prog.from].label}`}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <form className="panel" onSubmit={saveNames}>
        <h3>Tus datos</h3>
        <div className="field-row">
          <label className="field">
            <span>Nombre</span>
            <input
              value={names.first_name}
              onChange={(e) => setNames((n) => ({ ...n, first_name: e.target.value }))}
              autoComplete="given-name"
              maxLength={40}
            />
          </label>
          <label className="field">
            <span>Apellido</span>
            <input
              value={names.last_name}
              onChange={(e) => setNames((n) => ({ ...n, last_name: e.target.value }))}
              autoComplete="family-name"
              maxLength={40}
            />
          </label>
        </div>
        <Msg k="names" />
        <button className="btn btn-primary" disabled={!namesChanged || busy === 'names'}>
          {busy === 'names' ? 'Guardando…' : 'Guardar datos'}
        </button>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h3>Cambiar contraseña</h3>
        <input type="text" autoComplete="username" value={profile.username} readOnly hidden />
        <label className="field">
          <span>Contraseña actual</span>
          <input
            type="password"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          <span>Contraseña nueva</span>
          <input
            type="password"
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <label className="field">
          <span>Repetí la nueva</span>
          <input
            type="password"
            value={pw.repeat}
            onChange={(e) => setPw((p) => ({ ...p, repeat: e.target.value }))}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <Msg k="password" />
        <button className="btn btn-primary" disabled={busy === 'password'}>
          {busy === 'password' ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </form>

      <button
        className="btn btn-danger"
        onClick={() => {
          cacheProfile(null)
          api.signOut()
        }}
      >
        Cerrar sesión
      </button>
    </main>
  )
}
