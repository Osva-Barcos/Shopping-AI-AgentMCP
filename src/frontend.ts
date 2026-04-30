/**
 * Frontend HTML — Laburen AI Chat
 *
 * Página minimalista con un widget de chat flotante en la esquina
 * inferior izquierda. Se comunica con el endpoint POST /chat.
 *
 * Exportado como string para ser servido directamente desde el Worker
 * sin necesidad de assets estáticos separados.
 */

export const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laburen — Asistente de Compras</title>
  <meta name="description" content="Habla con Lau, tu asistente de compras personal de Laburen. Encuentra ropa, gestiona tu carrito y compra fácilmente." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* ── Reset & Base ─────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0a0f;
      --surface: #13131a;
      --surface2: #1c1c28;
      --border: rgba(255,255,255,0.07);
      --accent: #7c5cfc;
      --accent-light: #9d82ff;
      --accent-dim: rgba(124,92,252,0.15);
      --text: #f0eeff;
      --text-dim: #8882a8;
      --user-bg: linear-gradient(135deg, #7c5cfc, #5e42d4);
      --bot-bg: #1c1c28;
      --radius: 20px;
      --radius-sm: 12px;
      --shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
      --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    html, body {
      height: 100%;
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
    }

    /* ── Background ───────────────────────────────── */
    .bg-canvas {
      position: fixed;
      inset: 0;
      z-index: 0;
      background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,92,252,0.12), transparent),
                  radial-gradient(ellipse 50% 40% at 100% 80%, rgba(94,66,212,0.08), transparent),
                  var(--bg);
    }

    /* Subtle grid lines */
    .bg-canvas::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
    }

    /* ── Center branding ──────────────────────────── */
    .center-brand {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 1;
      pointer-events: none;
      user-select: none;
    }

    .center-brand .logo-ring {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--accent-dim);
      border: 1px solid rgba(124,92,252,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }

    .center-brand h1 {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text);
      line-height: 1.1;
    }

    .center-brand h1 span {
      background: linear-gradient(135deg, var(--accent-light), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .center-brand p {
      margin-top: 12px;
      font-size: 1rem;
      color: var(--text-dim);
      font-weight: 400;
    }

    .center-brand .hint {
      margin-top: 32px;
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
      font-size: 0.85rem;
      color: var(--text-dim);
      opacity: 0.7;
      animation: float 3s ease-in-out infinite;
    }

    .center-brand .hint-arrow {
      font-size: 1.2rem;
      animation: bounce-left 1.5s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    @keyframes bounce-left {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(-6px); }
    }

    /* ── Chat Widget Bubble (trigger) ─────────────── */
    #chat-bubble {
      position: fixed;
      bottom: 28px;
      left: 28px;
      z-index: 1000;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #5e42d4);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(124,92,252,0.5), 0 0 0 0 rgba(124,92,252,0.4);
      transition: transform var(--transition), box-shadow var(--transition);
      animation: pulse-ring 3s ease-out infinite;
    }

    #chat-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 40px rgba(124,92,252,0.65), 0 0 0 0 rgba(124,92,252,0);
    }

    #chat-bubble:active { transform: scale(0.95); }

    #chat-bubble svg { transition: transform var(--transition), opacity var(--transition); }
    #chat-bubble .icon-close { display: none; }

    #chat-bubble.open .icon-chat { display: none; }
    #chat-bubble.open .icon-close { display: block; }

    @keyframes pulse-ring {
      0% { box-shadow: 0 8px 32px rgba(124,92,252,0.5), 0 0 0 0 rgba(124,92,252,0.4); }
      70% { box-shadow: 0 8px 32px rgba(124,92,252,0.5), 0 0 0 16px rgba(124,92,252,0); }
      100% { box-shadow: 0 8px 32px rgba(124,92,252,0.5), 0 0 0 0 rgba(124,92,252,0); }
    }

    /* Notification dot */
    #chat-bubble .notif-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background: #ff4f6e;
      border-radius: 50%;
      border: 2px solid var(--bg);
      animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* ── Chat Window ──────────────────────────────── */
    #chat-window {
      position: fixed;
      bottom: 100px;
      left: 28px;
      z-index: 999;
      width: 380px;
      max-height: 560px;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;

      /* Animation */
      transform-origin: bottom left;
      transform: scale(0.85) translateY(20px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.25s ease;
    }

    #chat-window.visible {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* ── Chat Header ──────────────────────────────── */
    .chat-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(124,92,252,0.2), rgba(94,66,212,0.1));
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .chat-header .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #5e42d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .chat-header .info { flex: 1; min-width: 0; }

    .chat-header .name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
    }

    .chat-header .status {
      font-size: 0.75rem;
      color: #4ade80;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: #4ade80;
      border-radius: 50%;
      animation: blink 2s ease-in-out infinite;
    }

    /* ── Messages Area ────────────────────────────── */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    #messages::-webkit-scrollbar { width: 4px; }
    #messages::-webkit-scrollbar-track { background: transparent; }
    #messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    /* ── Message Bubbles ──────────────────────────── */
    .msg {
      display: flex;
      gap: 8px;
      animation: msg-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes msg-in {
      from { opacity: 0; transform: translateY(10px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .msg.user { flex-direction: row-reverse; }

    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--surface2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .msg.user .msg-avatar {
      background: linear-gradient(135deg, var(--accent), #5e42d4);
    }

    .msg-bubble {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 0.875rem;
      line-height: 1.5;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .msg.bot .msg-bubble {
      background: var(--bot-bg);
      border: 1px solid var(--border);
      border-bottom-left-radius: 6px;
      color: var(--text);
    }

    .msg.user .msg-bubble {
      background: var(--user-bg);
      border-bottom-right-radius: 6px;
      color: #fff;
    }

    /* ── Typing Indicator ─────────────────────────── */
    .typing-indicator {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .typing-bubble {
      background: var(--bot-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      border-bottom-left-radius: 6px;
      padding: 12px 16px;
      display: flex;
      gap: 5px;
      align-items: center;
    }

    .typing-dot {
      width: 7px;
      height: 7px;
      background: var(--text-dim);
      border-radius: 50%;
      animation: typing 1.4s ease-in-out infinite;
    }

    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Input Area ───────────────────────────────── */
    .chat-input-area {
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      gap: 10px;
      align-items: flex-end;
      flex-shrink: 0;
    }

    #chat-input {
      flex: 1;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-family: inherit;
      font-size: 0.875rem;
      color: var(--text);
      resize: none;
      outline: none;
      max-height: 100px;
      min-height: 40px;
      line-height: 1.5;
      transition: border-color var(--transition), box-shadow var(--transition);
    }

    #chat-input::placeholder { color: var(--text-dim); }

    #chat-input:focus {
      border-color: rgba(124,92,252,0.5);
      box-shadow: 0 0 0 3px rgba(124,92,252,0.1);
    }

    #send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #5e42d4);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--transition), opacity var(--transition);
      flex-shrink: 0;
    }

    #send-btn:hover { transform: scale(1.08); }
    #send-btn:active { transform: scale(0.95); }
    #send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    /* ── Responsive ───────────────────────────────── */
    @media (max-width: 440px) {
      #chat-window {
        left: 16px;
        right: 16px;
        width: auto;
        bottom: 90px;
      }

      #chat-bubble {
        bottom: 20px;
        left: 20px;
      }
    }
  </style>
</head>
<body>
  <!-- Background -->
  <div class="bg-canvas"></div>

  <!-- Center branding -->
  <div class="center-brand">
    <div class="logo-ring">🛍️</div>
    <h1>Laburen<br /><span>AI Shopping</span></h1>
    <p>Tu asistente personal de moda</p>
    <div class="hint">
      <span class="hint-arrow">←</span>
      <span>Abre el chat para comenzar</span>
    </div>
  </div>

  <!-- Chat bubble trigger -->
  <button id="chat-bubble" aria-label="Abrir chat" title="Hablar con Lau">
    <div class="notif-dot" id="notif-dot"></div>
    <!-- Chat icon -->
    <svg class="icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <!-- Close icon -->
    <svg class="icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>

  <!-- Chat window -->
  <div id="chat-window" role="dialog" aria-label="Chat con Lau">
    <!-- Header -->
    <div class="chat-header">
      <div class="avatar">🤖</div>
      <div class="info">
        <div class="name">Lau — Asistente Laburen</div>
        <div class="status">
          <span class="status-dot"></span>
          En línea · Listo para ayudarte
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div id="messages" role="log" aria-live="polite"></div>

    <!-- Input -->
    <div class="chat-input-area">
      <textarea
        id="chat-input"
        placeholder="Escribe un mensaje..."
        rows="1"
        aria-label="Mensaje"
      ></textarea>
      <button id="send-btn" aria-label="Enviar" title="Enviar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>

  <script>
    // ── State ──────────────────────────────────────────
    const state = {
      open: false,
      loading: false,
      sessionId: null,
      history: [],
    };

    // ── Elements ───────────────────────────────────────
    const bubble   = document.getElementById('chat-bubble');
    const window_  = document.getElementById('chat-window');
    const messages = document.getElementById('messages');
    const input    = document.getElementById('chat-input');
    const sendBtn  = document.getElementById('send-btn');
    const notifDot = document.getElementById('notif-dot');

    // ── Toggle chat ────────────────────────────────────
    bubble.addEventListener('click', () => {
      state.open = !state.open;
      bubble.classList.toggle('open', state.open);
      window_.classList.toggle('visible', state.open);

      if (state.open) {
        // Hide notification dot on open
        notifDot.style.display = 'none';

        // Show welcome message on first open
        if (messages.children.length === 0) {
          setTimeout(() => {
            addMessage('bot', '¡Hola! 👋 Soy Lau, tu asistente de compras de Laburen.\\n\\nPuedo ayudarte a:\\n• Buscar productos por nombre, color o talla\\n• Agregar cosas a tu carrito 🛒\\n• Ver y editar tu carrito\\n\\n¿Qué estás buscando hoy?');
          }, 300);
        }

        setTimeout(() => input.focus(), 350);
      }
    });

    // ── Send message ───────────────────────────────────
    async function sendMessage() {
      const text = input.value.trim();
      if (!text || state.loading) return;

      // Clear input & auto-resize
      input.value = '';
      autoResize();

      // Show user message
      addMessage('user', text);

      // Show typing indicator
      state.loading = true;
      sendBtn.disabled = true;
      const typingEl = showTyping();

      try {
        const body = {
          message: text,
          session_id: state.sessionId,
          history: state.history.slice(-10), // Last 10 messages for context
        };

        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        // Save session
        if (data.session_id) {
          state.sessionId = data.session_id;
        }

        // Remove typing indicator
        typingEl.remove();

        if (data.reply) {
          addMessage('bot', data.reply);

          // Update history
          state.history.push(
            { role: 'user', content: text },
            { role: 'assistant', content: data.reply }
          );
        } else if (data.error) {
          addMessage('bot', '⚠️ ' + (data.error || 'Ocurrió un error. Intenta de nuevo.'));
        }
      } catch (err) {
        typingEl.remove();
        addMessage('bot', '⚠️ No pude conectarme. Verifica tu conexión e intenta de nuevo.');
        console.error('Chat error:', err);
      } finally {
        state.loading = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    // ── Add message to DOM ─────────────────────────────
    function addMessage(role, text) {
      const isUser = role === 'user';
      const wrapper = document.createElement('div');
      wrapper.className = 'msg ' + (isUser ? 'user' : 'bot');

      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = isUser ? '👤' : '🤖';

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = text;

      wrapper.appendChild(avatar);
      wrapper.appendChild(bubble);
      messages.appendChild(wrapper);

      // Scroll to bottom
      messages.scrollTop = messages.scrollHeight;
    }

    // ── Typing indicator ───────────────────────────────
    function showTyping() {
      const wrapper = document.createElement('div');
      wrapper.className = 'typing-indicator';

      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = '🤖';

      const bubble = document.createElement('div');
      bubble.className = 'typing-bubble';
      bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

      wrapper.appendChild(avatar);
      wrapper.appendChild(bubble);
      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;

      return wrapper;
    }

    // ── Auto-resize textarea ───────────────────────────
    function autoResize() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    }

    input.addEventListener('input', autoResize);

    // ── Keyboard shortcuts ─────────────────────────────
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);

    // ── Show notif dot with slight delay ───────────────
    setTimeout(() => {
      if (!state.open) {
        notifDot.style.display = 'block';
      }
    }, 1500);
  </script>
</body>
</html>`;
