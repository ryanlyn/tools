import './styles.css'
import type { ClaudeExport, ChatMessage, ParsedMessage } from './types'

// DOM elements
const dropZone = document.getElementById('drop-zone') as HTMLDivElement
const fileInput = document.getElementById('file-input') as HTMLInputElement
const pasteBtn = document.getElementById('paste-btn') as HTMLButtonElement
const usernameInput = document.getElementById('username') as HTMLInputElement
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const preview = document.getElementById('preview') as HTMLDivElement
const stats = document.getElementById('stats') as HTMLDivElement
const status = document.getElementById('status') as HTMLDivElement

// State
let parsedMessages: ParsedMessage[] = []

// LocalStorage keys
const USERNAME_KEY = 'claude-chat-analyzer-username'

// Initialize
function init() {
  const savedUsername = localStorage.getItem(USERNAME_KEY)
  if (savedUsername) {
    usernameInput.value = savedUsername
  }

  usernameInput.addEventListener('input', () => {
    localStorage.setItem(USERNAME_KEY, usernameInput.value)
    if (parsedMessages.length > 0) {
      renderPreview()
    }
  })

  dropZone.addEventListener('click', () => fileInput.click())

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragover')
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover')
  })

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragover')
    const files = e.dataTransfer?.files
    if (files?.length) {
      handleFile(files[0])
    }
  })

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      handleFile(fileInput.files[0])
    }
  })

  pasteBtn.addEventListener('click', pasteFromClipboard)
  copyBtn.addEventListener('click', copyAsMarkdown)
  clearBtn.addEventListener('click', clearAll)
}

async function handleFile(file: File) {
  const text = await file.text()
  processInput(text)
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      showStatus('Clipboard is empty', 'error')
      return
    }
    processInput(text)
  } catch {
    showStatus('Failed to read clipboard', 'error')
  }
}

function processInput(text: string) {
  const trimmed = text.trim()

  // Try JSON first (Claude.ai web export)
  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed) as ClaudeExport

      if (data.chat_messages && Array.isArray(data.chat_messages)) {
        parsedMessages = parseJsonMessages(data.chat_messages)
        renderPreview()
        renderStats(data)

        copyBtn.disabled = false
        clearBtn.disabled = false
        showStatus(`Loaded ${parsedMessages.length} messages from JSON`, 'success')
        return
      }
    } catch {
      // Not valid JSON, try markdown
    }
  }

  // Try Markdown (Claude Code /export)
  parsedMessages = parseMarkdown(trimmed)

  if (parsedMessages.length === 0) {
    showStatus('Could not parse input. Paste Claude Code /export output or Claude.ai JSON export.', 'error')
    return
  }

  renderPreview()
  renderStatsFromMessages()

  copyBtn.disabled = false
  clearBtn.disabled = false
  showStatus(`Loaded ${parsedMessages.length} messages from markdown`, 'success')
}

