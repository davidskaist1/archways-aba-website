/**
 * Archways ABA — Maya Chatbot Widget
 * Connects to Netlify Functions backend (/.netlify/functions/chat)
 * Stateless: full conversation history sent with each request
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────
  const CHAT_URL    = '/.netlify/functions/chat';
  const SUMMARY_URL = '/.netlify/functions/send-summary';

  // Hardcoded greeting — shows instantly, no API call on first open
  const GREETING = "Hi there! 👋 I'm Maya, Archways ABA's AI assistant. I'm here to answer your questions and help connect your family with our team. Whether you're just starting to wonder about your child's development or you're ready to get started with ABA therapy — what's on your mind today?";

  // ── State ────────────────────────────────────────────────────────────
  let history    = []; // [{role:'user'|'assistant', content:'...'}]
  let isWaiting  = false;
  let isEnded    = false;
  let isOpen     = false;
  let greeted    = false;

  // Intake progress tracking (regex matches on user messages)
  const intakeSignals = [
    /\b(name|i'?m|i am|my name|this is)\b/i,
    /\b\d+\s*(year|yr|month|mo)s?(\s+old)?\b/i,
    /\b(autism|asd|diagnosis|diagnosed|behavior|development)\b/i,
    /\b(missouri|mo\b|st\.?\s*louis|kansas\s*city|springfield|county|city)\b/i,
    /\b(medicaid|insurance|bcbs|blue\s*cross|aetna|cigna|humana|united)\b/i,
    /\b(\d{3}[\-\s]\d{3}[\-\s]\d{4}|\(\d{3}\)\s*\d{3}[\-\s]\d{4})\b/,
    /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/,
  ];
  let intakeScore = 0;

  // ── Build DOM ────────────────────────────────────────────────────────
  function buildWidget() {
    const archSvg = `<svg width="22" height="22" viewBox="0 0 56 62" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M 3,62 C 3,18 16,2 28,2 C 40,2 53,18 53,62 L 45,62 C 45,24 32,8 28,8 C 24,8 11,24 11,62 Z" fill="white" opacity="0.9"/>
    </svg>`;

    const sendSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>`;

    const closeSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;

    const container = document.createElement('div');
    container.id = 'archways-chat-widget';
    container.innerHTML = `
      <button id="archways-chat-btn" aria-label="Chat with Maya, our intake specialist" aria-expanded="false" aria-controls="archways-chat-window">
        <span class="chat-dot" aria-hidden="true"></span>
        <div class="btn-icon">${archSvg}</div>
        <div class="btn-text">
          <span class="btn-name">Chat with Maya</span>
          <span class="btn-sub">Usually replies instantly</span>
        </div>
      </button>

      <div id="archways-chat-window" role="dialog" aria-labelledby="archways-chat-name" aria-modal="false" hidden>

        <div id="archways-chat-header">
          <div class="hdr-avatar">${archSvg}</div>
          <div class="hdr-info">
            <div class="hdr-name" id="archways-chat-name">Maya · Archways ABA</div>
            <div class="hdr-status">
              <span class="hdr-status-dot" aria-hidden="true"></span>
              <span>Here to help · Responds instantly</span>
            </div>
          </div>
          <button id="archways-chat-close" aria-label="Close chat">${closeSvg}</button>
        </div>

        <div id="archways-progress-bar" title="Intake progress" aria-hidden="true">
          <div id="archways-progress-fill"></div>
        </div>

        <div id="archways-chat-messages" role="log" aria-live="polite" aria-label="Conversation with Maya"></div>

        <div id="archways-ended-banner" role="status" hidden>
          ✅ Our team will be in touch within 1 business day!<br>
          Need immediate help? <a href="tel:+13144740091">(314) 474-0091</a>
        </div>

        <div id="archways-chat-input-area">
          <div id="archways-input-row">
            <textarea
              id="archways-chat-input"
              placeholder="Type a message…"
              rows="1"
              aria-label="Message to Maya"
              maxlength="1000"
            ></textarea>
            <button id="archways-chat-send" aria-label="Send message" disabled>${sendSvg}</button>
          </div>
          <button id="archways-end-btn">End conversation &amp; notify our team</button>
        </div>

      </div>
    `;

    document.body.appendChild(container);
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function escHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function linkify(text) {
    return text
      .replace(/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/g,
        '<a href="tel:$1" style="color:#1B698C;font-weight:600;">$1</a>')
      .replace(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
        '<a href="mailto:$1" style="color:#1B698C;font-weight:600;">$1</a>');
  }

  function appendMessage(role, text) {
    const container = $('archways-chat-messages');
    const wrapper = document.createElement('div');
    wrapper.className = 'aria-msg aria-msg--' + (role === 'bot' ? 'bot' : 'user');
    wrapper.style.animation = 'aria-msg-in 0.22s ease';

    if (role === 'bot') {
      wrapper.innerHTML =
        '<div class="aria-msg-icon" aria-hidden="true">🌿</div>' +
        '<div class="aria-bubble">' +
          linkify(escHtml(text).replace(/\n/g, '<br>')) +
        '</div>';
    } else {
      wrapper.innerHTML =
        '<div class="aria-bubble">' + escHtml(text).replace(/\n/g, '<br>') + '</div>';
      updateProgress(text);
    }

    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    removeTyping();
    const el = document.createElement('div');
    el.className = 'aria-msg aria-msg--bot';
    el.id = 'archways-typing-dot';
    el.setAttribute('aria-label', 'Maya is typing');
    el.innerHTML =
      '<div class="aria-msg-icon" aria-hidden="true">🌿</div>' +
      '<div class="aria-typing"><span></span><span></span><span></span></div>';
    const container = $('archways-chat-messages');
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    const el = $('archways-typing-dot');
    if (el) el.remove();
  }

  function setWaiting(val) {
    isWaiting = val;
    const input = $('archways-chat-input');
    const send  = $('archways-chat-send');
    if (input) input.disabled = val || isEnded;
    if (send)  send.disabled  = val || !input?.value.trim() || isEnded;
  }

  function updateProgress(text) {
    const matched = intakeSignals.filter(re => re.test(text)).length;
    intakeScore = Math.min(100, intakeScore + matched * 15);
    const fill = $('archways-progress-fill');
    if (fill) fill.style.width = intakeScore + '%';
  }

  // ── Open / Close ─────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    const win = $('archways-chat-window');
    const btn = $('archways-chat-btn');
    if (win) { win.hidden = false; }
    if (btn) {
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('is-open');
      $('archways-chat-widget').classList.add('is-open');
    }

    if (!greeted) {
      greeted = true;
      // Show greeting after a brief pause — no typing indicator before user has said anything
      setTimeout(() => {
        appendMessage('bot', GREETING);
        // NOTE: greeting is display-only — NOT added to history.
        // Anthropic API requires the first message to be role:'user'.
        const input = $('archways-chat-input');
        if (input) { input.disabled = false; input.focus(); }
      }, 350);
    } else {
      const input = $('archways-chat-input');
      if (input) input.focus();
    }
  }

  function closeChat() {
    isOpen = false;
    const win = $('archways-chat-window');
    const btn = $('archways-chat-btn');
    if (win) { win.hidden = true; }
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-open');
      $('archways-chat-widget').classList.remove('is-open');
      btn.focus();
    }
  }

  // ── Send a message ───────────────────────────────────────────────────
  async function sendMessage() {
    const input = $('archways-chat-input');
    const text = input?.value.trim();
    if (!text || isWaiting || isEnded) return;

    input.value = '';
    input.style.height = 'auto';
    $('archways-chat-send').disabled = true;

    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    setWaiting(true);
    showTyping();

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      removeTyping();

      const reply = data.reply || "I'm sorry, I had trouble connecting. Please try again or call us at (314) 474-0091.";
      appendMessage('bot', reply);
      history.push({ role: 'assistant', content: reply });

      // Detect conversation completion signal
      if (reply.toLowerCase().includes('our team will be in touch soon')) {
        await endConversation(true);
      }

    } catch (err) {
      removeTyping();
      const errMsg = "I had trouble connecting just now. Please try again, or call us directly at (314) 474-0091!";
      appendMessage('bot', errMsg);
      history.push({ role: 'assistant', content: errMsg });
    }

    setWaiting(false);
  }

  // ── End conversation ─────────────────────────────────────────────────
  async function endConversation(auto = false) {
    if (isEnded) return;
    isEnded = true;

    if (!auto) {
      appendMessage('bot', "Thank you so much for chatting with me! I'm sending your information to our intake team right now. Someone will reach out within 1 business day. You can also call us anytime at (314) 474-0091. Take care! 💙");
    }

    // Disable input
    const inputArea = $('archways-chat-input-area');
    const endBtn    = $('archways-end-btn');
    if (inputArea) { inputArea.style.opacity = '0.45'; inputArea.style.pointerEvents = 'none'; }
    if (endBtn)    endBtn.style.display = 'none';

    const banner = $('archways-ended-banner');
    if (banner) {
      setTimeout(() => { banner.hidden = false; }, 600);
    }

    const fill = $('archways-progress-fill');
    if (fill) fill.style.width = '100%';

    // Send summary to intake team
    try {
      await fetch(SUMMARY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
    } catch (err) {
      console.warn('Maya: summary send failed', err);
    }
  }

  // ── Events ───────────────────────────────────────────────────────────
  function bindEvents() {
    $('archways-chat-btn').addEventListener('click',  () => isOpen ? closeChat() : openChat());
    $('archways-chat-close').addEventListener('click', closeChat);
    $('archways-chat-send').addEventListener('click',  sendMessage);

    $('archways-end-btn').addEventListener('click', () => {
      if (confirm('End this conversation and notify our team? They will follow up within 1 business day.')) {
        endConversation(false);
      }
    });

    const input = $('archways-chat-input');
    input.addEventListener('input', function () {
      $('archways-chat-send').disabled = !this.value.trim() || isWaiting || isEnded;
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) closeChat();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────
  function init() {
    buildWidget();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
