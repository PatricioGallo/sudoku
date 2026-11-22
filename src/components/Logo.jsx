// Logo: una caja de sudoku de 3x3 donde las letras caen como fichas.
const TILES = ['S', 'U', 'D', 'O', 'K', 'U', '4', '9', '2']

export default function Logo({ size = 'big' }) {
  return (
    <div className={`logo logo-${size}`} aria-label="Sudoku" role="img">
      {TILES.map((t, i) => (
        <span key={i} className={i < 6 ? 'tile letter' : 'tile digit'} style={{ '--i': i }}>
          {t}
        </span>
      ))}
    </div>
  )
}
