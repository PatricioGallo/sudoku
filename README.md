# sudoku

App de sudoku en React + Vite.

## Funciones

- Registro y login con usuario y contraseña
- Perfil con foto, nombre, apellido y cambio de contraseña
- 6 niveles (Principiante, Fácil, Medio, Difícil, Experto, Maestro) que se desbloquean
  ganando partidas del nivel anterior
- 6 rangos por puntos (Novato, Aprendiz, Avanzado, Maestro, Gran maestro, Leyenda):
  cada partida ganada suma puntos según nivel, tiempo, errores y pistas (ver `src/levels.js`)
- 3 pistas por partida
- Anotaciones de candidatos en cada casilla (se borran solas al colocar un número)
- Ranking de jugadores por puntos totales, con su rango
- Ranking global (mejor tiempo de cada jugador) y ranking personal, por nivel
- Se juega con mouse/touch o con teclado (números, flechas, Backspace)
- Funciona sin conexión: la app queda instalada (service worker) y las partidas
  terminadas offline se suben solas cuando vuelve internet
- La partida en curso se guarda y se puede retomar

## Cómo se generan las partidas

`src/sudoku/generator.js` arma un tablero completo al azar y después va sacando
números de a uno. Cada vez que saca uno, el solver cuenta las soluciones (hasta 2):
si hay más de una, lo vuelve a poner. Así **toda partida tiene una única solución**.

El nivel se define por la cantidad de números iniciales:

### Niveles

| Nivel        | Números iniciales        | Para desbloquear              | Puntos base | Tiempo objetivo |
|--------------|--------------------------|-------------------------------|-------------|-----------------|
| Principiante | 46                       | —                             | 10          | 5 min           |
| Fácil        | 40                       | 2 ganadas en Principiante     | 20          | 8 min           |
| Medio        | 33                       | 5 ganadas en Fácil            | 40          | 12 min          |
| Difícil      | 27                       | 7 ganadas en Medio            | 80          | 18 min          |
| Experto      | 23                       | 10 ganadas en Difícil         | 160         | 25 min          |
| Maestro      | 22 + técnicas avanzadas  | 12 ganadas en Experto         | 320         | 35 min          |

### Rangos

| Rango        | Puntos  |
|--------------|---------|
| Novato       | 0       |
| Aprendiz     | 100     |
| Avanzado     | 500     |
| Maestro      | 2.500   |
| Gran maestro | 12.500  |
| Leyenda      | 62.500  |

Puntos por partida = base × velocidad × precisión
- velocidad = tiempo objetivo / tu tiempo, entre ×0,5 y ×2
- precisión = 1 − 10% por error − 20% por pista (mínimo 20%)

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