function parseMarkdown(text: string): ParsedMessage[] {
  const result: ParsedMessage[] = []
  const lines = text.split('\n')

  // Pattern 1: Claude Code /export format
  // Human messages: "> message"
  // Assistant messages: "⏺ message"
  // Tool results: "⎿ result" (part of assistant)
  let currentRole: 'human' | 'assistant' | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    // Human message starts with "> " (but not ">>" which is nested quotes)
    if (line.match(/^> [^>]/)) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        const cleanContent = cleanMarkdownContent(currentContent.join('\n'))
        if (cleanContent) {
          result.push({ sender: currentRole, text: cleanContent, timestamp: '' })
        }
      }
      currentRole = 'human'
      currentContent = [line.slice(2)] // Remove "> " prefix
    }
    // Assistant message starts with "⏺ "
    else if (line.startsWith('⏺ ') || line === '⏺') {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        const cleanContent = cleanMarkdownContent(currentContent.join('\n'))
        if (cleanContent) {
          result.push({ sender: currentRole, text: cleanContent, timestamp: '' })
        }
      }
      currentRole = 'assistant'
      currentContent = [line.slice(2)] // Remove "⏺ " prefix
    }
    // Tool result lines (⎿) are part of assistant context - skip them
    else if (line.startsWith('  ⎿')) {
      // Skip tool results - they're internal
      continue
    }
    // Continuation of current message
    else if (currentRole) {
      // Skip header/decoration lines
      if (line.match(/^[╭╰│├┼╮╯─]+/) || line.match(/^\s*\*\s*[▐▛▜▝█▘]+/)) {
        continue
      }
      currentContent.push(line)
    }
  }

  // Save last message
  if (currentRole && currentContent.length > 0) {
    const cleanContent = cleanMarkdownContent(currentContent.join('\n'))
    if (cleanContent) {
      result.push({ sender: currentRole, text: cleanContent, timestamp: '' })
    }
  }

  if (result.length > 0) return result

  // Pattern 2: "### Human" / "### Assistant" or "## Human" headers
  let headerPattern = /^#{2,3}\s+(Human|Assistant|User)\s*$/gim
  let parts = text.split(headerPattern)

  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i += 2) {
      const role = parts[i]?.toLowerCase()
      const content = parts[i + 1]?.trim()
      if (!content) continue
      const cleanContent = cleanMarkdownContent(content)
      if (cleanContent) {
        result.push({
          sender: (role === 'human' || role === 'user') ? 'human' : 'assistant',
          text: cleanContent,
          timestamp: ''
        })
      }
    }
    if (result.length > 0) return result
  }

  // Pattern 3: "> **Human**:" / "> **Assistant**:" quote format
  currentRole = null
  currentContent = []

  for (const line of lines) {
    const match = line.match(/^>\s*\*\*(Human|Assistant|User|Claude)\*\*:\s*(.*)/i)
    if (match) {
      // Save previous message
      if (currentRole && currentContent.length > 0) {
        const cleanContent = cleanMarkdownContent(currentContent.join('\n'))
        if (cleanContent) {
          result.push({ sender: currentRole, text: cleanContent, timestamp: '' })
        }
      }
      // Start new message
      const role = match[1].toLowerCase()
      currentRole = (role === 'human' || role === 'user') ? 'human' : 'assistant'
      currentContent = match[2] ? [match[2]] : []
    } else if (currentRole) {
      // Continue current message (strip leading > if present)
      const content = line.replace(/^>\s?/, '')
      currentContent.push(content)
    }
  }

  // Save last message
  if (currentRole && currentContent.length > 0) {
    const cleanContent = cleanMarkdownContent(currentContent.join('\n'))
    if (cleanContent) {
      result.push({ sender: currentRole, text: cleanContent, timestamp: '' })
    }
  }

  if (result.length > 0) return result

  // Pattern 4: Simple "Human:" / "Assistant:" on own line
  const simplePattern = /^(Human|Assistant|User|Claude):\s*$/gim
  parts = text.split(simplePattern)

  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i += 2) {
      const role = parts[i]?.toLowerCase()
      const content = parts[i + 1]?.trim()
      if (!content) continue
      const cleanContent = cleanMarkdownContent(content)
      if (cleanContent) {
        result.push({
          sender: (role === 'human' || role === 'user') ? 'human' : 'assistant',
          text: cleanContent,
          timestamp: ''
        })
      }
    }
  }

  return result
}

