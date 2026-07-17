require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

async function webSearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 4,
    }),
  });
  const data = await res.json();
  return (data.results || [])
    .map(r => `${r.title}: ${r.content}`)
    .join('\n\n');
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'বর্তমান/সাম্প্রতিক তথ্য, খবর, বা এমন কিছু জানতে ব্যবহার করো যা তোমার ট্রেনিং ডেটার পরে ঘটেছে',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'সার্চ করার বিষয়' },
        },
        required: ['query'],
      },
    },
  },
];

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'মেসেজ পাঠাতে হবে' });

    let messages = [
      {
        role: 'system',
        content: `আজকের তারিখ: ${new Date().toDateString()}। তোমার ট্রেনিং ডেটা পুরনো এবং তুমি সাম্প্রতিক ঘটনা, প্রধানমন্ত্রী/প্রেসিডেন্ট/সরকার প্রধান, নির্বাচনের ফলাফল, বা যেকোনো সময়-সংবেদনশীল তথ্য সম্পর্কে ভুল জানতে পারো। এই ধরনের যেকোনো প্রশ্নে নিজের স্মৃতি থেকে উত্তর দেওয়ার আগে অবশ্যই web_search টুল কল করে যাচাই করো, তুমি "নিশ্চিত" থাকলেও।`,
      },
      ...(history || []),
      { role: 'user', content: message },
    ];

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools,
      }),
    });
    let data = await response.json();

    if (data.error) return res.status(500).json({ error: data.error.message });

    const choice = data.choices[0];

    if (choice.finish_reason === 'tool_calls') {
      const toolCall = choice.message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      const searchResults = await webSearch(args.query);

      messages.push(choice.message);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: searchResults,
      });

      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
        }),
      });
      data = await response.json();
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
