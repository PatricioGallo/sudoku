# sudoku

App de sudoku en React + Vite.

## Funciones

- Registro y login con usuario y contraseña
- Perfil con foto, nombre, apellido y cambio de contraseña
- 4 niveles: Principiante, Fácil, Medio y Difícil
- Cronómetro (con pausa, y pausa automática al cambiar de pestaña)
- Contador de errores
- 3 pistas por partida
- Ranking global (mejor tiempo de cada jugador) y ranking personal, por nivel
- Se juega con mouse/touch o con teclado (números, flechas, Backspace)

## Cómo se generan las partidas

`src/sudoku/generator.js` arma un tablero completo al azar y después va sacando
números de a uno. Cada vez que saca uno, el solver cuenta las soluciones (hasta 2):
si hay más de una, lo vuelve a poner. Así **toda partida tiene una única solución**.

El nivel se define por la cantidad de números iniciales:

| Nivel        | Números iniciales |
|--------------|-------------------|
| Principiante | 46                |
| Fácil        | 40                |
| Medio        | 33                |
| Difícil      | 27                |

`npm test` genera 20 partidas por nivel y verifica que cada una tenga solución única.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # prueba del generador
npm run build    # genera dist/
```

## Cuentas y ranking global (Supabase)

Las cuentas, el ranking global y las fotos de perfil viven en [Supabase](https://supabase.com).

1. Crear un proyecto en Supabase.
2. **SQL Editor → New query**: pegar `supabase/schema.sql` y correrlo.
3. **Authentication → Sign In / Providers → Email**: desactivar *Confirm email*
   (los jugadores entran con usuario, no con email).
4. Copiar *Project URL* y la clave *anon / publishable* en `src/config.js`.

Para probar sin Supabase: `npm run dev:mock` (backend simulado en el navegador, con jugadores de ejemplo).

## Deploy

Cada push a `main` publica la app en GitHub Pages (`.github/workflows/deploy.yml`).
Hay que activarlo una vez en **Settings → Pages → Source: GitHub Actions**.
