// server.js
// এই ফাইলটাই তোমার AI অ্যাপের "মস্তিষ্ক" - এখানে API key গোপন থাকে
// এবং ইউজারের মেসেজ AI provider-এর কাছে পাঠায়, উত্তর ফেরত দেয়

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// এখানে তোমার AI provider বেছে নাও (Gemini দিয়ে example)
// OpenAI বা Claude ব্যবহার করতে চাইলে নিচে comment-এ instruction আছে
// ============================================

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'মেসেজ পাঠাতে হবে' });
    }

    // Gemini API কল
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...(history || []).map(h => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }],
            })),
            { role: 'user', parts: [{ text: message }] },
          ],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('API Error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'কোনো উত্তর পাওয়া যায়নি';

    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server চলছে: http://localhost:${PORT}`);
});

/*
============================================
OpenAI (ChatGPT) ব্যবহার করতে চাইলে উপরের fetch অংশটা
এইটা দিয়ে replace করো:
============================================

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      ...(history || []),
      { role: 'user', content: message },
    ],
  }),
});
const data = await response.json();
const reply = data.choices?.[0]?.message?.content || 'কোনো উত্তর পাওয়া যায়নি';

============================================
Claude (Anthropic) ব্যবহার করতে চাইলে:
============================================

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [
      ...(history || []),
      { role: 'user', content: message },
    ],
  }),
});
const data = await response.json();
const reply = data.content?.[0]?.text || 'কোনো উত্তর পাওয়া যায়নি';
*/
