/**
 * NoteFlow History Manager — Undo/Redo for all state changes
 * Tracks: sidebar collapse, page blocks, settings, etc.
 */
(function (global) {
  'use strict';

  const MAX_HISTORY_SIZE = 50;

  const HistoryManager = {
    stacks: {},
    listeners: [],

    init(state) {
      this.state = state;
      if (!state.data.historyStacks) state.data.historyStacks = {};
      this.stacks = state.data.historyStacks;
    },

    /**
     * Create or get a history stack for a specific scope (page, settings, sidebar, etc.)
     */
    getStack(scope = 'global') {
      if (!this.stacks[scope]) {
        this.stacks[scope] = { past: [], future: [], current: null };
      }
      return this.stacks[scope];
    },

    /**
     * Push a state snapshot to history
     * @param {string} scope - History scope (e.g., 'global', 'sidebar', 'page-{id}')
     * @param {any} snapshot - State snapshot to save
     * @param {string} label - Description of the action
     */
    push(scope, snapshot, label) {
      const stack = this.getStack(scope);
      
      // If there's a future stack, clear it when a new action occurs
      if (stack.future.length > 0) {
        stack.future = [];
      }

      // Add current state to past
      if (stack.current !== null) {
        stack.past.push({ snapshot: stack.current, label });
        // Limit history size
        if (stack.past.length > MAX_HISTORY_SIZE) {
          stack.past.shift();
        }
      }

      stack.current = JSON.parse(JSON.stringify(snapshot));
      this.state.save();
      this.notifyListeners('push', scope, label);
    },

    /**
     * Undo last action in a scope
     */
    undo(scope = 'global') {
      const stack = this.getStack(scope);
      if (stack.past.length === 0) return null;

      // Move current to future
      if (stack.current !== null) {
        stack.future.unshift({ snapshot: stack.current, label: 'Redo' });
      }

      // Pop from past
      const { snapshot, label } = stack.past.pop();
      stack.current = JSON.parse(JSON.stringify(snapshot));
      this.state.save();
      this.notifyListeners('undo', scope, label);
      return snapshot;
    },

    /**
     * Redo last undone action in a scope
     */
    redo(scope = 'global') {
      const stack = this.getStack(scope);
      if (stack.future.length === 0) return null;

      // Move current to past
      if (stack.current !== null) {
        stack.past.push({ snapshot: stack.current, label: 'Undo' });
      }

      // Pop from future
      const { snapshot, label } = stack.future.shift();
      stack.current = JSON.parse(JSON.stringify(snapshot));
      this.state.save();
      this.notifyListeners('redo', scope, label);
      return snapshot;
    },

    /**
     * Can undo?
     */
    canUndo(scope = 'global') {
      const stack = this.getStack(scope);
      return stack.past.length > 0;
    },

    /**
     * Can redo?
     */
    canRedo(scope = 'global') {
      const stack = this.getStack(scope);
      return stack.future.length > 0;
    },

    /**
     * Get undo label (what will be undone)
     */
    getUndoLabel(scope = 'global') {
      const stack = this.getStack(scope);
      return stack.past.length > 0 ? stack.past[stack.past.length - 1].label : null;
    },

    /**
     * Get redo label (what will be redone)
     */
    getRedoLabel(scope = 'global') {
      const stack = this.getStack(scope);
      return stack.future.length > 0 ? stack.future[0].label : null;
    },

    /**
     * Clear history for a scope
     */
    clear(scope = 'global') {
      const stack = this.getStack(scope);
      stack.past = [];
      stack.future = [];
      stack.current = null;
    },

    /**
     * Listen for history changes
     */
    onChange(callback) {
      this.listeners.push(callback);
    },

    notifyListeners(action, scope, label) {
      this.listeners.forEach(cb => cb({ action, scope, label }));
    },
  };

  global.HistoryManager = HistoryManager;
})(typeof window !== 'undefined' ? window : globalThis);
