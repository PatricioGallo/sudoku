import { useRef, useState } from 'react'
import * as api from '@api'
import Avatar from './Avatar.jsx'
import { cacheProfile } from '../offline.js'

export default function Profile({ profile, onChange, onBack }) {
  const fileRef = useRef(null)
  const [names, setNames] = useState({ first_name: profile.first_name || '', last_name: profile.last_name || '' })
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' })
  const [status, setStatus] = useState({}) // { photo|names|password: {ok|error, text} }
  const [busy, setBusy] = useState('')

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
        <Msg k="photo" />
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
