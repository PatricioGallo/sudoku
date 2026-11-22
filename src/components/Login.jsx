import { useState } from 'react'
import * as api from '@api'
import Logo from './Logo.jsx'

export default function Login() {
  const [mode, setMode] = useState('login') // login | signup
  const [form, setForm] = useState({ username: '', password: '', firstName: '', lastName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const isSignup = mode === 'signup'

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isSignup) await api.signUp(form)
      else await api.signIn(form.username, form.password)
      // App detecta la sesión nueva y cambia de pantalla
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const switchMode = (m) => {
    setMode(m)
    setError('')
  }

  return (
    <div className={isSignup ? "screen login is-signup" : "screen login"}>
      <div className="login-hero">
        <Logo />
        <p className="tagline">Un número por casilla. Una sola solución.</p>
      </div>

      <form className="login-form" onSubmit={submit}>
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={!isSignup} onClick={() => switchMode('login')}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={isSignup} onClick={() => switchMode('signup')}>
            Crear cuenta
          </button>
        </div>

        <label className="field">
          <span>Usuario</span>
          <input
            value={form.username}
            onChange={set('username')}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            required
          />
        </label>

        {isSignup && (
          <div className="field-row">
            <label className="field">
              <span>Nombre</span>
              <input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" maxLength={40} />
            </label>
            <label className="field">
              <span>Apellido</span>
              <input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" maxLength={40} />
            </label>
          </div>
        )}

        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={isSignup ? 6 : undefined}
            required
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={loading}>
          {loading ? (isSignup ? 'Creando cuenta…' : 'Entrando…') : isSignup ? 'Crear cuenta' : 'Entrar a jugar'}
        </button>
      </form>
    </div>
  )
}
