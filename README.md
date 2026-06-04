# Copa Kahl

Sitio para cargar pronosticos del Mundial 2026, ver tabla de posiciones y administrar resultados.

## Desarrollo

```powershell
npm install
npm run dev
```

La app corre en `http://localhost:3000`.

## Admin

El panel esta en `/admin` y usa `PRODE_ADMIN_PIN`. Para desarrollo hay un `.env.local` local ignorado por git. Para desplegar, configurar esa variable en el hosting.

Desde el panel admin se cargan:

- Marcadores oficiales de fase de grupos.
- Primero y segundo real de cada grupo.
- Cruces eliminatorios cuando queden definidos.
- Marcadores oficiales de eliminatorias.
- Tabla de posiciones calculada automaticamente.
- Exportacion CSV con puntos y pronosticos.

## Reglas

- Fase de grupos hibrida: por cada fecha hay 10 partidos importantes con marcador exacto y 14 partidos con 1X2.
- Marcador exacto acertado: 2 puntos.
- Ganador, empate o perdedor correcto: 1 punto.
- Top 2 de grupo: 5 puntos si acierta los dos equipos, aunque esten invertidos. Uno o cero aciertos: 0 puntos.
- Eliminatorias: se cargan desde admin y se pronostican en `/eliminatorias`; solo suma el marcador exacto.

## Datos

Los envios se guardan en `data/submissions.json` y los resultados/configuracion en `data/results.json`. Ambos se crean automaticamente y quedan ignorados por git. Los envios de fase de grupos son definitivos; eliminatorias se agregan por nombre de participante y tambien quedan cerradas por cruce.

En Render conviene agregar un disk persistente y configurar:

```text
PRODE_ADMIN_PIN=456149
PRODE_DATA_DIR=/var/data
```

## Fixture

Fixture de fase de grupos validado contra el calendario FIFA 2026 publicado en junio de 2026. Son 72 partidos: 12 grupos de 4 equipos.
