require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'মেসেজ পাঠাতে হবে' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'উত্তর সবসময় সুন্দরভাবে গুছিয়ে দাও — প্রয়োজনে হেডিং, বুলেট পয়েন্ট/লিস্ট, বোল্ড টেক্সট ব্যবহার করে Markdown ফরম্যাটে লেখো, যাতে পড়তে সহজ ও প্রফেশনাল লাগে। শুধু ছোট উত্তরের ক্ষেত্রে সাধারণ প্যারাগ্রাফ যথেষ্ট।' },
          ...(history || []),
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('API Error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.choices?.[0]?.message?.content || 'কোনো উত্তর পাওয়া যায়নি';

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
