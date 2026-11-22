// Backend simulado para probar la app sin Supabase: `npm run dev:mock`.
// Guarda todo en localStorage de este navegador.
import { normalizeUsername, validateSignUp, readLocalResults, markLocalMigrated } from './shared.js'

export const configured = true
const KEY = 'sudoku.mockdb'
const listeners = new Set()
const wait = () => new Promise((r) => setTimeout(r, 120))
// Simula la red: falla igual que Supabase cuando no hay conexión
const net = async () => {
  await wait()
  if (!navigator.onLine) throw new Error('Sin conexión. Revisá internet y probá de nuevo.')
}

function db() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY))
    if (d) return d
  } catch {
    /* nada */
  }
  return { users: {}, profiles: {}, results: [], session: null }
}
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d))
const emit = (user) => listeners.forEach((cb) => cb(user))
const userOf = (d) => (d.session ? { id: d.session } : null)

export async function getSessionUser() {
  return userOf(db())
}
export function onAuthChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function signIn(raw, password) {
  await net()
  const d = db()
  const username = normalizeUsername(raw)
  const u = Object.values(d.users).find((x) => x.username === username)
  if (!u || u.password !== password) throw new Error('Usuario o contraseña incorrectos.')
  d.session = u.id
  save(d)
  emit({ id: u.id })
  return { id: u.id }
}

export async function signUp({ username: raw, password, firstName = '', lastName = '' }) {
  await net()
  const username = normalizeUsername(raw)
  const invalid = validateSignUp({ username, password, firstName, lastName })
  if (invalid) throw new Error(invalid)
  const d = db()
  if (Object.values(d.users).some((x) => x.username === username)) throw new Error('Ese usuario ya existe. Elegí otro.')
  const id = crypto.randomUUID()
  d.users[id] = { id, username, password }
  d.profiles[id] = {
    id,
    username,
    first_name: firstName.trim() || null,
    last_name: lastName.trim() || null,
    avatar_url: null,
  }
  d.session = id
  save(d)
  emit({ id })
  return { id }
}

export async function signOut() {
  const d = db()
  d.session = null
  save(d)
  emit(null)
}

export async function getProfile(id) {
  await net()
  return db().profiles[id]
}

export async function updateProfile(id, { first_name, last_name }) {
  await net()
  const d = db()
  Object.assign(d.profiles[id], { first_name: first_name.trim() || null, last_name: last_name.trim() || null })
  save(d)
  return d.profiles[id]
}

export async function uploadAvatar(id, file) {
  await net()
  const { resizeImage } = await import('./shared.js')
  const blob = await resizeImage(file)
  const url = await new Promise((res) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result)
    fr.readAsDataURL(blob)
  })
  const d = db()
  d.profiles[id].avatar_url = url
  save(d)
  return d.profiles[id]
}

export async function changePassword(username, current, next) {
  await net()
  const d = db()
  const u = Object.values(d.users).find((x) => x.username === username)
  if (!u || u.password !== current) throw new Error('La contraseña actual no es correcta.')
  if (next.length < 6) throw new Error('La contraseña tiene que tener al menos 6 caracteres.')
  u.password = next
  save(d)
}

const byTime = (a, b) => a.seconds - b.seconds || a.errors - b.errors

export async function saveResult(userId, level, { seconds, errors, hintsUsed, created_at }) {
  await net()
  const d = db()
  const row = {
    id: d.results.length + 1,
    user_id: userId,
    level,
    seconds: Math.max(1, seconds),
    errors,
    hints_used: hintsUsed,
    created_at: created_at || new Date().toISOString(),
  }
  d.results.push(row)
  save(d)
  const mine = d.results.filter((r) => r.user_id === userId && r.level === level).sort(byTime)
  return { id: row.id, position: mine.findIndex((r) => r.id === row.id) + 1 }
}

export async function myRanking(userId, level, limit = 10) {
  await net()
  return db()
    .results.filter((r) => r.user_id === userId && r.level === level)
    .sort(byTime)
    .slice(0, limit)
}

export async function globalRanking(level, limit = 10) {
  await net()
  const d = db()
  const best = {}
  for (const r of d.results.filter((x) => x.level === level).sort(byTime)) best[r.user_id] ??= r
  return Object.values(best)
    .sort(byTime)
    .slice(0, limit)
    .map((r) => ({ ...d.profiles[r.user_id], ...r }))
}

export async function myBests(userId) {
  await net()
  const best = {}
  for (const r of db().results.filter((x) => x.user_id === userId).sort(byTime)) best[r.level] ??= r.seconds
  return best
}

export async function migrateLocal(userId, username) {
  const rows = readLocalResults(username)
  if (rows.length) {
    const d = db()
    rows.forEach((r) => d.results.push({ id: d.results.length + 1, user_id: userId, ...r }))
    save(d)
  }
  markLocalMigrated(username)
}

// Datos de ejemplo para ver el ranking global poblado
export function seedDemo() {
  const d = db()
  if (Object.keys(d.users).length) return
  const people = [
    ['lucia.m', 'Lucía', 'Méndez'],
    ['tomi_r', 'Tomás', 'Ríos'],
    ['caro', 'Carolina', null],
  ]
  people.forEach(([username, f, l], n) => {
    const id = crypto.randomUUID()
    d.users[id] = { id, username, password: '123456' }
    d.profiles[id] = { id, username, first_name: f, last_name: l, avatar_url: null }
    ;['principiante', 'facil', 'medio', 'dificil'].forEach((level, k) =>
      d.results.push({
        id: d.results.length + 1,
        user_id: id,
        level,
        seconds: 150 + n * 47 + k * 160,
        errors: n,
        hints_used: (n + k) % 3,
        created_at: new Date().toISOString(),
      })
    )
  })
  save(d)
}
