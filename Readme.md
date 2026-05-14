# NoteFlow — AI-Powered Personal Workspace

NoteFlow is a browser-based personal notepad/workspace application with AI integration. It combines traditional note-taking features with AI capabilities for content generation, transformation, and improvement.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [UML Diagram](#uml-diagram)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Features](#features)
7. [Data Structures](#data-structures)
8. [API Endpoints](#api-endpoints)
9. [Configuration](#configuration)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Project Structure](#project-structure)

---

## Overview

NoteFlow is a single-page web application that provides:

- **Page-based note organization** — Create, organize, and manage multiple pages with titles, content blocks, tags, covers, and icons
- **Rich block editor** — Support for 14+ block types (text, headings, lists, code, tables, etc.)
- **AI Integration** — OpenRouter-powered AI chat and content transformation
- **Undo/Redo System** — Full history tracking for all changes
- **Sidebar Navigation** — Collapsible sidebar with favorites, all pages, and trash
- **Theme Support** — Light and dark themes
- **Export Features** — PDF export and plain text export

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────────────┐  │
│  │  index.html │    │  styles.css │    │  JavaScript Modules   │  │
│  │  (UI Shell) │    │  (Styling)  │    │  (Functionality)     │  │
│  └─────────────┘    └─────────────┘    └───────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    JavaScript Modules                         │  │
│  ├───────────────┬───────────────┬───────────────┬──────────────┤  │
│  │ NoteFlowAI    │ AIMenu        │ HistoryManager│ AppIntegration│ │
│  │ (AI Chat)     │ (Block Trans) │ (Undo/Redo)  │ (Shortcuts)  │  │
│  ├───────────────┴───────────────┴───────────────┴──────────────┤  │
│  │ editor-enhancements.js │ code-tools.js   │ dictionary.js     │  │
│  │ (Find/Replace)         │ (Syntax)        │ (Spellcheck)      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 State Management (window.state)              │  │
│  │  - pages[]  - settings{}  - historyStacks{}  - activePage    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST /api/chat
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VERCEL (Serverless)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  api/chat.js (Serverless Function)                          │   │
│  │  - Receives request                                         │   │
│  │  - Attaches OPENROUTER_API_KEY from env                     │   │
│  │  - Forwards to openrouter.ai                                │   │
│  │  - Returns response to client                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Environment Variables:                                            │
│  - OPENROUTER_API_KEY (required)                                   │
│  - OPENROUTER_MODEL (default: openai/gpt-4o-mini)                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenRouter.ai (External)                       │
│              (Gateway to OpenAI, Anthropic, etc.)                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## UML Diagram

### 1. Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            NoteFlow Application                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐                                                │
│  │    index.html       │                                                │
│  │  (Main UI Shell)   │                                                │
│  └──────────┬──────────┘                                                │
│             │                                                            │
│  ┌──────────▼──────────┐         ┌──────────────┐                      │
│  │    AppIntegration   │◄───────►│  State       │                      │
│  │  (Main Controller)  │         │  Management  │                      │
│  │  - init(ctx)        │         │  - pages[]   │                      │
│  │  - bindShortcuts()  │         │  - settings  │                      │
│  │  - updateStatusBar()│         │  - history   │                      │
│  └──────────┬──────────┘         └──────────────┘                      │
│             │                                                            │
│    ┌────────┼────────┐                                                    │
│    │        │        │                                                    │
│    ▼        ▼        ▼                                                    │
│ ┌─────┐  ┌─────┐  ┌─────┐                                                │
│ │ AI  │  │Hist │  │Edit │                                                │
│ │Menu │  │Mgr  │  │Enh  │                                                │
│ └─────┘  └─────┘  └─────┘                                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2. Class/Module Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          JavaScript Modules                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐         ┌──────────────────────┐               │
│  │     NoteFlowAI       │         │      AIMenu          │               │
│  ├──────────────────────┤         ├──────────────────────┤               │
│  │ - chatHistory: []    │         │ - ctx: object        │               │
│  │ - model: string     │         │ + init(ctx)          │               │
│  │ - apiKey: string    │         │ + showTurnIntoMenu() │               │
│  ├──────────────────────┤         │ + convertBlockType() │               │
│  │ + init(context)      │         │ + showAIImproveDialog│               │
│  │ + handleSend()      │         └───────────┬──────────┘               │
│  │ + callAI()          │                     │                          │
│  │ + processAIResponse │                     │                          │
│  └─────────┬───────────┘                     │                          │
│            │                                 │                          │
│            │       ┌─────────────────────────┴────────────────────┐     │
│            │       │              HistoryManager                  │     │
│            │       ├──────────────────────────────────────────────┤     │
│            └──────►│ - stacks: {}                                  │     │
│                    │ + init(state)                                │     │
│                    │ + push(scope, snapshot, label)              │     │
│                    │ + undo(scope) ──────────────────────────►   │     │
│                    │ + redo(scope)                                │     │
│                    │ + canUndo(scope), canRedo(scope)            │     │
│                    └──────────────────────────────────────────────┘     │
│                                                                             │
│  ┌───────────────────────────┐  ┌───────────────────────────────────┐    │
│  │   editor-enhancements.js  │  │         code-tools.js             │    │
│  ├───────────────────────────┤  ├───────────────────────────────────┤    │
│  │ + init(ctx)               │  │ + guessLanguage(code)             │    │
│  │ + initFindReplace()       │  │ + formatCode(code, lang)          │    │
│  │ + capturePage()          │  │ + highlightCode(el, lang)         │    │
│  │ + applySnapshot()        │  └───────────────────────────────────┘    │
│  │ + pushBeforeChange()     │                                           │
│  └───────────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────►│   Editor    │────►│   State     │────►│   Render    │
│   Input     │     │   Handler   │     │   Update    │     │   Update    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   ▼
                           │           ┌───────────────┐
                           │           │   History     │
                           │           │   Manager     │
                           │           │   (Undo/Redo) │
                           │           └───────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    NoteFlowAI │
                    │   (AI Chat)   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
                    │ /api/chat    │────►│  OpenRouter  │────►│   AI Model  │
                    │  (Vercel)    │     │     API      │     │  (GPT-4o)   │
                    └──────────────┘     └──────────────┘     └─────────────┘
```

### 4. Page/Block Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Page Data Flow                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Action (edit, add block, etc.)                                       │
│          │                                                                  │
│          ▼                                                                  │
│   ┌────────────────────────────────────────────────────────────────┐        │
│   │  editor-enhancements.js: pushBeforeChange()                   │        │
│   │  - Captures current page state                                 │        │
│   │  - Pushes to HistoryManager                                   │        │
│   └────────────────────────────────────────────────────────────────┘        │
│          │                                                                  │
│          ▼                                                                  │
│   ┌────────────────────────────────────────────────────────────────┐        │
│   │  state.save()                                                  │        │
│   │  - Updates window.state.activePage                            │        │
│   │  - Persists to localStorage                                   │        │
│   └────────────────────────────────────────────────────────────────┘        │
│          │                                                                  │
│          ▼                                                                  │
│   ┌────────────────────────────────────────────────────────────────┐        │
│   │  app.renderPage()                                             │        │
│   │  - Renders blocks in editor                                    │        │
│   │  - Updates sidebar                                             │        │
│   │  - Updates breadcrumbs                                         │        │
│   └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. index.html
The main UI shell containing all HTML structure:
- Sidebar with navigation
- Main content area with page header and editor
- Toolbar and menus (inline toolbar, slash menu, block menu, AI panel)
- Toast notifications and status bar

### 2. styles.css
Complete styling for:
- Light and dark themes
- Sidebar layout and animations
- Block editor styling
- AI panel and menus
- Responsive design

### 3. JavaScript Modules

| Module | Purpose |
|--------|---------|
| **app-integration.js** | Main controller - initializes all systems, binds shortcuts, manages sidebar |
| **ai-menu.js** | "Turn Into" menu for block type conversion and AI improvements |
| **history-manager.js** | Undo/redo system with per-page stacks |
| **ai.js** | OpenRouter AI integration for chat and page content generation |
| **editor-enhancements.js** | Find/replace, status bar, page undo/redo |
| **code-tools.js** | Code language detection and syntax highlighting |
| **dictionary.js** | Spellcheck dictionary management |

---

## Data Flow

### 1. User Creates/Edits Page
```
User clicks "New Page" or edits existing page
         │
         ▼
AppIntegration.enhanceBlockMenu() captures action
         │
         ▼
HistoryManager.push() saves snapshot
         │
         ▼
State.activePage updated
         │
         ▼
state.save() persists to localStorage
         │
         ▼
app.renderPage() updates UI
```

### 2. AI Chat Flow
```
User enters message in AI panel
         │
         ▼
NoteFlowAI.handleSend() triggered
         │
         ▼
NoteFlowAI.callAI() sends to /api/chat
         │
         ▼
api/chat.js adds OPENROUTER_API_KEY
         │
         ▼
OpenRouter.ai processes request
         │
         ▼
Response returned to NoteFlowAI
         │
         ▼
NoteFlowAI.processAIResponse() parses JSON
         │
         ▼
Page blocks updated if JSON present
         │
         ▼
Chat message displayed
```

### 3. Undo/Redo Flow
```
User presses Ctrl+Alt+Z
         │
         ▼
AppIntegration.bindUndoRedoShortcuts() catches event
         │
         ▼
AppIntegration.undoPageChange() called
         │
         ▼
HistoryManager.undo(`page-${page.id}`) returns snapshot
         │
         ▼
Page.blocks restored from snapshot
         │
         ▼
state.save() and app.renderPage() update UI
         │
         ▼
Toast shows "Undid: [action label]"
```

---

## Features

### Page Management
- ✅ Create new pages
- ✅ Rename pages (editable title)
- ✅ Delete pages (move to trash)
- ✅ Favorite pages
- ✅ Page covers (image backgrounds)
- ✅ Page icons (emoji)
- ✅ Page tags
- ✅ Word count and reading time

### Block Types (14 types)
| Type | Description |
|------|-------------|
| `text` | Plain text paragraph |
| `h1`, `h2`, `h3` | Headings (3 levels) |
| `bullet` | Bullet list |
| `numbered` | Numbered list |
| `todo` | Checklist with checkboxes |
| `quote` | Blockquote |
| `callout` | Highlighted note with emoji |
| `code` | Code block with syntax highlighting |
| `divider` | Horizontal line |
| `table` | 3-column table |
| `toc` | Auto-generated table of contents |
| `image` | Image with URL |

### AI Features
- **Chat with AI** — Ask questions, get help
- **Write to Page** — AI generates content in JSON format
- **Block Transformation** — Turn any block into another type
- **AI Improve Block** — Grammar and clarity improvements
- **Preset Transformations**: Fix Grammar, Summarize, Tighten, Expand, Formalize, Simplify, Format as List

### Editor Features
- **Inline Toolbar** — Bold, italic, underline, strikethrough, code, highlight, link
- **Slash Menu** — Type `/` to insert blocks
- **Block Menu** — Right-click for options (Turn into, Duplicate, Copy link)
- **Find & Replace** — Search within page
- **Drag & Drop** — Reorder blocks

### Undo/Redo
- ✅ Per-page undo/redo stack (50 actions max)
- ✅ Global sidebar toggle undo
- ✅ Block conversion undo
- ✅ Keyboard shortcuts: `Ctrl+Alt+Z` (undo), `Ctrl+Alt+Y` (redo)

### Export & Settings
- ✅ PDF Export
- ✅ Plain text export
- ✅ Theme toggle (light/dark)
- ✅ AI settings (API key, model, system prompt)
- ✅ Font scale adjustment

---

## Data Structures

### Page Object
```javascript
{
  id: "page-id-abc123",
  title: "My Page Title",
  icon: "📄",
  cover: "url-to-image" | null,
  tags: ["tag1", "tag2"],
  blocks: [
    {
      id: "block-id-xyz",
      type: "text" | "h1" | "h2" | "bullet" | "todo" | ...,
      content: "Block content text",
      properties: {
        // Type-specific properties
        checked: true | false,        // for todo
        emoji: "💡",                  // for callout
        lang: "javascript",           // for code
        data: [['','',''],...]        // for table
      }
    }
  ],
  created: 1699999999999,
  lastModified: 1700000000000,
  favorite: true | false,
  archived: false
}
```

### State Object
```javascript
{
  data: {
    pages: [...],              // All pages
    trashPages: [...],         // Deleted pages
    settings: {
      sidebarCollapsed: false,
      theme: "white" | "dark",
      ai: {
        openrouterModel: "openai/gpt-4o-mini",
        systemPrompt: "You are NoteFlow AI..."
      },
      editor: {
        fontScale: 100,
        lineHeight: "normal",
        monoPage: false
      }
    },
    historyStacks: {
      "global": { past: [], future: [], current: {} },
      "page-{id}": { past: [], future: [], current: {} }
    },
    dictionary: ["custom", "words"]
  },
  activePage: pageObject | null
}
```

### History Stack
```javascript
{
  past: [
    { snapshot: {...blocks...}, label: "Turn into h1" },
    { snapshot: {...blocks...}, label: "Add block" }
  ],
  future: [
    { snapshot: {...blocks...}, label: "Redo" }
  ],
  current: {...current blocks...}
}
```

---

## API Endpoints

### POST /api/chat
Chat completion endpoint powered by OpenRouter.

**Request:**
```javascript
{
  model: "openai/gpt-4o-mini",
  messages: [
    { role: "system", content: "You are NoteFlow AI..." },
    { role: "user", content: "Hello" }
  ],
  temperature: 0.3,
  max_tokens: 16000
}
```

**Response:**
```javascript
{
  choices: [
    {
      message: {
        content: "AI response text..."
      }
    }
  ]
}
```

**Environment Variables Required:**
- `OPENROUTER_API_KEY` — Your OpenRouter API key

---

## Configuration

### Environment Variables (for Vercel)
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx...
OPENROUTER_MODEL=openai/gpt-4o-mini
NOTEFLOW_AI_SYSTEM_PROMPT=You are NoteFlow AI...
```

### Local Development
1. Copy `env.example` to `.env`
2. Add your `OPENROUTER_API_KEY`
3. Or paste API key in NoteFlow Settings → AI

### In-App Settings
- **Theme** — Toggle light/dark mode
- **AI Model** — Select OpenRouter model
- **System Prompt** — Customize AI behavior
- **Font Scale** — Adjust editor font size

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+Z` | Undo last change |
| `Ctrl+Alt+Y` | Redo last undone |
| `Cmd+P` | Open search |
| `Shift+Cmd+F` | Find in page |
| `Cmd+/` | Command palette |
| `/` (in editor) | Open slash menu |

---

## Project Structure

```
noteflow/
├── index.html              # Main HTML (UI shell)
├── styles.css             # All CSS styles
│
├── JavaScript Modules
├── ai.js                  # AI chat integration (OpenRouter)
├── ai-menu.js             # Block transformation menu
├── app-integration.js     # Main controller & shortcuts
├── code-tools.js          # Syntax highlighting
├── dictionary.js           # Spellcheck dictionary
├── editor-enhancements.js  # Find/replace, page undo/redo
├── history-manager.js     # Undo/redo system
│
├── API
├── api/
│   └── chat.js            # Serverless chat endpoint
│
├── Configuration
├── env.example            # Environment template
├── vercel.json            # Vercel config
│
├── Assets
├── sw.js                  # Service worker (PWA)
├── manifest.json          # PWA manifest
└── ChatGPT Image May 11, 2026, 11_56_55 PM.png  # Logo image
```

---

## Deployment

NoteFlow is deployed on Vercel:

1. **Connect repository** to Vercel
2. **Set environment variable** `OPENROUTER_API_KEY`
3. **Deploy** — Vercel handles build and serverless functions
4. **URL**: `https://personal-notepad-beryl.vercel.app` (example)

---

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari

Requires localStorage for data persistence.

---

## License

MIT License — Feel free to use and modify.

---
Made By Sachin Rao Mandhiya 
---
*Generated for NoteFlow v1.0*