# CompanyCompare

Aplicación web SaaS de análisis competitivo para empresarios. Compara tu
empresa con un competidor, explica de dónde salen las diferencias y produce un
plan de acción con seguimiento.

La idea que ordena todo el producto:

```
DATO → DIFERENCIA → POSIBLE CAUSA → EVIDENCIA → HIPÓTESIS → ACCIÓN → KPI → RESULTADO
```

## Arrancar en local

```bash
npm install
cp .env.example .env.local     # opcional: funciona sin tocar nada
npm run dev                    # http://localhost:3000
```

Sin configurar nada, la aplicación arranca en **modo demo**: almacén en memoria
y análisis determinista sin IA. Crea una cuenta en `/registro` y tendrás
cargado el análisis de demostración NovaTech frente a AlphaTech, con doce meses
de histórico para la pantalla de seguimiento.

Otros comandos:

```bash
npm run build       # compilación de producción
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run db:migrate  # migraciones de Prisma (requiere DATABASE_URL)
```

## Qué funciona ahora mismo

Todo el recorrido está implementado y es navegable de punta a punta:

| Pantalla | Estado |
|---|---|
| Registro, login, logout, recuperación de contraseña | Funciona. La recuperación genera el token real; falta conectar el envío de email (en desarrollo se devuelve el enlace en pantalla). |
| Dashboard con resumen, contadores y evolución | Funciona |
| Nuevo análisis (7 categorías, 45 métricas, «No lo sé» por campo) | Funciona |
| Comparación con brechas por área, gráficos y cobertura de datos | Funciona |
| Descomposición de la brecha de facturación | Funciona |
| Detección de problemas con impacto explicado | Funciona |
| Análisis de causas con evidencia, confianza y comprobaciones | Funciona |
| Recomendaciones con pasos, coste, dificultad y KPI | Funciona |
| Plan de acción por semanas y matriz impacto/esfuerzo | Funciona |
| Seguimiento con histórico y registro de mediciones | Funciona |
| Informe en 8 apartados | Funciona. Exporta a PDF por la impresión del navegador. |
| Modo claro y oscuro, escritorio, tableta y móvil | Funciona |

## Arquitectura

```
src/
  lib/metrics/      catálogo de métricas: la única fuente de verdad
    catalog.ts        45 métricas + 4 derivadas, con área, peso y umbral
    types.ts          tipos, procedencia del dato, escala de la brecha
    derive.ts         métricas calculadas (valor por cliente, ratio valor/CAC…)
    format.ts         formato español de cifras y diferencias

  lib/analysis/     el motor: determinista y auditable
    scoring.ts        brechas, impacto 0-100 y el texto que explica el cálculo
    revenue.ts        reparto de la brecha de facturación en sus factores
    knowledge.ts      base de causas y acciones (las reglas del consultor)
    engine.ts         ensambla hallazgos, hipótesis y recomendaciones
    load.ts           carga un análisis del almacén y lo ejecuta

  lib/db/           persistencia intercambiable
    types.ts          contrato `DataStore`, con `userId` en cada método
    memory.ts         almacén en memoria (modo demo)
    prisma-store.ts   almacén PostgreSQL (producción)

  lib/auth/         sesión por cookie firmada (HMAC) y acciones de servidor
  lib/actions/      acciones de servidor de análisis, tareas y seguimiento

  services/ai/      capa de IA intercambiable
    types.ts          interfaz `AiProvider`
    schemas.ts        esquemas Zod de entrada y salida
    payload.ts        qué se envía al modelo (solo lo necesario)
    prompt.ts         sistema y usuario
    mock.ts           proveedor por defecto: redacta desde los cálculos, sin red
    anthropic.ts      proveedor real, `server-only`
    index.ts          selección de proveedor y caída al determinista

  components/       sistema de diseño, gráficos y bloques de producto
  app/              rutas (App Router)
```

### El motor de análisis

El cálculo no usa puntuaciones opacas. Cada métrica declara un **umbral de
materialidad** y un **peso**, y el impacto sale de una fórmula que la propia
interfaz muestra:

```
impacto = 100 × magnitud × (0,4 + 0,6 × peso/3)
```

donde `magnitud` es la brecha dividida entre el umbral de la métrica, recortada
al saturar en cuatro veces ese umbral. Una métrica de apoyo (peso 1) no puede
pasar de 40 sobre 100, así que nunca se clasifica como impacto alto. El corte
es alto ≥ 66, medio ≥ 33.

Las brechas de porcentajes se miden en **puntos porcentuales** cuando describen
una proporción de la base de clientes (recompra, retención) y en **términos
relativos** cuando el porcentaje es pequeño (conversión): pasar del 1,6 % al
2,4 % son 0,8 puntos, pero es un 33 % menos de ventas por visita.

La brecha de facturación se reparte entre sus tres factores
(`clientes × ticket medio × frecuencia`) descomponiendo el producto en
logaritmos. Es un reparto exacto, no una estimación: un factor en el que la
empresa va por delante entra con signo negativo.

### Honestidad de los datos

Es la restricción que atraviesa todo el producto. Cada valor lleva su
procedencia —dato introducido, dato público, estimación, inferencia de IA,
calculado o **desconocido**— y se muestra junto a la cifra. Un dato que el
usuario no conoce se guarda como `null`; nunca se rellena con un cero ni con
una media. Cada hipótesis lleva la evidencia que la sostiene, su nivel de
confianza con el criterio explicado y qué habría que comprobar para
confirmarla. Ninguna recomendación promete un resultado: describe el efecto
plausible y qué medir.

## Conectar la IA

