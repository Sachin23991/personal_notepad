/**
 * NoteFlow AI Integration
 * Rewritten from scratch for robustness and reliability.
 */
(function (global) {
  'use strict';

  const DEFAULT_MODEL = 'openai/gpt-4o-mini';

  // --- Utility Functions ---

  function extractJsonFromMarkdown(text) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) return match[1].trim();
    // Fallback: look for the first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return null;
  }

  function generateId() {
    return 'id-' + Math.random().toString(36).substring(2, 10);
  }

  const VALID_TYPES = new Set(['text', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'todo', 'quote', 'callout', 'code', 'divider', 'toc', 'image', 'table']);

  function sanitizeBlocks(blocks) {
    if (!Array.isArray(blocks)) return [];
    return blocks.map(b => {
      if (!b || typeof b !== 'object') return null;
      let type = String(b.type || 'text').toLowerCase();
      if (!VALID_TYPES.has(type)) type = 'text';
      
      const properties = b.properties && typeof b.properties === 'object' ? { ...b.properties } : {};
      
      // Enforce defaults based on type
      if (type === 'todo' && typeof properties.checked !== 'boolean') properties.checked = false;
      if (type === 'callout' && !properties.emoji) properties.emoji = '💡';
      if (type === 'code' && !properties.lang) properties.lang = 'javascript';
      if (type === 'table' && !Array.isArray(properties.data)) {
        properties.data = [['', '', ''], ['', '', ''], ['', '', '']];
      }

      return {
        id: (typeof b.id === 'string' && b.id) ? b.id : generateId(),
        type: type,
        content: (b.content == null) ? '' : String(b.content),
        properties: properties
      };
    }).filter(Boolean);
  }

  // --- Main NoteFlowAI Object ---

  const NoteFlowAI = {
    ctx: null,
    chatHistory: [],
    apiKey: '',
    model: DEFAULT_MODEL,

    init(context) {
      this.ctx = context;
      this.loadConfig();
      this.bindUI();
      
      // Initial greeting
      this.chatHistory = [
        { role: 'assistant', content: "Hello! I am NoteFlow AI. I can read and edit this page. How can I help you today?" }
      ];
      this.renderHistory();
      console.log('NoteFlow AI Initialized');
    },

    loadConfig() {
      const wConfig = global.__NOTEFLOW_CONFIG__ || {};
      const sSettings = this.ctx?.state?.data?.settings?.ai || {};

      this.model = wConfig.OPENROUTER_MODEL || sSettings.openrouterModel || global.localStorage.getItem('noteflow_openrouter_model') || DEFAULT_MODEL;
      this.systemPrompt = wConfig.NOTEFLOW_AI_SYSTEM_PROMPT || sSettings.systemPrompt || global.localStorage.getItem('noteflow_ai_system') || '';
    },

    bindUI() {
      const fab = document.getElementById('ai-panel-btn');
      const panel = document.getElementById('ai-panel');
      const closeBtn = document.getElementById('ai-panel-close');
      const runBtn = document.getElementById('ai-run-btn');
      const inputEl = document.getElementById('ai-instruction');
      const presets = document.querySelectorAll('.ai-preset');

      if (fab && panel) {
        fab.addEventListener('click', (e) => {
          e.preventDefault();
          panel.classList.toggle('hidden');
          if (!panel.classList.contains('hidden') && inputEl) {
            setTimeout(() => inputEl.focus(), 50);
            this.scrollToBottom();
          }
        });
      }

      if (closeBtn && panel) {
        closeBtn.addEventListener('click', () => panel.classList.add('hidden'));
      }

      if (runBtn) {
        runBtn.addEventListener('click', () => this.handleSend());
      }

      if (inputEl) {
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
          }
        });
        
        // Auto-resize
        inputEl.addEventListener('input', () => {
          inputEl.style.height = 'auto';
          inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
        });
      }

      presets.forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.getAttribute('data-preset');
          if (text && inputEl) {
            inputEl.value = text;
            inputEl.style.height = 'auto';
            this.handleSend();
          }
        });
      });
    },

    renderHistory() {
      const container = document.getElementById('ai-messages');
      if (!container) return;
      container.innerHTML = '';
      this.chatHistory.forEach(msg => {
        if (msg.role === 'system') return; // Don't show system prompt
        this.addMessageToUI(msg.role, msg.content);
      });
    },

    addMessageToUI(role, content) {
      const container = document.getElementById('ai-messages');
      if (!container) return;

      const div = document.createElement('div');
      div.className = `ai-msg ai-msg-${role === 'assistant' ? 'bot' : 'user'}`;

      // Logo image path
      const logoImg = 'ChatGPT Image May 11, 2026, 11_56_55 PM.png';

      // Clean up the content - fix the weird pattern where each char has empty tags like <b></b>i<b></b>n
      let cleaned = content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r');

      // Fix pattern: <tag></tag>character - remove empty tags between characters
      // This handles patterns like <b></b>i<n></n>t...
      cleaned = cleaned.replace(/<\w+><\/\w+>/g, '');

      // Convert newlines to <br>
      cleaned = cleaned.replace(/\n/g, '<br>');

      // Add avatar for bot messages, no avatar for user
      if (role === 'assistant') {
        div.innerHTML = `<img src="${logoImg}" alt="" class="ai-msg-avatar"><div class="ai-msg-content">${cleaned}</div>`;
      } else {
        div.innerHTML = `<div class="ai-msg-content">${cleaned}</div>`;
      }
      container.appendChild(div);
      this.scrollToBottom();
    },

    scrollToBottom() {
      const container = document.getElementById('ai-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },

    setStatus(text) {
      const statusEl = document.getElementById('ai-status');
      if (statusEl) {
        statusEl.textContent = text;
      }
    },

    async handleSend() {
      const inputEl = document.getElementById('ai-instruction');
      if (!inputEl) return;
      
      const text = inputEl.value.trim();
      if (!text) return;

      // 1. Add user message to UI and history
      inputEl.value = '';
      inputEl.style.height = 'auto';
      this.addMessageToUI('user', text);
      this.chatHistory.push({ role: 'user', content: text });
      
      this.setStatus('Thinking...');

      try {
        // 2. Call API
        const response = await this.callAI();
        
        // 3. Process Response
        this.processAIResponse(response);

      } catch (error) {
        console.error("AI Error:", error);
        this.addMessageToUI('assistant', 'Error: ' + error.message);
        this.ctx?.app?.showToast?.(error.message);
      } finally {
        this.setStatus('');
      }
    },

    getSystemPrompt() {
      // Use custom system prompt from config if available
      if (this.systemPrompt) {
        return this.systemPrompt + `\n\nIMPORTANT: When responding, use plain text - never wrap each character in HTML tags like <b></b>. When asked to write/create/add content to the page, ALWAYS include a JSON block in this format:\n\`\`\`json\n{"title": "Title", "blocks": [{"id": "auto", "type": "h1", "content": "Heading", "properties": {}}, {"id": "auto", "type": "text", "content": "Paragraph", "properties": {}}, {"id": "auto", "type": "bullet", "content": "List item", "properties": {}}]}\n\`\`\``;
      }

      return `You are NoteFlow AI, a powerful writing assistant. Your MAIN JOB is to WRITE content directly into the notepad page when asked.

IMPORTANT RULES:
1. When user asks to "write", "create", "add", "explain about" anything - IMMEDIATELY write it to the page in proper format with headings, paragraphs, lists, code blocks.
2. Write COMPLETE and DETAILED content - never limit. Include ALL commands with full explanations and examples.
3. Use proper block types: 'h1' for main headings, 'h2' for subheadings, 'text' for paragraphs, 'bullet' for bullet lists, 'numbered' for numbered lists, 'code' for code blocks.
4. First give brief chat response, THEN include JSON block to write to page.

JSON Format:
\`\`\`json
{
  "title": "Page Title",
  "blocks": [
    {"id": "auto", "type": "h1", "content": "Main Heading", "properties": {}},
    {"id": "auto", "type": "text", "content": "Paragraph with <b>bold</b> text", "properties": {}},
    {"id": "auto", "type": "bullet", "content": "List item with explanation", "properties": {}},
    {"id": "auto", "type": "code", "content": "command here", "properties": {"lang": "bash"}}
  ]
}
\`\`\`

5. Write detailed comments for each item - don't just list, explain everything
6. Use plain text in chat - never wrap characters in HTML tags like <b></b>
7. Be thorough - no limits on content length`;
    },

    async callAI() {
      this.loadConfig(); // Ensure latest config

      const page = this.ctx?.state?.activePage;
      let pageContextText = "No page currently active.";
      if (page) {
        pageContextText = `CURRENT PAGE CONTENT:
Title: ${page.title || 'Untitled'}
Blocks JSON:
${JSON.stringify(page.blocks.map(b => ({ id: b.id, type: b.type, content: b.content, properties: b.properties })), null, 2)}`;
      }

      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'system', content: pageContextText },
        // Send the last few messages for context
        ...this.chatHistory.slice(-10) 
      ];

      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.3,
          max_tokens: 16000,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      
      if (!text) throw new Error("Empty response from AI");
      return text;
    },

    processAIResponse(fullText) {
      // 1. Extract JSON if it exists
      const jsonStr = extractJsonFromMarkdown(fullText);
      let conversationalText = fullText;

      // 2. Apply page changes if JSON is valid
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          const page = this.ctx?.state?.activePage;
          
          if (page) {
            // Push history before change
            if (global.NoteFlowEnhancements) global.NoteFlowEnhancements.pushBeforeChange();

            // Update title
            if (typeof parsed.title === 'string') {
              page.title = parsed.title;
            }
            
            // Update blocks
            if (Array.isArray(parsed.blocks)) {
              const cleanBlocks = sanitizeBlocks(parsed.blocks);
              if (cleanBlocks.length > 0) {
                page.blocks = cleanBlocks;
              }
            }

            page.lastModified = Date.now();
            this.ctx.state.save();
            this.ctx.app.renderPage();
            this.ctx.app.renderSidebar();
            
            // Strip the JSON block from the text shown to the user
            conversationalText = fullText.replace(/```(?:json)?\s*[\s\S]*?```/i, '').trim();
            if (!conversationalText) {
              conversationalText = "I have updated the page as requested.";
            }
          }
        } catch (e) {
          console.error("Failed to parse AI JSON:", e);
          // If JSON parsing fails, we just show the whole message to the user.
        }
      }

      // 3. Update UI and history
      this.addMessageToUI('assistant', conversationalText);
      this.chatHistory.push({ role: 'assistant', content: conversationalText });
    }
  };

  // Expose globally
  global.NoteFlowAI = NoteFlowAI;

})(typeof window !== 'undefined' ? window : globalThis);
