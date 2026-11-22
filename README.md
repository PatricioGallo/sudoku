# sudoku

App de sudoku en React + Vite.

## Funciones

- Login con usuario y contraseña
- 4 niveles: Principiante, Fácil, Medio y Difícil
- Cronómetro (con pausa, y pausa automática al cambiar de pestaña)
- Contador de errores
- 3 pistas por partida
- Ranking de tiempos por usuario y nivel
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

## Usuarios

Los usuarios están en `src/auth.js`. Se guarda el hash SHA-256 de
`usuario:contraseña`, nunca la contraseña en texto plano. Para agregar uno:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('usuario:clave').digest('hex'))"
```

> Es un login del lado del cliente: sirve para separar rankings, no es seguridad real.
> El ranking se guarda en el navegador (localStorage), así que es por dispositivo.

## Deploy

Cada push a `main` publica la app en GitHub Pages (`.github/workflows/deploy.yml`).
Hay que activarlo una vez en **Settings → Pages → Source: GitHub Actions**.
