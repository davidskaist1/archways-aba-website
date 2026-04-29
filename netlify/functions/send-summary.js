// ── Send conversation summary to intake team + confirmation to parent ─────────

// ── Microsoft Graph: get OAuth2 token ────────────────────────────────────────
async function getGraphToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET,
        scope:         'https://graph.microsoft.com/.default',
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error('Graph token error: ' + JSON.stringify(data));
  return data.access_token;
}

// ── Send confirmation email to parent via Outlook / Graph API ─────────────────
async function sendParentConfirmation(parentName, parentEmail) {
  const token       = await getGraphToken();
  const sender      = process.env.MS_SENDER_EMAIL; // e.g. info@archwaysaba.com
  const firstName   = (parentName || '').split(' ')[0] || 'there';

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d4f63 0%,#1b7a96 100%);padding:36px 40px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Archways ABA</p>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:0.08em;text-transform:uppercase;">Missouri ABA Therapy</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1a2e3a;">Hi ${firstName},</p>

              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
                Thank you for taking the time to chat with us today — I'm really glad you reached out.
              </p>

              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
                We're excited to learn more about your child and see how we can best support your family.
                As a next step, we'll be reaching out shortly to connect with you directly and get a better
                understanding of your child's needs, goals, and what you're looking for in services.
              </p>

              <!-- WHAT WE NEED BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#f0f7ff;border-left:4px solid #1b7a96;border-radius:0 8px 8px 0;padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#0d4f63;">
                      In the meantime, it would be very helpful if you could send us the following when you have a moment:
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;vertical-align:top;">
                          <span style="color:#1b7a96;font-weight:700;margin-right:8px;">&#10003;</span>
                        </td>
                        <td style="padding:4px 0;font-size:15px;color:#374151;line-height:1.6;">
                          A copy of your child's insurance card
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;vertical-align:top;">
                          <span style="color:#1b7a96;font-weight:700;margin-right:8px;">&#10003;</span>
                        </td>
                        <td style="padding:4px 0;font-size:15px;color:#374151;line-height:1.6;">
                          A copy of your child's diagnosis (if available)
                        </td>
                      </tr>
                    </table>
                    <p style="margin:14px 0 0;font-size:14px;color:#6b7280;">
                      You can simply reply to this email with those documents attached.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
                If you have any questions at all in the meantime, feel free to respond here — I'm happy to help.
              </p>

              <p style="margin:0 0 4px;font-size:16px;color:#374151;line-height:1.7;">
                Looking forward to speaking with you soon.
              </p>

              <p style="margin:24px 0 0;font-size:16px;color:#374151;">Warmly,</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#0d4f63;">The Archways ABA Intake Team</p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">
                <a href="tel:+13146682866" style="color:#1b7a96;text-decoration:none;">(314) 668-2866</a>
                &nbsp;·&nbsp;
                <a href="mailto:info@archwaysaba.com" style="color:#1b7a96;text-decoration:none;">info@archwaysaba.com</a>
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">
                Archways ABA · Serving all of Missouri · ABA Therapy for Children with Autism
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await fetch(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: 'Thank you for reaching out to Archways ABA',
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients: [{ emailAddress: { address: parentEmail } }],
      },
      saveToSentItems: true,
    }),
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: cors, body: '' };

  try {
    const { messages, reason } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages)) return { statusCode: 400, headers: cors, body: '{"error":"Invalid"}' };

    const reasonLabel = reason === 'timeout' ? 'Timed Out (10 min inactivity)'
                      : reason === 'user'    ? 'User Ended Conversation'
                      : reason === 'ai'      ? 'AI Completed Intake'
                      : 'Conversation Ended';

    const transcript = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'PARENT' : 'MAYA'}: ${m.content}`)
      .join('\n\n');

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── 1. Extract full intake summary (for admin email) ──────────────────────
    let extractedInfo = 'Could not extract info';
    let parentName    = null;
    let parentEmail   = null;

    if (apiKey) {
      const [summaryRes, contactRes] = await Promise.all([

        // Full intake summary
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type':    'application/json',
            'x-api-key':       apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      'claude-haiku-4-5-20251001',
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: `From this chatbot conversation, extract the following. If not mentioned write "Not provided".

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
Notes:`,
            }],
          }),
        }),

        // Focused name + email extraction (JSON)
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type':    'application/json',
            'x-api-key':       apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      'claude-haiku-4-5-20251001',
            max_tokens: 80,
            messages: [{
              role: 'user',
              content: `From the conversation below, extract ONLY the parent's full name and email address. Return ONLY valid JSON with keys "name" and "email". Use null if not found.

CONVERSATION:
${transcript}`,
            }],
          }),
        }),

      ]);

      if (summaryRes.ok) {
        const d = await summaryRes.json();
        extractedInfo = d.content?.[0]?.text || extractedInfo;
      }

      if (contactRes.ok) {
        const d = await contactRes.json();
        try {
          const raw  = d.content?.[0]?.text || '';
          // Strip any markdown code fences if present
          const json = raw.replace(/```json|```/g, '').trim();
          const obj  = JSON.parse(json);
          parentName  = obj.name  || null;
          parentEmail = obj.email || null;
        } catch (e) { /* extraction failed — skip confirmation email */ }
      }
    }

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    // ── 2. Send intake summary to admin via Formspree ────────────────────────
    const formspreeId = process.env.FORMSPREE_CONTACT_ID || 'mpqyvdya';
    await fetch(`https://formspree.io/f/${formspreeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject:        `🤖 Maya Chat Lead — ${reasonLabel} — ${timestamp}`,
        source:          'Website Chatbot (Maya)',
        end_reason:      reasonLabel,
        time:            timestamp,
        parent_email:    parentEmail || 'Not captured',
        intake_summary:  extractedInfo,
        full_transcript: transcript,
      }),
    });

    // ── 3. Send confirmation email to parent via Outlook (Graph API) ──────────
    if (
      parentEmail &&
      process.env.MS_TENANT_ID &&
      process.env.MS_CLIENT_ID &&
      process.env.MS_CLIENT_SECRET &&
      process.env.MS_SENDER_EMAIL
    ) {
      try {
        await sendParentConfirmation(parentName, parentEmail);
      } catch (emailErr) {
        // Log but don't fail the whole request if confirmation email fails
        console.error('Parent confirmation email failed:', emailErr);
      }
    }

    return { statusCode: 200, headers: cors, body: '{"success":true}' };

  } catch (err) {
    console.error('send-summary error:', err);
    return { statusCode: 500, headers: cors, body: '{"error":"Failed"}' };
  }
};
