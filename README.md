# FinWise — Frontend

Aplicación web para administrar el sueldo: registrar el ingreso fijo del mes, anotar los gastos,
llevar el control de las deudas y avanzar en metas de ahorro.

Está pensada **primero para móvil**: navegación inferior fija, áreas táctiles amplias y todo el
contenido en una sola columna. En pantallas grandes el contenido se centra y se limita el ancho.

- **Framework:** Angular 22 (componentes standalone, signals, control flow `@if` / `@for`)
- **Estilos:** CSS propio, sin librerías de UI
- **Gráficas:** SVG hecho a mano, sin dependencias
- **Backend:** [finwise-backend](../finwise-backend) (NestJS + MongoDB)

---

## Requisitos

- Node.js 20 o superior (probado con 24.19.0)
- El backend corriendo en `http://localhost:3000`

## Puesta en marcha

```bash
npm install
npm start
```

La aplicación queda en <http://localhost:4200>.

> El backend debe estar encendido **antes** de iniciar sesión. Si no lo está, la pantalla de login
> avisa con «No se pudo conectar con el servidor».

## Configuración

La URL de la API se define en [src/environments/environment.ts](src/environments/environment.ts):

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};
```

Para producción se usa [src/environments/environment.prod.ts](src/environments/environment.prod.ts),
que Angular sustituye automáticamente al compilar con `--configuration production`.
Cambia ahí `apiUrl` por el dominio donde publiques el backend.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run watch` | Compilación incremental en modo desarrollo |
| `npm test` | Pruebas unitarias con Vitest |

---

## Estructura

```
src/app/
├── auth/                 Login, registro y retorno del OAuth de Google
├── dashboard/            Pantalla principal: saldo, gráficas y resumen del mes
├── expenses/             Gastos: lista por mes y formulario
├── incomes/              Ingreso fijo mensual: historial y formulario
├── debts/                Deudas: lista, detalle con abonos y formulario
├── savings/              Metas de ahorro: lista, detalle con aportes y formulario
├── layout/shell/         Cabecera y barra de navegación inferior
└── shared/
    ├── models/           Interfaces del dominio (espejo de los documentos de Mongo)
    ├── services/         Un servicio por recurso, más period / toast / confirm
    ├── pipes/            money (COP) y fecha (español)
    ├── components/       month-switcher, charts, toast-host, confirm-host
    ├── guards/           authGuard y guestGuard
    └── interceptors/     Adjunta el token y cierra la sesión ante un 401
```

### Piezas que conviene conocer antes de tocar código

**`PeriodService`** ([src/app/shared/services/period.service.ts](src/app/shared/services/period.service.ts))
guarda el mes y el año que el usuario está viendo. El dashboard y las listas de gastos e ingresos leen
de ahí, así que cambiar el mes en el selector se refleja en todas a la vez. La selección se persiste en
`localStorage` para que recargar no devuelva al mes actual.

**Los campos de referencia llegan populados.** Al listar gastos, `category_id` y `debt_id` vienen como
objeto completo; al crear o actualizar se envían como string. Usa `refId()` y `categoryName()` de
[src/app/shared/models/index.ts](src/app/shared/models/index.ts) en lugar de asumir un tipo.

**Las fechas se parsean a mano.** `new Date('2026-03-05')` se interpreta como UTC y en Colombia
mostraría el día anterior. Por eso existe `parseLocalDate()` en
[src/app/shared/pipes/fecha.pipe.ts](src/app/shared/pipes/fecha.pipe.ts); úsalo siempre que conviertas
una fecha del backend.

**El backend rechaza campos desconocidos.** Corre con `forbidNonWhitelisted`, así que enviar una
propiedad de más —o una con `undefined`— devuelve un 400. Los servicios limpian el objeto antes de
enviarlo; si añades un campo nuevo, añádelo también al DTO del backend.

### Sistema de diseño

Los estilos globales están en [src/styles.css](src/styles.css) como clases con prefijo `fw-`
(`fw-card`, `fw-btn`, `fw-input`, `fw-chip`, `fw-progress`…) y variables CSS (`--fw-primary`,
`--fw-radius`, `--fw-nav-height`…). Los componentes solo añaden lo que es propio de esa pantalla.

Dos detalles que resuelven problemas reales de móvil:

- Los campos de formulario usan `font-size: 16px` porque iOS hace zoom automático por debajo de eso.
- El relleno inferior de las páginas reserva `--fw-nav-height` más `env(safe-area-inset-bottom)`, para
  que la barra de navegación y el borde inferior del iPhone no tapen el último elemento.
