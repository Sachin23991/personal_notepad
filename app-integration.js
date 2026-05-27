/**
 * NoteFlow Main App Module — Core app logic with History integration
 * Handles: sidebar toggle with undo/redo, undo/redo shortcuts, etc.
 */
(function (global) {
  'use strict';

  const AppIntegration = {
    state: null,
    editor: null,
    app: null,

    init(ctx) {
      this.state = ctx.state;
      this.editor = ctx.editor;
      this.app = ctx.app;

      // Initialize History Manager
      if (global.HistoryManager) {
        global.HistoryManager.init(this.state);
      }

      // Initialize AI Menu
      if (global.AIMenu) {
        global.AIMenu.init({ state: this.state, editor: this.editor, app: this.app });
      }

      // Enhance sidebar toggle with history
      this.enhanceSidebarToggle();

      // Enhance block menu with AI options
      this.enhanceBlockMenu();

      // Status bar info
      this.updateStatusBar();
    },

    /**
     * Bind Ctrl+Alt+Z (Undo) and Ctrl+Alt+Y (Redo)
     */
    bindUndoRedoShortcuts() {
      // Keyboard bindings are centralized in index.html (keyboardShortcuts).
    },

    /**
     * Undo page change
     */
    undoPageChange() {
      const page = this.state?.activePage;
      if (!page) return;

      if (!global.HistoryManager?.canUndo(`page-${page.id}`)) {
        this.app?.showToast?.('Nothing to undo');
        return;
      }

      const snapshot = global.HistoryManager.undo(`page-${page.id}`);
      if (snapshot) {
        page.blocks = snapshot;
        this.state.save();
        this.app?.renderPage?.();
        const label = global.HistoryManager?.getUndoLabel?.(`page-${page.id}`);
        this.app?.showToast?.(`Undid: ${label || 'change'}`);
      }
    },

    /**
     * Redo page change
     */
    redoPageChange() {
      const page = this.state?.activePage;
      if (!page) return;

      if (!global.HistoryManager?.canRedo(`page-${page.id}`)) {
        this.app?.showToast?.('Nothing to redo');
        return;
      }

      const snapshot = global.HistoryManager.redo(`page-${page.id}`);
      if (snapshot) {
        page.blocks = snapshot;
        this.state.save();
        this.app?.renderPage?.();
        const label = global.HistoryManager?.getRedoLabel?.(`page-${page.id}`);
        this.app?.showToast?.(`Redid: ${label || 'change'}`);
      }
    },

    /**
     * Enhance sidebar toggle to support undo/redo
     */
    enhanceSidebarToggle() {
      const toggleBtn = document.getElementById('toggle-sidebar');
      const sidebar = document.getElementById('sidebar');
      const floatBtn = document.getElementById('sidebar-float-btn');
      const openBtn = document.getElementById('sidebar-open-btn');

      const handleToggle = () => {
        if (!sidebar) return;

        // Push to history before toggle
        if (global.HistoryManager) {
          const isCollapsed = sidebar.classList.contains('collapsed');
          global.HistoryManager.push(
            'global',
            { sidebarCollapsed: isCollapsed },
            isCollapsed ? 'Show sidebar' : 'Hide sidebar'
          );
        }

        sidebar.classList.toggle('collapsed');
        this.state.data.settings.sidebarCollapsed = sidebar.classList.contains('collapsed');
        this.state.save();
        this.app?.showToast?.(sidebar.classList.contains('collapsed') ? 'Sidebar hidden' : 'Sidebar shown');
      };

      toggleBtn?.addEventListener('click', handleToggle);
      floatBtn?.addEventListener('click', () => {
        sidebar?.classList.remove('collapsed');
        this.state.data.settings.sidebarCollapsed = false;
        this.state.save();
      });
      openBtn?.addEventListener('click', () => {
        sidebar?.classList.remove('collapsed');
        this.state.data.settings.sidebarCollapsed = false;
        this.state.save();
      });
    },

    /**
     * Enhance block menu with AI options
     */
    enhanceBlockMenu() {
      const blockMenu = document.getElementById('block-menu');
      if (!blockMenu) return;

      // Bind "Turn into" option
      const turnIntoItem = blockMenu.querySelector('[data-action="type"]');
      if (turnIntoItem) {
        turnIntoItem.addEventListener('click', (e) => {
          e.stopPropagation();
          const blockId = blockMenu.getAttribute('data-block-id');
          if (blockId && global.AIMenu) {
            global.AIMenu.showTurnIntoMenu(
              this.state?.activePage?.blocks?.find(b => b.id === blockId),
              turnIntoItem
            );
          }
        });
      }

      // Bind AI improve option
      const aiBlockItem = blockMenu.querySelector('[data-action="ai-block"]');
      if (aiBlockItem) {
        aiBlockItem.addEventListener('click', (e) => {
          e.stopPropagation();
          const blockId = blockMenu.getAttribute('data-block-id');
          if (blockId && global.AIMenu) {
            global.AIMenu.showAIImproveDialog(blockId);
          }
          blockMenu.classList.remove('visible');
        });
      }
    },

    /**
     * Update status bar with undo/redo info
     */
    updateStatusBar() {
      // Can be called periodically to show undo/redo availability
      const page = this.state?.activePage;
      if (!page || !global.HistoryManager) return;

      const canUndo = global.HistoryManager.canUndo(`page-${page.id}`);
      const canRedo = global.HistoryManager.canRedo(`page-${page.id}`);
      const undoLabel = global.HistoryManager.getUndoLabel(`page-${page.id}`);
      const redoLabel = global.HistoryManager.getRedoLabel(`page-${page.id}`);

      let statusText = '';
      if (canUndo && undoLabel) statusText += `[Undo: ${undoLabel}]`;
      if (canRedo && redoLabel) statusText += ` [Redo: ${redoLabel}]`;

      if (statusText) {
        const statusBar = document.getElementById('status-bar');
        if (statusBar) {
          statusBar.textContent = statusText + ' — Ctrl+Alt+Z/Y';
        }
      }
    },
  };

  global.AppIntegration = AppIntegration;
})(typeof window !== 'undefined' ? window : globalThis);
