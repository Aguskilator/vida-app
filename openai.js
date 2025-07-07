// /api/openai.js
// Vercel Serverless Function para proxy seguro a OpenAI

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

  // Leer el body de la request de forma compatible con Vercel serverless
  let rawBody = '';
  await new Promise((resolve, reject) => {
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', resolve);
    req.on('error', reject);
  });

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    res.status(400).json({ error: 'JSON inválido en el body.', rawBody, parseError: e.message });
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
    res.status(400).json({ error: 'Formato de prompt no soportado.', payload });
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
      res.status(openaiRes.status).json({ error: data.error?.message || 'Error de OpenAI' });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error al conectar con OpenAI.' });
  }
}
