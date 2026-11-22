import { useState } from 'react'
import { currentUser, logout } from './auth.js'
import { generate } from './sudoku/generator.js'
import Login from './components/Login.jsx'
import Menu from './components/Menu.jsx'
import Game from './components/Game.jsx'
import Logo from './components/Logo.jsx'

export default function App() {
  const [user, setUser] = useState(currentUser)
  const [game, setGame] = useState(null)
  const [gameId, setGameId] = useState(0)

  const start = (level) => {
    setGame(generate(level))
    setGameId((n) => n + 1)
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <div className="screen app">
      <header className="topbar">
        <button className="brand" onClick={() => setGame(null)} aria-label="Ir al inicio">
          <Logo size="small" />
          <span className="wordmark">Sudoku</span>
        </button>
        <div className="user">
          <span className="avatar" aria-hidden="true">
            {user[0].toUpperCase()}
          </span>
          <button
            className="btn-text"
            onClick={() => {
              logout()
              setUser(null)
              setGame(null)
            }}
          >
            Salir
          </button>
        </div>
      </header>

      {game ? (
        <Game
          key={gameId}
          game={game}
          user={user}
          onNewGame={() => start(game.level)}
          onExit={() => setGame(null)}
        />
      ) : (
        <Menu user={user} onStart={start} />
      )}
    </div>
  )
}
