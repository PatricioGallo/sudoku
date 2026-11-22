import { useEffect, useState } from 'react'
import * as api from '@api'
import { generate, LEVELS } from './sudoku/generator.js'
import { loadProgress, saveProgress } from './progress.js'
import { formatTime } from './format.js'
import Login from './components/Login.jsx'
import Menu from './components/Menu.jsx'
import Game from './components/Game.jsx'
import Profile from './components/Profile.jsx'
import Logo from './components/Logo.jsx'
import Avatar from './components/Avatar.jsx'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = cargando
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('menu') // menu | game | profile
  const [game, setGame] = useState(null) // partida actual con su progreso
  const [pendingLevel, setPendingLevel] = useState(null) // pedir confirmación

  useEffect(() => {
    if (!api.configured) return
    api.getSessionUser().then(setUser)
    return api.onAuthChange(setUser)
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setView('menu')
      setGame(null)
      return
    }
    setGame(loadProgress(userId))
    api.getProfile(userId).then((p) => {
      setProfile(p)
      if (p) api.migrateLocal(p.id, p.username)
    })
  }, [userId])

  const inProgress = game && !game.won ? game : null

  const begin = (level) => {
    const g = { ...generate(level), id: Date.now() }
    setGame(g)
    saveProgress(userId, g)
    setPendingLevel(null)
    setView('game')
  }

  const requestNew = (level) => {
    if (inProgress) setPendingLevel(level)
    else begin(level)
  }

  const onProgress = (g) => {
    setGame(g)
    saveProgress(userId, g)
  }

  const goMenu = () => {
    if (game?.won) setGame(null)
    setView('menu')
  }

  if (!api.configured) return <SetupNeeded />
  if (user === undefined || (user && !profile)) return <Splash />
  if (!user) return <Login />

  return (
    <div className="screen app">
      <header className="topbar">
        <button className="brand" onClick={goMenu} aria-label="Ir al inicio">
          <Logo size="small" />
          <span className="wordmark">Sudoku</span>
        </button>
        <button
          className={view === 'profile' ? 'me is-active' : 'me'}
          onClick={() => setView('profile')}
          aria-label="Mi perfil"
        >
          <Avatar profile={profile} size={38} />
        </button>
      </header>

      {view === 'game' && game ? (
        <Game
          key={game.id}
          game={game}
          profile={profile}
          onProgress={onProgress}
          onNewGame={() => begin(game.level)}
          onExit={goMenu}
        />
      ) : view === 'profile' ? (
        <Profile profile={profile} onChange={setProfile} onBack={() => setView(inProgress ? 'game' : 'menu')} />
      ) : (
        <Menu profile={profile} current={inProgress} onResume={() => setView('game')} onStart={requestNew} />
      )}

      {pendingLevel && inProgress && (
        <div className="dialog-backdrop" onClick={() => setPendingLevel(null)}>
          <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>¿Empezar una partida nueva?</h3>
            <p>
              Tenés una partida de {LEVELS[inProgress.level].label} en curso ({formatTime(inProgress.seconds ?? 0)}). Si
              empezás una de {LEVELS[pendingLevel].label}, la anterior se cierra y no cuenta para el ranking.
            </p>
            <div className="dialog-actions">
              <button className="btn btn-primary" onClick={() => begin(pendingLevel)}>
                Empezar {LEVELS[pendingLevel].label}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setPendingLevel(null)
                  setView('game')
                }}
              >
                Seguir la anterior
              </button>
              <button className="btn-text" onClick={() => setPendingLevel(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Splash() {
  return (
    <div className="screen splash">
      <Logo />
    </div>
  )
}

function SetupNeeded() {
  return (
    <div className="screen splash">
      <Logo />
      <p className="tagline">Falta conectar la base de datos. Completá SUPABASE_URL y SUPABASE_ANON_KEY en src/config.js.</p>
    </div>
  )
}
