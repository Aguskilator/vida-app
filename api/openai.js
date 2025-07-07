// /api/openai.js
// Vercel Serverless Function para proxy seguro a OpenAI

export const config = {
  api: {
    bodyParser: false, // Usamos bodyParser manual para máxima compatibilidad
  },
};

import { Readable } from 'stream';
import fetch from 'node-fetch'; // <-- Importa node-fetch para entornos Node.js

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta la API key de OpenAI en el servidor.' });
    return;
  }

  let payload;
  try {
    const rawBody = await buffer(req);
    payload = JSON.parse(rawBody);
  } catch (e) {
    res.status(400).json({ error: 'JSON inválido en el body.' });
    return;
  }

  // Determina si es chat o prompt simple
  let openaiPayload;
  if (Array.isArray(payload.prompt)) {
    openaiPayload = {
      model: 'gpt-3.5-turbo',
      messages: payload.prompt,
      temperature: 0.7,
      max_tokens: 700
    };
  } else if (typeof payload.prompt === 'string') {
    openaiPayload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '' },
        { role: 'user', content: payload.prompt }
      ],
      temperature: 0.7,
      max_tokens: 700
    };
  } else {
    res.status(400).json({ error: 'Formato de prompt no soportado.' });
    return;
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(openaiPayload)
    });
    const data = await openaiRes.json();
    if (!openaiRes.ok) {
      console.error('Error OpenAI:', data);
      res.status(openaiRes.status).json({ error: data.error?.message || 'Error de OpenAI' });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('Error conectando con OpenAI:', err);
    res.status(500).json({ error: 'Error al conectar con OpenAI.' });
  }
}
