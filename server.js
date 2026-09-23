require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ROOT = __dirname;
const ALLOWED_TOPICS = new Set([
  'Memoria y aprendizaje',
  'Emociones y regulación emocional',
  'Atención y percepción',
  'Psicología social',
  'Sueño y bienestar'
]);

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://generativelanguage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

function sendJson(response, status, payload) {
  response.writeHead(status, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) {
        reject(new Error('La petición es demasiado grande.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function generateQuestion(topic) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `Crea una pregunta educativa de opción múltiple sobre ${topic}. Usa Google Search para basarte en información fiable y actual. Devuelve SOLO JSON válido, sin markdown, con esta forma exacta: {"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}. correctIndex debe ser un número entre 0 y 3. La explicación debe enseñar el concepto en español, no diagnosticar ni dar consejo clínico.` }]
      }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gemini rechazó la solicitud.');
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('Gemini no devolvió una pregunta.');

  let question;
  try {
    question = JSON.parse(text);
  } catch {
    question = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  }
  if (!question.question || !Array.isArray(question.options) || question.options.length !== 4 || !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
    throw new Error('La respuesta de Gemini no tiene el formato esperado.');
  }

  const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = chunks.map((chunk) => chunk.web).filter((source) => source?.uri).slice(0, 5);
  return { question, sources };
}

async function handleApi(request, response) {
  if (!GEMINI_API_KEY) {
    sendJson(response, 500, { error: 'Falta GEMINI_API_KEY en el archivo .env del servidor.' });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    if (!ALLOWED_TOPICS.has(body.topic)) {
      sendJson(response, 400, { error: 'El tema seleccionado no es válido.' });
      return;
    }
    sendJson(response, 200, await generateQuestion(body.topic));
  } catch (error) {
    console.error(error.message);
    sendJson(response, 502, { error: error.message || 'No se pudo generar la pregunta.' });
  }
}

function serveStatic(request, response, pathname) {
  const requestedPath = pathname === '/' ? '/cuestionario.html' : pathname;
  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(response, 404, { error: 'Página no encontrada.' });
    return;
  }

  const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  response.writeHead(200, { ...securityHeaders, 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/generate-question' && request.method === 'POST') {
    await handleApi(request, response);
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    sendJson(response, 404, { error: 'Endpoint no encontrado.' });
    return;
  }
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Método no permitido.' });
    return;
  }
  serveStatic(request, response, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Mente Clara disponible en http://localhost:${PORT}`);
});
