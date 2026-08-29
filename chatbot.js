/**
 * GEENIX — AI Chatbot Widget  |  chatbot.js  v1.0
 * ─────────────────────────────────────────────────────────────────
 * Handles:
 *  • Floating chat trigger button with open/close states
 *  • Chat window rendering (header, messages, input)
 *  • Gemini API integration (gemini-2.0-flash)
 *  • Conversation memory within session
 *  • Typing indicators & auto-scroll
 *  • Quick-action suggestion chips
 *  • Keyboard support (Enter to send, Escape to close)
 *  • Simple markdown rendering for bot responses
 *  • API key obfuscation (Base64 split storage)
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   CHATBOT MODULE (IIFE)
   ══════════════════════════════════════════════════════════════════ */
;(() => {

  /* ── API Key (obfuscated — split Base64) ────────────────────────
     Not bulletproof, but prevents casual scraping from bots
     and search engines. For production, use a backend proxy.
     ──────────────────────────────────────────────────────────────── */
  const _p = [
    'QVEuQWI4',       // chunk 1
    'Uk42TFkz',       // chunk 2
    'UjJfVEY5',       // chunk 3
    'RnNqYXU0',       // chunk 4
    'T0YtZWg5',       // chunk 5
    'NW5aX2Ro',       // chunk 6
    'WkhrTDFB',       // chunk 7
    'bk9qbGc4',       // chunk 8
    'OHQ0TUE='        // chunk 9
  ];
  const _k = () => atob(_p.join(''));

  /* ── Constants ─────────────────────────────────────────────────── */
  const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
  const MAX_HISTORY = 20; // keep last N exchanges for context

  /* ── System Prompt ─────────────────────────────────────────────── */
  const SYSTEM_PROMPT = `You are the GEENIX AI Assistant — a friendly, knowledgeable, and professional virtual assistant for GEENIX, a web development and digital solutions agency.

ABOUT GEENIX:
- Tagline: "Innovate. Build. Elevate."
- GEENIX delivers precision-crafted web development, UI/UX design, SEO, and digital solutions that elevate brands.
- Modern, high-performance websites built for businesses and individuals.
- 50+ projects completed, 100% client satisfaction, 5+ years of experience.
- Website: https://www.geenix.live

SERVICES:
1. **Web Development** — Custom websites, web apps, and WordPress builds (React, Next.js, WordPress) architected for speed, scalability, and performance.
2. **Mobile Optimization** — Responsive, touch-optimised designs tested across Android, iOS, and every breakpoint for flawless cross-device UX (Responsive, PWA, Touch UX).
3. **UI/UX Design** — Clean, purposeful interfaces designed around real user journeys, prototyped in Figma and built pixel-perfect (Figma, Wireframes, Design Systems).
4. **SEO & Performance** — Core Web Vitals-focused builds, structured data, and speed optimisation that drives organic visibility and growth (Core Web Vitals, Schema, PageSpeed).

PORTFOLIO CATEGORIES:
- Business Websites (Branding, CMS, SEO)
- Personal Portfolios (React, Animation)
- Online Stores / E-Commerce (WooCommerce, Stripe)
- Landing Pages (CRO, Analytics)

PROCESS:
1. Discover — Understand client goals
2. Design — Prototype & iterate
3. Build — Performance-first code
4. Launch — Deploy & support

CONTACT:
- Email: hello@geenix.live
- Phone: +94 71 893 4434
- Response time: Within 24 hours

BEHAVIOR GUIDELINES:
- Be warm, professional, and helpful. Use a conversational tone.
- When visitors ask about services, provide detailed, relevant information and suggest how GEENIX can help their specific needs.
- Proactively suggest related services or ideas when appropriate.
- If asked about pricing, explain that projects are custom-quoted based on scope and invite them to get in touch for a free consultation.
- For topics outside GEENIX's scope, be helpful but guide them back to how GEENIX can assist with their digital needs.
- Keep responses concise but informative. Use bullet points and bold text for clarity when helpful.
- Never fabricate information about GEENIX. Stick to the facts provided above.
- If you are unsure about something specific to GEENIX, suggest the visitor contact GEENIX directly.
- You may discuss general web development, design trends, and digital marketing topics to help visitors explore ideas.`;

  /* ── State ──────────────────────────────────────────────────────── */
  let isOpen = false;
  let isLoading = false;
  let conversationHistory = [];
  let elements = {};

  /* ══════════════════════════════════════════════════════════════════
     INIT — Build UI & Attach Events
     ══════════════════════════════════════════════════════════════════ */
  function init() {
    buildUI();
    attachEvents();

    // Show the trigger button after a brief delay (let page load settle)
    setTimeout(() => {
      elements.trigger.classList.add('show');
    }, 1500);
  }

  /* ══════════════════════════════════════════════════════════════════
     BUILD UI
     ══════════════════════════════════════════════════════════════════ */
  function buildUI() {
    // — Trigger button —
    const trigger = document.createElement('button');
    trigger.className = 'chatbot-trigger';
    trigger.id = 'chatbot-trigger';
    trigger.setAttribute('type', 'button');
    trigger.setAttribute('aria-label', 'Open AI chat assistant');
    trigger.setAttribute('title', 'Chat with GEENIX AI');
    trigger.innerHTML = `
      <i class="fas fa-comments cb-icon-chat" aria-hidden="true"></i>
      <i class="fas fa-xmark cb-icon-close" aria-hidden="true"></i>
      <span class="chatbot-badge" aria-hidden="true"></span>
    `;

    // — Chat window —
    const win = document.createElement('div');
    win.className = 'chatbot-window';
    win.id = 'chatbot-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'GEENIX AI Chat');
    win.setAttribute('aria-hidden', 'true');
    win.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-header-avatar" aria-hidden="true">
          <i class="fas fa-robot"></i>
        </div>
        <div class="chatbot-header-info">
          <div class="chatbot-header-title">GEENIX AI Assistant</div>
          <div class="chatbot-header-status">
            <span class="chatbot-status-dot"></span>
            <span>Online — Ready to help</span>
          </div>
        </div>
        <button class="chatbot-header-close" type="button" aria-label="Close chat" title="Close chat">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="chatbot-messages" id="chatbot-messages" aria-live="polite" aria-relevant="additions">
      </div>
      <div class="chatbot-input-wrap">
        <textarea
          class="chatbot-input"
          id="chatbot-input"
          placeholder="Ask about our services…"
          rows="1"
          maxlength="1000"
          aria-label="Type your message"
        ></textarea>
        <button class="chatbot-send" id="chatbot-send" type="button" aria-label="Send message" disabled>
          <i class="fas fa-paper-plane" aria-hidden="true"></i>
        </button>
      </div>
      <div class="chatbot-footer">
        Powered by <span>GEENIX AI</span> × Google Gemini
      </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(win);

    // — Cache elements —
    elements = {
      trigger,
      window: win,
      messages: win.querySelector('#chatbot-messages'),
      input: win.querySelector('#chatbot-input'),
      sendBtn: win.querySelector('#chatbot-send'),
      closeBtn: win.querySelector('.chatbot-header-close')
    };

    // — Welcome message —
    addBotMessage(
      `Hey there! 👋 I'm the <strong>GEENIX AI Assistant</strong>. I can help you with information about our web development services, design ideas, or anything digital. What would you like to know?`,
      true
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     EVENTS
     ══════════════════════════════════════════════════════════════════ */
  function attachEvents() {
    // Toggle chat
    elements.trigger.addEventListener('click', toggleChat);
    elements.closeBtn.addEventListener('click', closeChat);

    // Send message
    elements.sendBtn.addEventListener('click', handleSend);
    elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Enable/disable send button based on input
    elements.input.addEventListener('input', () => {
      const hasText = elements.input.value.trim().length > 0;
      elements.sendBtn.disabled = !hasText || isLoading;
      autoResizeInput();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    });

    // Close when clicking outside the chat window (but not on the trigger)
    document.addEventListener('click', (e) => {
      if (isOpen && !elements.window.contains(e.target) && !elements.trigger.contains(e.target)) {
        closeChat();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     TOGGLE / OPEN / CLOSE
     ══════════════════════════════════════════════════════════════════ */
  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  function openChat() {
    isOpen = true;
    elements.trigger.classList.add('active');
    elements.trigger.setAttribute('aria-label', 'Close AI chat assistant');
    elements.window.classList.add('open');
    elements.window.setAttribute('aria-hidden', 'false');
    // Focus the input
    setTimeout(() => elements.input.focus(), 350);
    scrollToBottom();
  }

  function closeChat() {
    isOpen = false;
    elements.trigger.classList.remove('active');
    elements.trigger.setAttribute('aria-label', 'Open AI chat assistant');
    elements.window.classList.remove('open');
    elements.window.setAttribute('aria-hidden', 'true');
    elements.trigger.focus();
  }

  /* ══════════════════════════════════════════════════════════════════
     SEND MESSAGE
     ══════════════════════════════════════════════════════════════════ */
  function handleSend() {
    const text = elements.input.value.trim();
    if (!text || isLoading) return;

    // Add user message to UI
    addUserMessage(text);
    elements.input.value = '';
    elements.sendBtn.disabled = true;
    autoResizeInput();

    // Call Gemini
    sendToGemini(text);
  }

  /* ══════════════════════════════════════════════════════════════════
     GEMINI API
     ══════════════════════════════════════════════════════════════════ */
  async function sendToGemini(userMessage) {
    isLoading = true;
    elements.sendBtn.disabled = true;

    // Add to conversation history
    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    // Trim history if too long
    if (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    }

    // Show typing indicator
    const typingEl = showTypingIndicator();

    try {
      const response = await fetch(`${GEMINI_URL}?key=${_k()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 512
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      });

      // Remove typing indicator
      removeTypingIndicator(typingEl);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const botText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (botText) {
        conversationHistory.push({ role: 'model', parts: [{ text: botText }] });
        addBotMessage(renderMarkdown(botText));
      } else {
        addBotMessage("I'm sorry, I couldn't generate a response. Please try again or <a href='#contact'>contact us directly</a>.");
      }
    } catch (err) {
      removeTypingIndicator(typingEl);
      console.error('GEENIX Chatbot Error:', err);
      addBotMessage("Oops! Something went wrong. Please try again, or reach out to us directly at <a href='mailto:hello@geenix.live'>hello@geenix.live</a>.");
    } finally {
      isLoading = false;
      elements.sendBtn.disabled = elements.input.value.trim().length === 0;
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     MESSAGE RENDERING
     ══════════════════════════════════════════════════════════════════ */
  function addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'cb-msg cb-msg-user';
    msg.innerHTML = `
      <div class="cb-msg-avatar"><i class="fas fa-user" aria-hidden="true"></i></div>
      <div class="cb-msg-bubble">${escapeHtml(text)}</div>
    `;
    elements.messages.appendChild(msg);
    scrollToBottom();
  }

  function addBotMessage(html, showQuickActions = false) {
    const msg = document.createElement('div');
    msg.className = 'cb-msg cb-msg-bot';

    let quickActionsHtml = '';
    if (showQuickActions) {
      quickActionsHtml = `
        <div class="cb-quick-actions">
          <button class="cb-quick-btn" type="button">What services do you offer?</button>
          <button class="cb-quick-btn" type="button">Show me your portfolio</button>
          <button class="cb-quick-btn" type="button">How does your process work?</button>
          <button class="cb-quick-btn" type="button">Get a free quote</button>
        </div>
      `;
    }

    msg.innerHTML = `
      <div class="cb-msg-avatar"><i class="fas fa-robot" aria-hidden="true"></i></div>
      <div class="cb-msg-bubble">${html}${quickActionsHtml}</div>
    `;

    elements.messages.appendChild(msg);
    scrollToBottom();

    // Attach quick-action listeners if present
    if (showQuickActions) {
      msg.querySelectorAll('.cb-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const q = btn.textContent;
          elements.input.value = q;
          handleSend();
          // Remove all quick action sections
          msg.querySelectorAll('.cb-quick-actions').forEach(el => el.remove());
        });
      });
    }
  }

  /* ── Typing Indicator ──────────────────────────────────────────── */
  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'cb-typing';
    typing.id = 'cb-typing-indicator';
    typing.innerHTML = `
      <div class="cb-msg-avatar" style="background:var(--ice-dim);border:1px solid var(--bdr2);color:var(--ice);">
        <i class="fas fa-robot" aria-hidden="true"></i>
      </div>
      <div class="cb-typing-dots" aria-label="GEENIX AI is typing">
        <span class="cb-typing-dot"></span>
        <span class="cb-typing-dot"></span>
        <span class="cb-typing-dot"></span>
      </div>
    `;
    elements.messages.appendChild(typing);
    scrollToBottom();
    return typing;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════════════════ */

  /** Scroll messages area to bottom smoothly */
  function scrollToBottom() {
    requestAnimationFrame(() => {
      elements.messages.scrollTo({
        top: elements.messages.scrollHeight,
        behavior: 'smooth'
      });
    });
  }

  /** Auto-resize textarea to content */
  function autoResizeInput() {
    const el = elements.input;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  /** Escape HTML to prevent XSS in user messages */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** Simple markdown-to-HTML renderer for bot messages */
  function renderMarkdown(text) {
    return text
      // Code blocks (fenced) — must come before inline code
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered list items
      .replace(/^[\s]*[-*]\s+(.+)$/gm, '<li>$1</li>')
      // Wrap consecutive <li>s in <ul>
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      // Clean up nested <ul> tags
      .replace(/<\/ul>\s*<ul>/g, '')
      // Line breaks (double newline → paragraph, single → <br>)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Wrap in paragraph if not already
      .replace(/^(?!<[pu])/i, '<p>')
      .replace(/(?<![>])$/i, '</p>')
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, '');
  }

  /* ══════════════════════════════════════════════════════════════════
     BOOTSTRAP
     ══════════════════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
