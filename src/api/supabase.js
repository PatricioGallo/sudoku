// Backend real: Supabase (cuentas, ranking global y fotos).
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'
import {
  normalizeUsername,
  validateSignUp,
  resizeImage,
  readLocalResults,
  markLocalMigrated,
} from './shared.js'

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

// Supabase identifica cuentas por email; los jugadores solo ven su usuario.
const EMAIL_DOMAIN = 'jugadores.sudoku-pato.app'
const toEmail = (username) => `${username}@${EMAIL_DOMAIN}`

function explain(error) {
  const msg = error?.message || ''
  if (/invalid login credentials/i.test(msg)) return 'Usuario o contraseña incorrectos.'
  if (/already registered|already exists/i.test(msg)) return 'Ese usuario ya existe. Elegí otro.'
  if (/password should be at least/i.test(msg)) return 'La contraseña tiene que tener al menos 6 caracteres.'
  if (/different from the old/i.test(msg)) return 'La contraseña nueva tiene que ser distinta de la actual.'
  if (/fetch|network/i.test(msg)) return 'Sin conexión. Revisá internet y probá de nuevo.'
  return msg || 'Algo salió mal. Probá de nuevo.'
}
const check = ({ data, error }) => {
  if (error) throw new Error(explain(error))
  return data
}

export async function getSessionUser() {
  const { data } = await sb.auth.getSession()
  return data.session?.user ?? null
}

export function onAuthChange(cb) {
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null))
  return () => data.subscription.unsubscribe()
}

export async function signIn(rawUsername, password) {
  const username = normalizeUsername(rawUsername)
  return check(await sb.auth.signInWithPassword({ email: toEmail(username), password })).user
}

export async function signUp({ username: raw, password, firstName = '', lastName = '' }) {
  const username = normalizeUsername(raw)
  const invalid = validateSignUp({ username, password, firstName, lastName })
  if (invalid) throw new Error(invalid)

  const taken = check(await sb.from('profiles').select('id').eq('username', username).maybeSingle())
  if (taken) throw new Error('Ese usuario ya existe. Elegí otro.')

  const data = check(
    await sb.auth.signUp({
      email: toEmail(username),
      password,
      options: { data: { username, first_name: firstName.trim(), last_name: lastName.trim() } },
    })
  )
  if (!data.session)
    throw new Error('La cuenta se creó, pero Supabase pide confirmar el email. Desactivá "Confirm email" en Authentication.')
  return data.user
}

export async function signOut() {
  await sb.auth.signOut()
}

export async function getProfile(userId) {
  return check(await sb.from('profiles').select('*').eq('id', userId).single())
}

export async function updateProfile(userId, { first_name, last_name }) {
  return check(
    await sb
      .from('profiles')
      .update({ first_name: first_name.trim() || null, last_name: last_name.trim() || null })
      .eq('id', userId)
      .select()
      .single()
  )
}

export async function uploadAvatar(userId, file) {
  const blob = await resizeImage(file)
  const path = `${userId}/avatar.jpg`
  check(await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' }))
  const url = `${sb.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
  return check(await sb.from('profiles').update({ avatar_url: url }).eq('id', userId).select().single())
}

export async function changePassword(username, current, next) {
  // Confirmamos la contraseña actual antes de cambiarla
  const { error } = await sb.auth.signInWithPassword({ email: toEmail(username), password: current })
  if (error) throw new Error('La contraseña actual no es correcta.')
  check(await sb.auth.updateUser({ password: next }))
}

export async function saveResult(userId, level, { seconds, errors, hintsUsed }) {
  const row = check(
    await sb
      .from('results')
      .insert({ user_id: userId, level, seconds: Math.max(1, seconds), errors, hints_used: hintsUsed })
      .select()
      .single()
  )
  const { count } = await sb
    .from('results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('level', level)
    .or(`seconds.lt.${row.seconds},and(seconds.eq.${row.seconds},errors.lt.${row.errors})`)
  return { id: row.id, position: (count ?? 0) + 1 }
}

export async function myRanking(userId, level, limit = 10) {
  return check(
    await sb
      .from('results')
      .select('id, seconds, errors, hints_used, created_at')
      .eq('user_id', userId)
      .eq('level', level)
      .order('seconds')
      .order('errors')
      .limit(limit)
  )
}

export async function globalRanking(level, limit = 10) {
  return check(await sb.rpc('global_ranking', { lvl: level, lim: limit }))
}

export async function myBests(userId) {
  const rows = check(await sb.from('results').select('level, seconds').eq('user_id', userId).order('seconds'))
  const best = {}
  for (const r of rows) best[r.level] ??= r.seconds
  return best
}

// Sube una sola vez los tiempos que estaban guardados en este navegador.
export async function migrateLocal(userId, username) {
  const rows = readLocalResults(username)
  if (rows.length) {
    const { error } = await sb.from('results').insert(rows.map((r) => ({ ...r, user_id: userId })))
    if (error) return
  }
  markLocalMigrated(username)
}