La capa `/src/services/ai` funciona por defecto con el proveedor `mock`, que no
hace ninguna llamada de red: redacta la interpretación a partir de los números
que ya ha calculado el motor. La interfaz lo etiqueta como «análisis
determinista, sin IA».

Para usar un modelo real:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5    # opcional
```

La clave se lee solo en el servidor: `anthropic.ts` está marcado como
`server-only`, así que importarlo desde un componente de cliente es un error de
compilación. La respuesta se pide con salida estructurada validada contra un
esquema Zod; si no encaja, se descarta y se cae al proveedor determinista
dejando constancia del motivo en pantalla. Cambiar de proveedor o de modelo es
tocar solo `services/ai/index.ts`.

## Conectar la base de datos

```bash
DATABASE_URL=postgresql://usuario:clave@host:5432/companycompare
npm run db:migrate
```

Con `DATABASE_URL` presente, `getStore()` usa el adaptador de Prisma en lugar
del almacén en memoria. El esquema (`prisma/schema.prisma`) ya contempla
usuarios, empresas, análisis, valores de métrica con su procedencia, hallazgos,
hipótesis, recomendaciones, tareas e histórico de métricas.

## Desplegar en Vercel

El proyecto es Next.js estándar: Vercel lo detecta sin configuración y no hace
falta `vercel.json`. Importa el repositorio desde el panel de Vercel y deja los
ajustes de compilación por defecto.

Lo único que hay que preparar son las variables de entorno, y **dos de ellas no
son opcionales en producción**:

| Variable | ¿Obligatoria? | Por qué |
|---|---|---|
| `AUTH_SECRET` | **Sí** | Firma las cookies de sesión. En producción la aplicación se niega a arrancar sin ella, en lugar de usar una clave conocida. Genera una con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `DATABASE_URL` | **Sí** (ver abajo) | Sin ella se usa el almacén en memoria. |
| `AI_PROVIDER` | No | `mock` por defecto. |
| `ANTHROPIC_API_KEY` | Solo si `AI_PROVIDER=anthropic` | |

### El almacén en memoria no sirve en Vercel

Es la trampa importante. En local, el almacén en memoria funciona porque hay un
único proceso que se mantiene vivo. En Vercel cada petición puede tocar una
instancia distinta, y las instancias se reciclan solas: una persona se
registraría en una instancia y la siguiente petición, servida por otra, no
encontraría su cuenta. La sesión se perdería sola y los análisis
desaparecerían, de forma intermitente y difícil de diagnosticar.

Así que un despliegue real necesita PostgreSQL desde el primer momento. En
Vercel, pestaña **Storage** → *Create Database* → **Neon**: al vincularla al
proyecto, Vercel añade `DATABASE_URL` sola.

No hace falta aplicar el esquema a mano. El script `vercel-build` ejecuta
`prisma migrate deploy` antes de compilar **solo si hay `DATABASE_URL`**:

```json
"vercel-build": "if [ -n \"$DATABASE_URL\" ]; then prisma migrate deploy; fi && next build"
```

Así cada despliegue deja la base de datos al día por sí solo, y si una
migración falla el despliegue se aborta en lugar de publicar una versión que
espera unas tablas que no existen. Sin `DATABASE_URL` el paso se salta, de modo
que el modo demo se sigue pudiendo desplegar sin base de datos.

Con la variable puesta, `getStore()` cambia al adaptador de Prisma sin tocar
una línea de código, y el aviso de «los datos viven en memoria» desaparece de
la interfaz.

Si solo quieres enseñar la demo y no te importa que los datos se pierdan,
puedes desplegar sin `DATABASE_URL`, pero cuenta con que la sesión se caerá
sola cada pocos minutos.

## Qué falta para venderlo como SaaS

Por orden de lo que bloquea antes:

1. **Envío de email.** La recuperación de contraseña genera el token pero no lo
   envía. Falta un proveedor (Resend, Postmark) y las plantillas.
2. **Pagos y límites de plan.** El modelo `User.plan` (FREE / PRO / BUSINESS)
   existe, pero nada comprueba los límites todavía. Hace falta integrar Stripe
   y aplicar el límite en las acciones de servidor, no en la interfaz.
3. **Verificación de email y recuperación de cuenta**, más protección contra
   fuerza bruta en el login (limitación por IP y por cuenta).
4. **Equipos.** El plan Business supone varios usuarios por empresa: hace falta
   un modelo de organización y permisos por miembro.
5. **PDF propio.** Hoy el informe se exporta por la impresión del navegador.
   Para enviarlo por correo hace falta generarlo en el servidor.
6. **Enriquecimiento desde URL.** La arquitectura ya separa la procedencia de
   cada dato (`ENRICHMENT_PROVIDER` está reservado en `.env.example`), pero no
   hay ningún proveedor conectado. Cuando lo haya, los datos recogidos deben
   entrar como `public`, nunca mezclados con los del usuario.
7. **Pruebas automatizadas.** El motor de análisis es puro y determinista, así
   que es el sitio natural por donde empezar.
8. **Observabilidad**: registro de errores, métricas de uso y copias de
   seguridad de la base de datos.

## Decisiones que conviene conocer

- **Los análisis se calculan en cada petición** en lugar de guardar los
  hallazgos. El cálculo es barato y determinista, y así una mejora en las reglas
  se refleja en los análisis antiguos sin migrar nada.
- **El almacén en memoria no es una maqueta**: implementa el mismo contrato que
  el de Prisma y ejercita los mismos caminos de código, para que el modo demo no
  sea un camino aparte que se pudra.
- **La paleta de gráficos está validada** para deficiencias de visión del color
  en claro y en oscuro, y el color nunca es el único canal: toda serie lleva
  etiqueta directa y leyenda.
