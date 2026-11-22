import { useState } from 'react'
import { currentUser, logout } from './auth.js'
import { generate } from './sudoku/generator.js'
import Login from './components/Login.jsx'
import Menu from './components/Menu.jsx'
import Game from './components/Game.jsx'

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
    <div className="app">
      <header className="topbar">
        <h1 onClick={() => setGame(null)}>Sudoku</h1>
        <div className="user">
          <span>{user}</span>
          <button
            className="link"
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
