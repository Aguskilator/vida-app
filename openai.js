// /api/openai.js
// Vercel/Next.js Serverless Function para proxy seguro a OpenAI

export const config = {
  api: {
    bodyParser: true, // Asegura que req.body esté disponible
  },
};

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

  // --- NUEVA LÓGICA DE ORQUESTADOR ---
  // Espera: { historial: [...], mensaje: 'texto' } para chat
  // O: { messages: [...] } para quiz directo
  // O: { prompt: [...] } para compatibilidad con index.html
  const { historial, mensaje, messages: directMessages, prompt, model } = req.body;

  console.log('API Request received:', { 
    method: req.method, 
    hasMessages: !!directMessages,
    hasHistorial: !!historial,
    hasPrompt: !!prompt,
    hasApiKey: !!apiKey,
    bodyKeys: Object.keys(req.body)
  });

  // Si viene con 'prompt', es el formato usado por index.html
  if (prompt && Array.isArray(prompt)) {
    console.log('Processing prompt messages (index.html format)...');
    const openaiPayload = {
      model: model || 'gpt-3.5-turbo',
      messages: prompt,
      temperature: 0.7,
      max_tokens: 1000
    };

    console.log('Sending to OpenAI:', JSON.stringify(openaiPayload, null, 2));

    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(openaiPayload)
      });
      
      console.log('OpenAI response status:', openaiRes.status);
      
      const data = await openaiRes.json();
      
      if (!openaiRes.ok) {
        console.error('OpenAI API Error:', data);
        res.status(openaiRes.status).json({ error: data.error?.message || 'Error de OpenAI', openaiError: data });
        return;
      }
      
      console.log('OpenAI success response received');
      res.status(200).json(data);
      return;
    } catch (err) {
      console.error('Network error:', err);
      res.status(500).json({ error: 'Error al conectar con OpenAI.', details: err.message });
      return;
    }
  }

  // Si viene con 'messages', es una llamada directa (como el quiz)
  if (directMessages && Array.isArray(directMessages)) {
    console.log('Processing direct messages for quiz...');
    const openaiPayload = {
      model: model || 'gpt-3.5-turbo',
      messages: directMessages,
      temperature: 0.7,
      max_tokens: 1000
    };

    console.log('Sending to OpenAI:', JSON.stringify(openaiPayload, null, 2));

    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(openaiPayload)
      });
      
      console.log('OpenAI response status:', openaiRes.status);
      
      const data = await openaiRes.json();
      
      if (!openaiRes.ok) {
        console.error('OpenAI API Error:', data);
        res.status(openaiRes.status).json({ error: data.error?.message || 'Error de OpenAI', openaiError: data });
        return;
      }
      
      console.log('OpenAI success response received');
      res.status(200).json(data);
      return;
    } catch (err) {
      console.error('Network error:', err);
      res.status(500).json({ error: 'Error al conectar con OpenAI.', details: err.message });
      return;
    }
  }

  // Si no tiene messages directos ni prompt, verifica si es el formato del chat
  if (!historial && !mensaje) {
    console.error('Invalid request format. Missing messages, historial, or mensaje.');
    res.status(400).json({ 
      error: 'Formato de prompt no soportado.',
      payload: req.body,
      expected: 'Either { messages: [...] }, { prompt: [...] }, or { historial: [...], mensaje: "..." }'
    });
    return;
  }

  // Prompt del sistema para orquestador
  const systemPrompt = `
Eres VIDA, un asistente virtual experto en donación de órganos, tejidos y sangre en México. Analiza el historial de la conversación y el mensaje del usuario. Detecta la intención principal (por ejemplo: deseo de donar, indecisión, duelo, dudas familiares, etc.).

1. Responde SIEMPRE de forma empática, cálida y natural, siguiendo las reglas de estilo y alcance temático del sistema.
2. Si detectas que corresponde activar un módulo especial (camino del donante, indecisión, duelo, etc.), indícalo al final de tu respuesta con un JSON en una línea, por ejemplo: { "activarModulo": "donorPath" } o { "activarModulo": "indecision" }.
3. Si no corresponde activar ningún módulo, responde solo el mensaje empático.
4. Nunca repitas la pregunta del usuario. No uses asteriscos ni viñetas. Usa listas numeradas o guiones si es necesario.
5. Si la pregunta está fuera de alcance, responde exactamente: "Lo siento, solo puedo ayudarte con preguntas sobre donación de órganos, tejidos o sangre."
6. Si el usuario pide más información, amplía la respuesta de forma clara y sencilla.

Recuerda: El JSON debe ir al final, en una sola línea, solo si corresponde activar un módulo. Si no, no incluyas nada extra.
`;

  // Construir el array de mensajes para OpenAI
  let messages = [
    { role: 'system', content: systemPrompt }
  ];
  if (Array.isArray(historial)) {
    messages = messages.concat(historial);
  }
  if (mensaje) {
    messages.push({ role: 'user', content: mensaje });
  }

  const openaiPayload = {
    model: model || 'gpt-3.5-turbo',
    messages,
    temperature: 0.7,
    max_tokens: 700
  };

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
      res.status(openaiRes.status).json({ error: data.error?.message || 'Error de OpenAI', openaiError: data });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error al conectar con OpenAI.', details: err.message });
  }
}
