// ── Send conversation summary to intake team via Formspree ───────────────────
// Uses Google Gemini API directly via fetch (free tier)

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '' };

  try {
    const { messages } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages)) return { statusCode: 400, headers: cors, body: '{"error":"Invalid"}' };

    const transcript = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'PARENT' : 'MAYA'}: ${m.content}`)
      .join('\n\n');

    // Use Gemini to extract structured intake info
    let extractedInfo = 'Could not extract info';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const extractRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `From this chatbot conversation, extract the following. If not mentioned write "Not provided".

CONVERSATION:
${transcript}

FORMAT:
Parent Name:
Child Name:
Child Age:
Diagnosis Status: [diagnosed / suspected / not mentioned]
Main Concerns:
Current Services:
Insurance:
Location in Missouri:
Contact Info:
Notes:` }],
            }],
            generationConfig: { maxOutputTokens: 600 },
          }),
        }
      );

      if (extractRes.ok) {
        const extractData = await extractRes.json();
        extractedInfo = extractData.candidates?.[0]?.content?.parts?.[0]?.text || extractedInfo;
      }
    }

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    // Send to Formspree
    const formspreeId = process.env.FORMSPREE_CONTACT_ID || 'mpqyvdya';
    await fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `🤖 New Chatbot Lead — ${timestamp}`,
        source: 'Website Chatbot (Maya)',
        time: timestamp,
        intake_summary: extractedInfo,
        full_transcript: transcript,
      }),
    });

    return { statusCode: 200, headers: cors, body: '{"success":true}' };

  } catch (err) {
    console.error('send-summary error:', err);
    return { statusCode: 500, headers: cors, body: '{"error":"Failed"}' };
  }
};
