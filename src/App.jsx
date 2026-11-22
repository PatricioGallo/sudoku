import { useEffect, useState } from 'react'
import * as api from '@api'
import { generate, LEVELS } from './sudoku/generator.js'
import { loadProgress, saveProgress } from './progress.js'
import { formatTime } from './format.js'
import { cachedProfile, cacheProfile, flushPending, isOffline, pendingResults } from './offline.js'
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
  const [online, setOnline] = useState(!isOffline())
  const [pendingCount, setPendingCount] = useState(0)
  const [dataVersion, setDataVersion] = useState(0) // refresca rankings al sincronizar
  const [generating, setGenerating] = useState(null) // nivel que se está armando

  // Sin conexión, la sesión puede no validarse: seguimos con el último perfil usado
  const offlineUser = () => {
    const p = cachedProfile()
    return isOffline() && p ? { id: p.id } : null
  }

  useEffect(() => {
    if (!api.configured) return
    const timeout = new Promise((r) => setTimeout(() => r(null), 5000))
    Promise.race([api.getSessionUser().catch(() => null), timeout]).then((u) => setUser(u ?? offlineUser()))
    return api.onAuthChange((u) => setUser((prev) => u ?? (prev && offlineUser()) ?? null))
  }, [])

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
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
    api
      .getProfile(userId)
      .then((p) => {
        updateProfile(p)
        if (p) api.migrateLocal(p.id, p.username)
      })
      .catch(() => {
        const p = cachedProfile()
        if (p?.id === userId) setProfile(p)
      })
  }, [userId])

  // Subir partidas jugadas sin conexión apenas vuelve internet
  const sync = () => {
    if (!userId) return
    setPendingCount(pendingResults(userId).length)
    flushPending(userId).then((n) => {
      setPendingCount(pendingResults(userId).length)
      if (n) setDataVersion((v) => v + 1)
    })
  }
  useEffect(() => {
    if (!userId || !online) return
    sync()
    const onVisible = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, online]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateProfile = (p) => {
    setProfile(p)
    cacheProfile(p)
  }

  const inProgress = game && !game.won ? game : null

  const begin = (level) => {
    setPendingLevel(null)
    setGenerating(level)
    // Dejar que se pinte el aviso: los niveles altos tardan un momento en armarse
    setTimeout(() => {
      const g = { ...generate(level), id: Date.now() }
      setGame(g)
      saveProgress(userId, g)
      setGenerating(null)
      setView('game')
    }, 60)
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

      {(!online || pendingCount > 0) && (
        <div className={online ? 'netbar is-syncing' : 'netbar'} role="status">
          {!online
            ? `Sin conexión. Podés seguir jugando${pendingCount ? `; ${pendingCount} ${pendingCount === 1 ? 'partida se sube' : 'partidas se suben'} cuando vuelva internet` : ' y tus tiempos se suben cuando vuelva internet'}.`
            : `Subiendo ${pendingCount} ${pendingCount === 1 ? 'partida jugada' : 'partidas jugadas'} sin conexión…`}
        </div>
      )}

      {view === 'game' && game ? (
        <Game
          key={game.id}
          game={game}
          profile={profile}
          onProgress={onProgress}
          onQueued={() => setPendingCount(pendingResults(userId).length)}
          onNewGame={() => begin(game.level)}
          onExit={goMenu}
        />
      ) : view === 'profile' ? (
        <Profile profile={profile} onChange={updateProfile} onBack={() => setView(inProgress ? 'game' : 'menu')} />
      ) : (
        <Menu key={dataVersion} profile={profile} current={inProgress} onResume={() => setView('game')} onStart={requestNew} />
      )}

      {generating && (
        <div className="dialog-backdrop">
          <div className="generating" role="status">
            <Logo size="small" />
            <span>Armando un tablero {LEVELS[generating].label.toLowerCase()}…</span>
          </div>
        </div>
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
