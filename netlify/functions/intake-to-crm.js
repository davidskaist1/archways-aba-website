// intake-to-crm.js
// Receives contact form submissions → inserts into Supabase CRM → forwards to Formspree

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const FORMSPREE_ID = process.env.FORMSPREE_CONTACT_ID || 'mpqyvdya'

function parseChildAge(ageStr) {
  if (!ageStr) return null
  const match = ageStr.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

function parseServiceType(val) {
  if (!val) return null
  if (val.includes('In-Home')) return 'in-home'
  if (val.includes('Center')) return 'center-based'
  if (val.includes('Telehealth')) return 'telehealth'
  if (val.includes('Parent')) return 'parent-training'
  return null
}

function parseChildName(fullName) {
  if (!fullName) return { first: '', last: '' }
  const parts = fullName.trim().split(/\s+/)
  return {
    first: parts[0] ?? '',
    last: parts.slice(1).join(' ') ?? '',
  }
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '' }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      parent_name, child_name, email, phone,
      child_age, county, insurance, service_type,
      diagnosis, message, referral_source,
    } = body

    const { first, last } = parseChildName(child_name)

    // 1. Insert into Supabase
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          guardian_name: parent_name ?? '',
          child_first_name: first,
          child_last_name: last,
          guardian_email: email ?? null,
          guardian_phone: phone ?? null,
          child_age: parseChildAge(child_age),
          county: county ?? null,
          primary_insurance: insurance ?? null,
          service_type: parseServiceType(service_type),
          diagnosis: diagnosis ?? null,
          initial_notes: message ?? null,
          referral_source: referral_source ?? null,
          status: 'inquiry',
          primary_stage: 'new_inquiry',
          active_stages: ['new_inquiry'],
          intake_form_source: 'Website Form',
          state: 'MO',
        }),
      })
    }

    // 2. Forward to Formspree for email notification
    await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `New Intake Request — ${child_name ?? 'Unknown'} (${parent_name ?? ''})`,
        parent_name, child_name, email, phone,
        child_age, county, insurance, service_type,
        diagnosis, message, referral_source,
        source: 'Website Contact Form',
      }),
    })

    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error('intake-to-crm error:', err)
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Submission failed' }) }
  }
}
