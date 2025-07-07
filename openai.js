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

  // Detectar el tipo de request
  const { historial, mensaje, messages, model, prompt } = req.body;

  let finalMessages = [];

  // Caso 1: Quiz o llamada directa con messages array
  if (Array.isArray(messages)) {
    finalMessages = messages;
  }
  // Caso 2: Llamada del orquestador con historial y mensaje
  else if (historial || mensaje) {
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

    finalMessages = [
      { role: 'system', content: systemPrompt }
    ];
    if (Array.isArray(historial)) {
      finalMessages = finalMessages.concat(historial);
    }
    if (mensaje) {
      finalMessages.push({ role: 'user', content: mensaje });
    }
  }
  // Caso 3: Formato legacy con prompt array
  else if (Array.isArray(prompt)) {
    finalMessages = prompt;
  }
  else {
    res.status(400).json({ error: 'Formato de request inválido. Se requiere messages, historial+mensaje, o prompt.' });
    return;
  }

  const openaiPayload = {
    model: model || 'gpt-3.5-turbo',
    messages: finalMessages,
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
