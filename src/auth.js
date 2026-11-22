// Login simple del lado del cliente.
// Las contraseñas NO se guardan en texto plano: se guarda el hash SHA-256 de
// "usuario:contraseña". Ojo: esto evita exponer la clave en el repo, pero no es
// seguridad real (todo corre en el navegador). Para eso hace falta un backend.

const USERS = {
  patogallo: '7e248f7aa99ecfac6f89d997985a5f1c245e6a5bf3b5f2030fcf749c6e96f2ea',
}

const SESSION_KEY = 'sudoku.session'

async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function login(username, password) {
  const user = username.trim().toLowerCase()
  const expected = USERS[user]
  if (!expected) return null
  const hash = await sha256(`${user}:${password}`)
  if (hash !== expected) return null
  try {
    localStorage.setItem(SESSION_KEY, user)
  } catch {
    /* sin storage: la sesión dura hasta recargar */
  }
  return user
}

export function currentUser() {
  try {
    const user = localStorage.getItem(SESSION_KEY)
    return user && USERS[user] ? user : null
  } catch {
    return null
  }
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* nada */
  }
}
