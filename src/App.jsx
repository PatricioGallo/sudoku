import { useEffect, useState } from 'react'
import * as api from '@api'
import { generate } from './sudoku/generator.js'
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
  const [game, setGame] = useState(null)
  const [gameId, setGameId] = useState(0)

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
    api.getProfile(userId).then((p) => {
      setProfile(p)
      if (p) api.migrateLocal(p.id, p.username)
    })
  }, [userId])

  const start = (level) => {
    setGame(generate(level))
    setGameId((n) => n + 1)
    setView('game')
  }

  if (!api.configured) return <SetupNeeded />
  if (user === undefined || (user && !profile)) return <Splash />
  if (!user) return <Login />

  return (
    <div className="screen app">
      <header className="topbar">
        <button className="brand" onClick={() => setView('menu')} aria-label="Ir al inicio">
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
          key={gameId}
          game={game}
          profile={profile}
          onNewGame={() => start(game.level)}
          onExit={() => setView('menu')}
        />
      ) : view === 'profile' ? (
        <Profile profile={profile} onChange={setProfile} onBack={() => setView(game ? 'game' : 'menu')} />
      ) : (
        <Menu profile={profile} onStart={start} />
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
