
    const state = {
      open: false,
      loading: false,
      sessionId: null,
      history: [],
    };

    const bubble   = document.getElementById('chat-bubble');
    const window_  = document.getElementById('chat-window');
    const messages = document.getElementById('messages');
    const input    = document.getElementById('chat-input');
    const sendBtn  = document.getElementById('send-btn');
    const notifDot = document.getElementById('notif-dot');

    bubble.addEventListener('click', () => {
      state.open = !state.open;
      bubble.classList.toggle('open', state.open);
      window_.classList.toggle('visible', state.open);

      if (state.open) {
        notifDot.style.display = 'none';
        if (messages.children.length === 0) {
          setTimeout(() => {
            addMessage('bot', `Â¡Hola! ðŸ‘‹ Soy tu asistente de compras.

Puedo ayudarte a:
â€¢ Buscar productos por nombre, color o talla
â€¢ Agregar cosas a tu carrito ðŸ›’
â€¢ Ver y editar tu carrito

Â¿QuÃ© estÃ¡s buscando hoy?`);
          }, 350);
        }
        setTimeout(() => input.focus(), 400);
      }
    });

    async function sendMessage() {
      const text = input.value.trim();
      if (!text || state.loading) return;

      input.value = '';
      autoResize();
      addMessage('user', text);

      state.loading = true;
      sendBtn.disabled = true;
      const typingEl = showTyping();

      try {
        const body = {
          message: text,
          session_id: state.sessionId,
          history: state.history.slice(-10),
        };

        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        typingEl.remove();

        if (data.session_id) state.sessionId = data.session_id;

        if (data.reply) {
          addMessage('bot', data.reply);
          state.history.push(
            { role: 'user', content: text },
            { role: 'assistant', content: data.reply }
          );
        } else if (data.error) {
          addMessage('bot', 'âš ï¸ ' + (data.error || 'OcurriÃ³ un error. Intenta de nuevo.'));
        }
      } catch (err) {
        typingEl.remove();
        addMessage('bot', 'âš ï¸ No pude conectarme. Verifica tu conexiÃ³n e intenta de nuevo.');
        console.error('Chat error:', err);
      } finally {
        state.loading = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    function addMessage(role, text) {
      const isUser = role === 'user';
      const wrapper = document.createElement('div');
      wrapper.className = 'msg ' + (isUser ? 'user' : 'bot');

      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = isUser ? 'ðŸ‘¤' : 'ðŸ¤–';

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = text;

      wrapper.appendChild(avatar);
      wrapper.appendChild(bubble);
      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
      const wrapper = document.createElement('div');
      wrapper.className = 'typing-indicator';

      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = 'ðŸ¤–';

      const bubble = document.createElement('div');
      bubble.className = 'typing-bubble';
      bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

      wrapper.appendChild(avatar);
      wrapper.appendChild(bubble);
      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;

      return wrapper;
    }

    function autoResize() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    }

    input.addEventListener('input', autoResize);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);

    setTimeout(() => {
      if (!state.open) notifDot.style.display = 'block';
    }, 2000);
  
