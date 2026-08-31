// Servidor local de Vantly.
//
// Hace dos cosas:
//   1. Sirve web/ en http://localhost:3000
//   2. Expone POST /api/messages, que es lo único que habla con Anthropic.
//
// La clave vive SOLO aquí, en el proceso de Node, leída del entorno. Nunca
// baja al navegador: por eso el HTML llama a /api/messages y no a
// api.anthropic.com. Si la clave estuviera en el HTML, cualquiera que abriera
// el código fuente de la página la tendría.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const PORT = Number(process.env.PORT) || 3000;
const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), 'web');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(`
  Falta ANTHROPIC_API_KEY.

  Consíguela en https://console.anthropic.com/settings/keys y luego, en esta
  misma ventana de PowerShell:

      $env:ANTHROPIC_API_KEY = "sk-ant-..."
      npm start

  Para no repetirlo cada vez, guárdala en tu usuario de Windows:

      setx ANTHROPIC_API_KEY "sk-ant-..."

  (abre una ventana nueva después de un setx; la actual no se entera)
`);
  process.exit(1);
}

const anthropic = new Anthropic();   // lee ANTHROPIC_API_KEY del entorno

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

function json(res, codigo, cuerpo) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
  });
  res.end(texto);
}

async function leerCuerpo(req, limite = 32 * 1024 * 1024) {
  const trozos = [];
  let total = 0;
  for await (const trozo of req) {
    total += trozo.length;
    if (total > limite) throw new Error('Petición demasiado grande (límite 32 MB)');
    trozos.push(trozo);
  }
  return JSON.parse(Buffer.concat(trozos).toString('utf8'));
}

async function proxyMensajes(req, res) {
  let peticion;
  try {
    peticion = await leerCuerpo(req);
  } catch (e) {
    return json(res, 400, { error: { message: `Cuerpo inválido: ${e.message}` } });
  }

  try {
    const respuesta = await anthropic.messages.create({
      model:      peticion.model      ?? 'claude-opus-5',
      max_tokens: peticion.max_tokens ?? 16000,
      system:     peticion.system,
      messages:   peticion.messages,
      ...(peticion.tools ? { tools: peticion.tools } : {}),
    });

    // El modelo puede declinar por seguridad: eso llega como HTTP 200 con
    // stop_reason 'refusal', no como excepción. Sin esto, el agente se
    // quedaría mudo sin explicar por qué.
    if (respuesta.stop_reason === 'refusal') {
      return json(res, 200, {
        content: [{
          type: 'text',
          text: 'El agente ha declinado responder a esta petición por motivos de seguridad'
              + (respuesta.stop_details?.category ? ` (${respuesta.stop_details.category})` : '')
              + '. Reformula la instrucción.',
        }],
      });
    }

    return json(res, 200, respuesta);
  } catch (e) {
    // Clases tipadas del SDK, de la más específica a la más general.
    if (e instanceof Anthropic.AuthenticationError) {
      console.error('[auth] la clave no es válida');
      return json(res, 401, { error: { message: 'La clave de API no es válida. Revisa ANTHROPIC_API_KEY.' } });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return json(res, 429, { error: { message: 'Demasiadas peticiones seguidas. Espera unos segundos y reintenta.' } });
    }
    if (e instanceof Anthropic.BadRequestError) {
      console.error('[400]', e.message);
      return json(res, 400, { error: { message: e.message } });
    }
    if (e instanceof Anthropic.APIError) {
      console.error(`[${e.status}]`, e.message);
      return json(res, e.status ?? 502, { error: { message: e.message } });
    }
    console.error('[error]', e);
    return json(res, 500, { error: { message: 'Error inesperado en el servidor. Mira la consola de Node.' } });
  }
}

async function servirEstatico(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let ruta = decodeURIComponent(url.pathname);
  if (ruta === '/') ruta = '/index.html';

  // normalize() colapsa los '..', así que una petición a /../../secreto
  // no puede escapar de web/.
  const destino = join(RAIZ, normalize(ruta));
  if (!destino.startsWith(RAIZ)) {
    return json(res, 403, { error: { message: 'Prohibido' } });
  }

  try {
    const contenido = await readFile(destino);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(destino).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(contenido);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
}

createServer(async (req, res) => {
  if (req.url.split('?')[0] === '/api/messages') {
    if (req.method !== 'POST') {
      return json(res, 405, { error: { message: 'Usa POST' } });
    }
    return proxyMensajes(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, { error: { message: 'Método no permitido' } });
  }
  return servirEstatico(req, res);
}).listen(PORT, () => {
  console.log(`\n  Vantly en http://localhost:${PORT}\n  Ctrl+C para parar.\n`);
});
