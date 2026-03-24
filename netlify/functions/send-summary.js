const Anthropic = require('@anthropic-ai/sdk');

// ─── Handler ─────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: '' };
  }

  try {
    const { messages } = JSON.parse(event.body || '{}');
    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid messages' }) };
    }

    // ── Use Claude Haiku to extract structured intake info ──────────────────
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const transcript = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'PARENT' : 'MAYA'}: ${m.content}`)
      .join('\n\n');

    const extractionResponse = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `From this chatbot conversation between a parent and Maya (an intake specialist at Archways ABA), extract the following information and format it EXACTLY as shown below. If something wasn't mentioned, write "Not provided".

CONVERSATION:
${transcript}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Parent Name: [name]
Child Name: [name]
Child Age: [age]
Diagnosis Status: [diagnosed with autism / suspected autism / not mentioned]
Main Concerns: [list their concerns]
Current Services: [any current therapies/services]
Insurance: [Medicaid/MO HealthNet / private insurance / self-pay / not mentioned]
Location: [city/area in Missouri]
Contact Info: [phone and/or email provided]
Urgency/Notes: [any urgency signals or important notes from the conversation]`,
      }],
    });

    const extractedInfo = extractionResponse.content[0]?.text || 'Could not extract info';

    // ── Format the full email body ──────────────────────────────────────────
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailBody = `
NEW CHATBOT LEAD — ARCHWAYS ABA
================================
Source: AI Chatbot (Maya)
Time: ${timestamp} CT

── INTAKE SUMMARY ──────────────────
${extractedInfo}

── FULL CONVERSATION TRANSCRIPT ────
${transcript}

────────────────────────────────────
This lead was generated via the Archways ABA website chatbot.
Follow up within 1 business day as promised.
    `.trim();

    // ── Send via Formspree ──────────────────────────────────────────────────
    const formspreeId = process.env.FORMSPREE_CONTACT_ID || 'mpqyvdya';

    const formspreeRes = await fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        _subject: `🤖 New Chatbot Lead — ${timestamp}`,
        source: 'AI Chatbot (Maya)',
        intake_summary: extractedInfo,
        full_transcript: transcript,
        timestamp: timestamp,
        _message: emailBody,
      }),
    });

    if (!formspreeRes.ok) {
      const errText = await formspreeRes.text();
      console.error('Formspree error:', errText);
      throw new Error(`Formspree responded with ${formspreeRes.status}`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    console.error('Send-summary error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to send summary' }),
    };
  }
};