function cleanMarkdownContent(text: string): string {
  let cleaned = text

  // Remove function_calls blocks (XML-style tags)
  cleaned = cleaned.replace(/<function_calls>[\s\S]*?<\/function_calls>/g, '')

  // Remove function_results blocks
  cleaned = cleaned.replace(/<function_results>[\s\S]*?<\/function_results>/g, '')

  // Remove antml blocks
  cleaned = cleaned.replace(/<[\s\S]*?<\/antml:[^>]+>/g, '')

  // Remove tool use code blocks
  cleaned = cleaned.replace(/```tool_use[\s\S]*?```/g, '')
  cleaned = cleaned.replace(/```tool_result[\s\S]*?```/g, '')

  // Remove system-reminder blocks
  cleaned = cleaned.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')

  // Remove Claude Code tool calls (lines that are just tool invocations)
  // Patterns like: Search(...), Bash(...), Read(...), Write(...), filesystem - ...(MCP)
  const toolPatterns = [
    /^(Search|Bash|Read|Write|Update|Fetch|Edit|Glob|Grep|Task|TodoWrite|WebFetch|WebSearch|LSP|NotebookEdit)\(.*\)$/gm,
    /^filesystem - \w+ \(MCP\)\(.*\)$/gm,
    /^mcp__\w+__\w+\(.*\)$/gm,
  ]
  for (const pattern of toolPatterns) {
    cleaned = cleaned.replace(pattern, '')
  }

  // Collapse multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

function parseJsonMessages(messages: ChatMessage[]): ParsedMessage[] {
  const result: ParsedMessage[] = []

  for (const msg of messages) {
    const textParts: string[] = []

    for (const block of msg.content) {
      if (block.type === 'text' && block.text) {
        textParts.push(block.text)
      }
    }

    if (msg.text) {
      textParts.push(msg.text)
    }

    const text = textParts.join('\n').trim()

    if (text) {
      result.push({
        sender: msg.sender,
        text,
        timestamp: msg.created_at
      })
    }
  }

  return result
}

function getSenderName(sender: 'human' | 'assistant'): string {
  if (sender === 'human') {
    return usernameInput.value.trim() || 'User'
  }
  return 'Claude'
}

function renderPreview() {
  const html = parsedMessages.map((msg, index) => {
    const name = getSenderName(msg.sender)
    const formattedText = formatMessageText(msg.text)
    return `<blockquote class="${msg.sender}">
      <div class="message-header">
        <strong>${name}:</strong>
        <button class="copy-msg-btn" data-index="${index}" title="Copy this message">📋</button>
      </div>
      <div class="message-content">${formattedText}</div>
    </blockquote>`
  }).join('\n')

  preview.innerHTML = html
  preview.classList.add('visible')

  // Add click handlers for per-message copy buttons
  preview.querySelectorAll('.copy-msg-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt((e.target as HTMLButtonElement).dataset.index || '0')
      const msg = parsedMessages[index]
      const name = getSenderName(msg.sender)
      const markdown = `> **${name}**: ${msg.text}`
      try {
        await navigator.clipboard.writeText(markdown)
        const originalText = (e.target as HTMLButtonElement).textContent
        ;(e.target as HTMLButtonElement).textContent = '✓'
        setTimeout(() => {
          (e.target as HTMLButtonElement).textContent = originalText
        }, 1000)
      } catch {
        // Silently fail
      }
    })
  })
}

function renderStats(data: ClaudeExport) {
  const messageCount = parsedMessages.length
  const created = new Date(data.created_at).toLocaleDateString()
  const updated = new Date(data.updated_at).toLocaleDateString()

  stats.innerHTML = `
    <strong>${messageCount}</strong> messages |
    Created: ${created} |
    Updated: ${updated}
  `
  stats.classList.add('visible')
}

function renderStatsFromMessages() {
  const messageCount = parsedMessages.length
  stats.innerHTML = `<strong>${messageCount}</strong> messages`
  stats.classList.add('visible')
}

async function copyAsMarkdown() {
  const markdown = parsedMessages.map(msg => {
    const name = getSenderName(msg.sender)
    return `> **${name}**: ${msg.text}`
  }).join('\n\n')

  try {
    await navigator.clipboard.writeText(markdown)
    showStatus('Copied to clipboard!', 'success')
  } catch {
    showStatus('Failed to copy to clipboard', 'error')
  }
}

function clearAll() {
  parsedMessages = []
  preview.innerHTML = ''
  preview.classList.remove('visible')
  stats.innerHTML = ''
  stats.classList.remove('visible')
  copyBtn.disabled = true
  clearBtn.disabled = true
  fileInput.value = ''
  hideStatus()
}

function showStatus(message: string, type: 'info' | 'success' | 'error') {
  status.textContent = message
  status.className = `status ${type}`
}

function hideStatus() {
  status.className = 'status'
  status.textContent = ''
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatMessageText(text: string): string {
  // Split into code blocks and regular text
  const parts: string[] = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index)
      parts.push(escapeHtml(beforeText).replace(/\n/g, '<br>'))
    }
    // Add code block with preserved formatting
    const lang = match[1] || ''
    const code = escapeHtml(match[2])
    parts.push(`<pre><code class="lang-${lang}">${code}</code></pre>`)
    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last code block
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)).replace(/\n/g, '<br>'))
  }

  return parts.join('')
}

init()
