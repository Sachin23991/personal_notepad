/**
 * NoteFlow AI Menu
 * Handles the "Turn Into" block menu and routes AI requests to the main chatbox.
 */
(function (global) {
  'use strict';

  const AIMenu = {
    ctx: null,

    init(context) {
      this.ctx = context;
    },

    /**
     * Show "Turn Into" submenu for a specific block
     */
    showTurnIntoMenu(block, trigger) {
      if (!block) return;
      
      const menu = document.getElementById('turninto-menu') || this.createTurnIntoMenu();
      
      // Update disabled states
      const typeItems = menu.querySelectorAll('.turninto-type');
      typeItems.forEach(item => {
        const newType = item.getAttribute('data-type');
        item.classList.toggle('disabled', newType === block.type);
        item.onclick = () => {
          this.convertBlockType(block.id, newType);
          menu.classList.add('hidden');
        };
      });

      // Position
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';
      }
      
      // Store current block ID for AI improve action
      menu.setAttribute('data-block-id', block.id);
      menu.classList.remove('hidden');
    },

    createTurnIntoMenu() {
      const menu = document.createElement('div');
      menu.id = 'turninto-menu';
      menu.className = 'turninto-menu hidden';
      menu.innerHTML = `
        <div class="turninto-header">Turn into…</div>
        <div class="turninto-group">
          <div class="turninto-label">Basic</div>
          <div class="turninto-type" data-type="text"><span class="ti-icon">T</span>Text</div>
          <div class="turninto-type" data-type="h1"><span class="ti-icon">H1</span>Heading 1</div>
          <div class="turninto-type" data-type="h2"><span class="ti-icon">H2</span>Heading 2</div>
          <div class="turninto-type" data-type="h3"><span class="ti-icon">H3</span>Heading 3</div>
          <div class="turninto-type" data-type="bullet"><span class="ti-icon">•</span>Bullet List</div>
          <div class="turninto-type" data-type="numbered"><span class="ti-icon">1.</span>Numbered List</div>
          <div class="turninto-type" data-type="todo"><span class="ti-icon">☑</span>To-do</div>
          <div class="turninto-type" data-type="quote"><span class="ti-icon">"</span>Quote</div>
        </div>
        <div class="turninto-group">
          <div class="turninto-label">Advanced</div>
          <div class="turninto-type" data-type="callout"><span class="ti-icon">💡</span>Callout</div>
          <div class="turninto-type" data-type="code"><span class="ti-icon">&lt;/></span>Code Block</div>
          <div class="turninto-type" data-type="divider"><span class="ti-icon">—</span>Divider</div>
          <div class="turninto-type" data-type="table"><span class="ti-icon">▦</span>Table</div>
        </div>
        <div class="turninto-sep"></div>
        <div class="turninto-ai" id="turninto-ai-improve"><span class="ti-icon">✨</span>AI Improve Block…</div>
      `;
      document.body.appendChild(menu);

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !e.target.closest('[data-action="type"]')) {
          menu.classList.add('hidden');
        }
      });

      // Bind AI improve
      const aiBtn = menu.querySelector('#turninto-ai-improve');
      if (aiBtn) {
        aiBtn.addEventListener('click', () => {
          const blockId = menu.getAttribute('data-block-id');
          this.showAIImproveDialog(blockId);
          menu.classList.add('hidden');
        });
      }

      return menu;
    },

    async convertBlockType(blockId, newType) {
      const page = this.ctx?.state?.activePage;
      if (!page) return;

      const block = page.blocks.find(b => b.id === blockId);
      if (!block) return;

      if (global.HistoryManager) {
        global.HistoryManager.push(`page-${page.id}`, page.blocks, `Turn into ${newType}`);
      }

      block.type = newType;

      // Defaults
      if (newType === 'todo' && !('checked' in (block.properties || {}))) {
        if (!block.properties) block.properties = {};
        block.properties.checked = false;
      }
      if (newType === 'callout' && !(block.properties?.emoji)) {
        if (!block.properties) block.properties = {};
        block.properties.emoji = '💡';
      }
      if (newType === 'code' && !(block.properties?.lang)) {
        if (!block.properties) block.properties = {};
        block.properties.lang = 'javascript';
      }
      if (newType === 'table' && !(block.properties?.data)) {
        if (!block.properties) block.properties = {};
        block.properties.data = [['', '', ''], ['', '', ''], ['', '', '']];
      }

      page.lastModified = Date.now();
      this.ctx?.state?.save();
      this.ctx?.app?.renderPage();
      this.ctx?.app?.showToast(`Converted to ${newType}`);
    },

    showAIImproveDialog(blockId) {
      const page = this.ctx?.state?.activePage;
      if (!page) return;

      const block = page.blocks.find(b => b.id === blockId);
      if (!block) return;

      const panel = document.getElementById('ai-panel');
      const inputEl = document.getElementById('ai-instruction');
      
      if (panel && inputEl) {
        panel.classList.remove('hidden');
        inputEl.value = `Improve the grammar and clarity of the ${block.type} block starting with "${block.content.substring(0, 20)}..."`;
        setTimeout(() => inputEl.focus(), 50);
        
        if (global.NoteFlowAI) {
          global.NoteFlowAI.scrollToBottom();
        }
      }
    }
  };

  global.AIMenu = AIMenu;

})(typeof window !== 'undefined' ? window : globalThis);