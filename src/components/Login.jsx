import { useState } from 'react'
import { login } from '../auth.js'
import Logo from './Logo.jsx'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const user = await login(username, password)
    setLoading(false)
    if (user) onLogin(user)
    else setError('Usuario o contraseña incorrectos. Revisá mayúsculas y probá de nuevo.')
  }

  return (
    <div className="screen login">
      <div className="login-hero">
        <Logo />
        <p className="tagline">Un número por casilla. Una sola solución.</p>
      </div>

      <form className="login-form" onSubmit={submit}>
        <label className="field">
          <span>Usuario</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            required
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar a jugar'}
        </button>
      </form>
    </div>
  )
}
