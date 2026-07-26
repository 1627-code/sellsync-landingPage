function text(v) {
  return (v === undefined || v === null) ? '' : String(v);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ reply: 'Method not allowed.' });
    return;
  }

  const message = text(req.body && req.body.message).trim();
  if (!message) {
    res.status(400).json({ reply: 'Please provide a message.' });
    return;
  }

  const apiKey = (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    res.status(503).json({ reply: 'AI assistant is currently unavailable (missing API key).' });
    return;
  }

  const baseUrl = text(process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = (process.env.AI_MODEL || 'gpt-4o-mini').trim();

  const systemPrompt = [
    'You are the official AI assistant for SellSync.',
    'SellSync is a sales and inventory management platform for retail businesses.',
    'Only answer questions about SellSync: its features, pricing, signup/login help, onboarding, inventory, sales, analytics, multi-store, and support.',
    'If the user asks about anything unrelated, politely refuse and steer them back to SellSync.',
    'Keep answers short, clear, and helpful.'
  ].join('\n');

  try {
    const r = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.4,
        max_tokens: 220
      })
    });

    const data = await r.json().catch(() => ({}));
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? String(data.choices[0].message.content).trim()
      : '';

    if (!r.ok || !reply) {
      res.status(502).json({ reply: 'AI assistant is currently unavailable. Please try again.' });
      return;
    }

    res.status(200).json({ reply });
  } catch (e) {
    res.status(502).json({ reply: 'AI assistant is currently unavailable. Please try again.' });
  }
}

