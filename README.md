# Vantly — Oficina Virtual

Panel donde una plantilla de agentes de IA trabaja sobre un producto de
dropshipping hasta dejarlo listo para vender en Shopify.

## Estado

**Prototipo.** Un único archivo HTML. Sin build, sin despliegue, sin backend.
Nada en producción.

> ⚠️ **Hoy no se ejecuta fuera del sandbox de artefactos de Claude**, que es donde
> se construyó. Ver *No arranca por su cuenta*, más abajo.

## Estructura

```
VANTLY/
├── web/
│   └── index.html    ← la base sobre la que se trabaja
├── original/         ← copias intactas, como referencia. No editar.
│   ├── oficina-virtual-vantly_1.html   (23 ago 2026, 19:31 — origen de web/index.html)
│   └── oficina-virtual-vantly.html     (23 ago 2026, 19:29 — versión anterior)
└── README.md
```

`web/index.html` es copia byte a byte de `oficina-virtual-vantly_1.html`. Se eligió
esa versión porque es superconjunto estricto de la otra: mismos 7 agentes, las
mismas 19 funciones más `escapeHtml()` e `initChainState()`, y la barra de progreso
rehecha con estado de error.

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

## No arranca por su cuenta

Dos dependencias del entorno anfitrión que el archivo no trae:

1. **`fetch('https://api.anthropic.com/v1/messages')` sin credenciales.** No hay
   `x-api-key` ni `anthropic-version` en las cabeceras. Solo funciona donde algo
   inyecte la autenticación por detrás. Desde `file://` o desde un servidor propio,
   falla por credenciales y por CORS.
2. **`window.storage`** — 8 llamadas a `.get()` / `.set()` y ninguna definición.
   No es API del navegador. Fuera del anfitrión es `undefined` y se lleva por
   delante el estado de agentes, fotos, textos y datos del producto.

Para que corra por su cuenta hacen falta un backend mínimo que guarde la clave y
haga de proxy —la clave nunca puede ir en el HTML, sería pública— y un adaptador
de `window.storage` sobre `localStorage` que respete la misma interfaz.

## Pendiente

- [ ] Backend proxy para la API
- [ ] Adaptador real de `window.storage`
- [ ] Desajuste: la interfaz anuncia "12 departamentos" y solo hay 7 agentes
- [ ] Decidir si sigue siendo archivo único o pasa a proyecto con build
- [ ] Qué conexión real tendrá con Shopify

## Notas

La documentación viva está en el vault de Obsidian:
`C:\ObsidianEliecer\ObsidianEliecer\Proyectos\Vantly\`
