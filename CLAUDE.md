# HTML Tools Development Guide

This repo contains single-file HTML tools hosted on GitHub Pages. Use this guide when creating new tools.

## Architecture

**Single-file design**: Each tool is one `.html` file with inline CSS and JavaScript. No build steps, no frameworks, no npm.

**Why this matters**: Tools can be copy-pasted directly from LLM responses, edited easily, and deployed instantly.

## Creating a New Tool

### Prompt Template

When asking an LLM to create a tool, include:

```
Build an HTML tool that [description].
Requirements:
- Single HTML file with inline CSS and JavaScript
- No React or frameworks - vanilla JavaScript only
- Load external libraries from CDN (jsDelivr or cdnjs)
- Mobile-friendly responsive design
```

### File Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tool Name</title>
  <style>
    /* CSS here */
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h1>Tool Name</h1>
  <!-- UI here -->

  <script>
    // JavaScript here
  </script>
</body>
</html>
```

## Common Patterns

### API Key Storage (localStorage)

For tools that need API keys (Anthropic, OpenAI, etc.):

```javascript
function getApiKey(keyName) {
  let key = localStorage.getItem(keyName)
  if (!key) {
    key = prompt(`Enter your ${keyName}:`)
    if (key) localStorage.setItem(keyName, key)
  }
  return key
}

function clearApiKey(keyName) {
  localStorage.removeItem(keyName)
}
```

### Anthropic API (Direct Browser Access)

```javascript
async function callClaude(prompt, model = 'claude-sonnet-4-20250514') {
  const apiKey = getApiKey('ANTHROPIC_API_KEY')
  if (!apiKey) return null

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'API request failed')
  }

  const data = await response.json()
  return data.content[0].text
}
```

### OpenAI API

```javascript
async function callOpenAI(prompt, model = 'gpt-4o') {
  const apiKey = getApiKey('OPENAI_API_KEY')
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  return data.choices[0].message.content
}
```

### Loading Libraries from CDN

```html
<!-- jsDelivr (npm packages) -->
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>

<!-- cdnjs -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js"></script>

<!-- ES modules -->
<script type="module">
  import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.module.mjs'
</script>
```

### Auto-Save with localStorage

```javascript
const textarea = document.getElementById('input')

// Restore on load
const saved = localStorage.getItem('tool-name-input')
if (saved) textarea.value = saved

// Save on change
textarea.addEventListener('input', () => {
  localStorage.setItem('tool-name-input', textarea.value)
})
```

### URL State (Shareable Links)

```javascript
// Read from URL
const params = new URLSearchParams(window.location.search)
const value = params.get('q') || 'default'

// Update URL without reload
function updateURL(key, value) {
  const url = new URL(window.location)
  url.searchParams.set(key, value)
  history.replaceState(null, '', url)
}
```

### File Input Handling

```javascript
function handleFiles(files) {
  for (const file of files) {
    const reader = new FileReader()
    reader.onload = (e) => processContent(e.target.result)
    reader.readAsText(file) // or readAsDataURL for images
  }
}

// Drag and drop
element.addEventListener('dragover', (e) => {
  e.preventDefault()
  element.classList.add('dragover')
})

element.addEventListener('drop', (e) => {
  e.preventDefault()
  element.classList.remove('dragover')
  handleFiles(e.dataTransfer.files)
})
```

### Clipboard Operations

```javascript
// Copy to clipboard
async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}

// Paste from clipboard
async function pasteFromClipboard() {
  return await navigator.clipboard.readText()
}
```

### Status Feedback

```javascript
function showStatus(message, type = 'info') {
  const status = document.getElementById('status')
  status.textContent = message
  status.className = `status ${type}` // info, success, error
  status.style.display = 'block'
}
```

## TypeScript Tools (Build Required)

For complex tools that benefit from TypeScript (type safety, complex state), use the hybrid approach:

### Structure

```
src/
└── tool-name/
    ├── tool-name.html    # Entry point (name determines output filename)
    ├── main.ts           # App logic
    ├── types.ts          # Type definitions
    └── styles.css        # Styles (inlined at build)
```

### Development

```bash
# Install dependencies (first time only)
npm install

# Dev server with hot reload
npm run dev

# Build to single-file HTML in repo root
npm run build
```

### Output

The build produces a single `.html` file in the repo root with all JS/CSS inlined - same as manually-written tools, but with TypeScript benefits during development.

### When to Use TypeScript

Use TypeScript for tools with:
- Complex JSON parsing (API responses, file formats)
- Multiple interacting components
- State management
- Type-safe API calls

Stick with vanilla JS for simple tools - faster to create, easier for LLMs to generate.

## CORS-Friendly APIs

These APIs work directly from the browser:

- **GitHub API**: `https://api.github.com/` (rate limited without auth)
- **Anthropic**: Requires `anthropic-dangerous-direct-browser-access` header
- **OpenAI**: Works with API key in Authorization header
- **JSONPlaceholder**: `https://jsonplaceholder.typicode.com/`
- **Public APIs list**: `https://api.publicapis.org/`

## Testing

No Playwright setup. Test tools by:
1. Opening in browser and manually verifying
2. Using Claude in Chrome plugin for automated checks
3. HTML snapshot comparisons for regression testing

## Deployment

Tools auto-deploy via GitHub Pages when pushed to main branch.

Live URL pattern: `https://<username>.github.io/tools/<tool-name>.html`

## Naming Conventions

- Use kebab-case: `my-cool-tool.html`
- Be descriptive: `json-to-yaml.html`, `image-resizer.html`
- Keep names short but clear
