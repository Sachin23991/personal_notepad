module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get the secure API key from Vercel's Environment Variables
  const API_KEY = process.env.OPENROUTER_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not set in environment" });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://personal-notepad-beryl.vercel.app', // Required by OpenRouter
        'X-Title': 'NoteFlow',
      },
      // Pass the frontend request body directly to OpenRouter
      body: JSON.stringify(req.body)
    });

    // Parse OpenRouter's response and send it back to the frontend
    const data = await response.json();
    res.status(response.status).json(data);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
