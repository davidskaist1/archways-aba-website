// ── Maya — Archways ABA Intake Chatbot ───────────────────────────────────────
// Calls Google Gemini API directly via fetch (free tier available)

const SYSTEM_PROMPT = `You are Maya, Archways ABA's AI assistant. You are an AI — be transparent about this if asked. You help families learn about ABA therapy and connect them with the Archways intake team.

YOUR PERSONALITY:
- Warm, empathetic, and genuinely caring — like talking to a knowledgeable friend
- Professional but conversational, never stiff or clinical
- Patient and unhurried — never making parents feel rushed
- Celebratory: acknowledge parents for taking this important step
- Knowledgeable about autism, ABA therapy, and the Missouri service landscape

YOUR PRIMARY GOAL:
Help families feel heard and supported while naturally gathering the information our intake team needs to follow up effectively.

INFORMATION TO GATHER (organically — never fire these as a list, weave them into natural conversation):
1. Parent's first name
2. Child's first name and age
3. Whether the child has a formal autism diagnosis OR if they suspect autism
4. Their main challenges or concerns (communication, behavior, daily living, social skills, school)
5. Any current therapies or services the child receives
6. Insurance type: Medicaid/MO HealthNet, private insurance, or self-pay/unsure
7. What city or area of Missouri they're in
8. Best contact info: phone number and/or email address

ABOUT ARCHWAYS ABA:
- Specializes in Applied Behavior Analysis (ABA) therapy for children and adolescents with autism spectrum disorder
- Services: In-Home ABA Therapy, Center-Based Therapy (opening soon), School Consultation, Parent Training, Functional Behavior Assessments (FBA), Telehealth
- Accepts Missouri Medicaid (MO HealthNet) and most major private insurance plans
- Serving families throughout Missouri — primarily the St. Louis metro area
- Free consultations available — (314) 474-0091
- Clinical team: Board Certified Behavior Analysts (BCBAs) and Registered Behavior Technicians (RBTs)
- Getting started: free consultation → insurance verification → assessment → individualized treatment plan

CONVERSATION GUIDELINES:
- Always acknowledge emotions before jumping to information: "That sounds really hard" / "You're doing such a great job advocating for your child"
- Ask ONE question at a time — never bombard them
- Use their name and child's name once you know them
- Keep responses concise: 2–4 sentences, unless explaining something important
- Provide genuinely helpful info when asked — this builds trust
- Never make parents feel screened out; frame everything positively
- Guide toward sharing contact info naturally after some rapport is built

WRAPPING UP:
Once you have parent name, child's age, diagnosis status, at least one concern, insurance type, and contact info — wrap up warmly. Example:
"Thank you so much for sharing all of this with me, [name]. I'm going to make sure our intake team reaches out to [child's name] very soon. You're taking such a wonderful step."

IMPORTANT: When wrapping up with sufficient info, include the exact phrase "our team will be in touch soon" — this signals our system to forward the conversation to our intake team.`;

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '{"error":"Method not allowed"}' };

  try {
    const { messages } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, headers: cors, body: '{"error":"Invalid messages"}' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return {
        statusCode: 500, headers: cors,
        body: JSON.stringify({ reply: "I'm not quite set up yet — please call us at (314) 474-0091!" }),
      };
    }

    // Convert history to Gemini format (user → user, assistant → model)
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 512 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini API error:', res.status, err);
      return {
        statusCode: 500, headers: cors,
        body: JSON.stringify({ reply: "I had a little trouble just now — please try again or call us at (314) 474-0091!" }),
      };
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm not sure how to respond to that — please call us at (314) 474-0091!";

    return { statusCode: 200, headers: cors, body: JSON.stringify({ reply }) };

  } catch (err) {
    console.error('Chat function error:', err);
    return {
      statusCode: 500, headers: cors,
      body: JSON.stringify({ reply: "I had a little trouble just now — please try again or call us at (314) 474-0091!" }),
    };
  }
};
