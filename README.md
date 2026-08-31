# Vantly — Oficina Virtual

Panel donde una plantilla de agentes de IA trabaja sobre un producto de
dropshipping hasta dejarlo listo para vender en Shopify.

## Estado

**Prototipo, ya ejecutable en local.** Sin despliegue y sin build: el frontend
sigue siendo un único HTML sin dependencias.

## Cómo arrancarlo

Hace falta una clave de API de Anthropic, de
https://console.anthropic.com/settings/keys

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
npm install
npm start
```

Y abrir http://localhost:3000

Para no repetir la clave en cada ventana, `setx ANTHROPIC_API_KEY "sk-ant-..."`
la guarda en tu usuario de Windows (hay que abrir una ventana nueva después).

**La clave vive solo en el proceso de Node.** Nunca baja al navegador: por eso el
HTML llama a `/api/messages` y no a `api.anthropic.com`. Si estuviera en el HTML,
la tendría cualquiera que abriese el código fuente de la página. `.gitignore`
bloquea `.env` por el mismo motivo.

## Estructura

```
VANTLY/
├── server.mjs        ← sirve web/ y hace de proxy con la API
├── package.json
├── web/
│   └── index.html    ← el frontend entero
├── original/         ← copias intactas, como referencia. No editar.
│   ├── oficina-virtual-vantly_1.html   (23 ago 2026, 19:31 — origen de web/index.html)
│   └── oficina-virtual-vantly.html     (23 ago 2026, 19:29 — versión anterior)
└── README.md
```

`web/index.html` partió de `oficina-virtual-vantly_1.html`. Se eligió esa versión
porque es superconjunto estricto de la otra: mismos 7 agentes, las mismas 19
funciones más `escapeHtml()` e `initChainState()`, y la barra de progreso rehecha
con estado de error.

## Qué hace

- **7 agentes** — Cazador de Productos, Creador de Tienda Online, Creador de Copys
  Persuasivos, Creador de Anuncios Virales, SecretarIA, Contable y Supervisor
  (`jarvis`).
- **Cadena de producción** — el trabajo pasa de uno a otro, pero solo recorre 5 de
  los 7: `cazador → copys → anuncios → secretaria → jarvis`. Tienda y Contable
  quedan fuera y hay que invocarlos a mano.
- **Calculadora de márgenes** — coste, envío y precio de venta → margen en € y %.
  El resultado se inyecta como contexto en cada instrucción a los agentes.
- **Fotos y textos compartidos** entre agentes, para encadenar el trabajo.

## Qué hubo que resolver

El prototipo se escribió dentro del sandbox de artefactos de Claude y daba por
hechas dos cosas que ese entorno le regalaba:

1. **Llamaba a `api.anthropic.com` sin credenciales** — ni `x-api-key` ni
   `anthropic-version`. Funcionaba porque el sandbox inyectaba la autenticación
   por detrás. Ahora llama a `/api/messages` y es `server.mjs` quien añade la
   clave, con el SDK oficial `@anthropic-ai/sdk`.
2. **Usaba `window.storage`**, que no es API de ningún navegador: 8 llamadas y
   cero definiciones. Ahora hay un adaptador sobre `localStorage` al principio de
   `web/index.html` que respeta la misma interfaz (`get` devuelve `{value}`), así
   que el resto del código no se tocó.

Aprovechando el cambio se actualizó el modelo a `claude-opus-5` (estaba en
`claude-sonnet-4-6`), se subió `max_tokens` de 1000 a 16000 y la herramienta de
búsqueda web a `web_search_20260209`.

**Límite conocido:** `localStorage` ronda los 5 MB y las fotos se guardan en
base64, así que al acumular varias saltará `QuotaExceededError`. El código que
llama ya lo captura y sigue funcionando en memoria durante la sesión. Cuando
estorbe, la salida es IndexedDB.

## Pendiente

- [x] ~~Backend proxy para la API~~
- [x] ~~Adaptador real de `window.storage`~~
- [ ] Desajuste: la interfaz anuncia "12 departamentos" y solo hay 7 agentes
- [ ] Persistencia que aguante fotos (IndexedDB en vez de `localStorage`)
- [ ] Decidir si sigue siendo archivo único o pasa a proyecto con build
- [ ] Qué conexión real tendrá con Shopify

## Notas

La documentación viva está en el vault de Obsidian:
`C:\ObsidianEliecer\ObsidianEliecer\Proyectos\Vantly\`
